"use client";

import { useEffect, useState } from "react";

import { useApp } from "@/components/providers/app-provider";
import { PaperButton } from "@/components/ui/paper-primitives";
import { SectionCard } from "@/components/ui/section-card";

const GLOBAL_WINS_LEADERBOARD_ID = "global_wins";
const PLAYER_STATS_COLLECTION = "player_stats";
const PLAYER_STATS_KEY = "stats";

type PlayerStats = {
  bestStreak: number;
  currentStreak: number;
  gamesPlayed: number;
  losses: number;
  wins: number;
};

type LeaderboardEntry = {
  ownerId: string;
  rank: number;
  score: number;
  username: string;
};

function createEmptyStats(): PlayerStats {
  return {
    bestStreak: 0,
    currentStreak: 0,
    gamesPlayed: 0,
    losses: 0,
    wins: 0,
  };
}

function normalizeStats(value: unknown): PlayerStats {
  const parsed =
    typeof value === "string" ? safeJsonParse(value) : (value ?? {});

  if (!parsed || typeof parsed !== "object") {
    return createEmptyStats();
  }

  const stats = parsed as Record<string, unknown>;

  return {
    bestStreak: toSafeNumber(stats.bestStreak),
    currentStreak: toSafeNumber(stats.currentStreak),
    gamesPlayed: toSafeNumber(stats.gamesPlayed),
    losses: toSafeNumber(stats.losses),
    wins: toSafeNumber(stats.wins),
  };
}

function safeJsonParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function toSafeNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function getRankBadge(rank: number, isCurrentUser: boolean) {
  if (isCurrentUser) {
    return "border-[rgba(185,90,66,0.24)] bg-[rgba(248,226,219,0.92)] text-[color:var(--accent)]";
  }

  if (rank === 1) {
    return "border-[rgba(185,90,66,0.24)] bg-[rgba(243,214,203,0.98)] text-[color:var(--accent)]";
  }

  if (rank === 2) {
    return "border-[rgba(95,71,48,0.18)] bg-[rgba(255,250,243,0.92)] text-[color:var(--accent-deep)]";
  }

  if (rank === 3) {
    return "border-[rgba(95,71,48,0.16)] bg-[rgba(255,245,239,0.92)] text-[color:var(--foreground)]";
  }

  return "border-[rgba(95,71,48,0.12)] bg-[rgba(255,250,244,0.88)] text-[color:var(--ink-soft)]";
}

function getDisplayUsername(entry: LeaderboardEntry, userId: string | null) {
  if (entry.ownerId === userId) {
    return "You";
  }

  if (
    entry.username &&
    entry.username !== "Anonymous" &&
    !isRawPlayerId(entry.username)
  ) {
    return entry.username;
  }

  return "Guest";
}

function getDisplayOwnerLabel(entry: LeaderboardEntry, userId: string | null) {
  if (entry.ownerId === userId) {
    return "You";
  }

  if (
    entry.username &&
    entry.username !== "Anonymous" &&
    !isRawPlayerId(entry.username)
  ) {
    return "Registered player";
  }

  return "Guest player";
}

function isRawPlayerId(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export default function LeaderboardPage() {
  const { client, session, status, userId, username, retryConnection } = useApp();
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [leaderboardEntries, setLeaderboardEntries] = useState<LeaderboardEntry[]>(
    []
  );
  const [playerStats, setPlayerStats] = useState<PlayerStats>(createEmptyStats);

  useEffect(() => {
    if (status !== "ready" || !client || !session || !userId) {
      return;
    }

    let cancelled = false;

    async function loadProgressSurfaces() {
      setIsLoading(true);
      setLoadError(null);

      try {
        const nakamaClient = client as typeof client & {
          listLeaderboardRecords: (...args: unknown[]) => Promise<{
            records?: Array<{
              owner_id?: string;
              rank?: string | number;
              score?: string | number;
              username?: string;
            }>;
          }>;
          readStorageObjects: (...args: unknown[]) => Promise<{
            objects?: Array<{
              value?: unknown;
            }>;
          }>;
        };

        const [leaderboardResult, storageResult] = await Promise.allSettled([
          nakamaClient.listLeaderboardRecords(
            session,
            GLOBAL_WINS_LEADERBOARD_ID,
            [],
            10
          ),
          nakamaClient.readStorageObjects(session, {
            object_ids: [
              {
                collection: PLAYER_STATS_COLLECTION,
                key: PLAYER_STATS_KEY,
                user_id: userId,
              },
            ],
          }),
        ]);

        if (cancelled) {
          return;
        }

        const nextEntries =
          leaderboardResult.status === "fulfilled" &&
          Array.isArray(leaderboardResult.value.records)
            ? leaderboardResult.value.records.map((record) => ({
                ownerId: record.owner_id ?? "",
                rank: toSafeNumber(
                  typeof record.rank === "string"
                    ? Number(record.rank)
                    : record.rank
                ),
                score: toSafeNumber(
                  typeof record.score === "string"
                    ? Number(record.score)
                    : record.score
                ),
                username: record.username || "Anonymous",
              }))
            : [];

        const nextStats =
          storageResult.status === "fulfilled"
            ? normalizeStats(storageResult.value.objects?.[0]?.value)
            : createEmptyStats();

        const nextErrors = [
          leaderboardResult.status === "rejected"
            ? "Leaderboard fetch failed."
            : null,
          storageResult.status === "rejected" ? "Player stats fetch failed." : null,
        ].filter(Boolean);

        setLeaderboardEntries(nextEntries);
        setPlayerStats(nextStats);
        setLoadError(nextErrors.length > 0 ? nextErrors.join(" ") : null);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setLoadError(
          error instanceof Error
            ? error.message
            : "Failed to load leaderboard data."
        );
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadProgressSurfaces();

    return () => {
      cancelled = true;
    };
  }, [client, session, status, userId]);

  return (
    <div className="grid gap-6 xl:grid-cols-[0.98fr_1.02fr]">
      <SectionCard className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(185,90,66,0.08),_transparent_28%),radial-gradient(circle_at_bottom_left,_rgba(214,164,93,0.12),_transparent_24%)]" />

        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[color:var(--accent)]">
            Hall of Fame
          </p>
          <h2 className="paper-heading mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-[color:var(--foreground)] sm:text-4xl lg:text-5xl">
            Track your run and see who is leading the arena.
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[color:var(--ink-soft)] sm:text-base">
            This page shows your overall record, your current form, and the players
            climbing fastest through the Hall of Fame.
          </p>

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1.35rem] border border-[rgba(95,71,48,0.14)] bg-[rgba(255,250,244,0.88)] px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--accent)]">
                Wins
              </p>
              <p className="mt-2 text-2xl font-semibold text-[color:var(--foreground)]">
                {playerStats.wins}
              </p>
            </div>
            <div className="rounded-[1.35rem] border border-[rgba(185,90,66,0.14)] bg-[rgba(255,245,239,0.88)] px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--accent-deep)]">
                Losses
              </p>
              <p className="mt-2 text-2xl font-semibold text-[color:var(--foreground)]">
                {playerStats.losses}
              </p>
            </div>
            <div className="rounded-[1.35rem] border border-[rgba(95,71,48,0.14)] bg-[rgba(255,250,244,0.88)] px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--accent)]">
                Games Played
              </p>
              <p className="mt-2 text-2xl font-semibold text-[color:var(--foreground)]">
                {playerStats.gamesPlayed}
              </p>
            </div>
            <div className="rounded-[1.35rem] border border-[rgba(185,90,66,0.14)] bg-[rgba(255,245,239,0.88)] px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--accent-deep)]">
                Current Streak
              </p>
              <p className="mt-2 text-2xl font-semibold text-[color:var(--foreground)]">
                {playerStats.currentStreak}
              </p>
            </div>
            <div className="rounded-[1.35rem] border border-[rgba(95,71,48,0.14)] bg-[rgba(255,250,244,0.88)] px-4 py-4 sm:col-span-2">
              <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--ink-soft)]">
                Best Streak
              </p>
              <p className="mt-2 text-2xl font-semibold text-[color:var(--foreground)]">
                {playerStats.bestStreak}
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-[1.35rem] border border-[rgba(95,71,48,0.14)] bg-[rgba(255,250,244,0.86)] px-4 py-4 text-sm leading-6 text-[color:var(--foreground)]">
            <p>Player: {username ?? "Unknown"}</p>
            <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[color:var(--ink-soft)]">
              Every finished match can move you up the table.
            </p>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <div className="rounded-full border border-[rgba(95,71,48,0.18)] bg-[rgba(255,250,243,0.92)] px-3 py-2 text-xs uppercase tracking-[0.22em] text-[color:var(--accent-deep)]">
              {status}
            </div>
            <div className="rounded-full border border-[rgba(185,90,66,0.18)] bg-[rgba(248,226,219,0.92)] px-3 py-2 text-xs uppercase tracking-[0.22em] text-[color:var(--accent)]">
              {isLoading ? "Refreshing" : "Live"}
            </div>
            {loadError ? (
              <PaperButton
                type="button"
                onClick={retryConnection}
                variant="primary"
                size="sm"
              >
                Retry connection
              </PaperButton>
            ) : null}
          </div>

          {loadError ? (
            <div className="mt-5 rounded-[1.35rem] border border-[rgba(185,90,66,0.28)] bg-[rgba(248,226,219,0.92)] px-4 py-4 text-sm text-[color:var(--accent)]">
              {loadError}
            </div>
          ) : null}
        </div>
      </SectionCard>

      <SectionCard className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(185,90,66,0.06),_transparent_26%),radial-gradient(circle_at_bottom_right,_rgba(214,164,93,0.08),_transparent_24%)]" />

        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[color:var(--accent-deep)]">
            Top Wins
          </p>
          <h2 className="paper-heading mt-3 text-3xl font-semibold tracking-tight text-[color:var(--foreground)] sm:text-4xl">
            The players setting the pace right now.
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[color:var(--ink-soft)] sm:text-base">
            Win matches, build momentum, and keep climbing. The top of the table is
            reserved for the players closing games most consistently.
          </p>

          <div className="mt-6 grid gap-3">
            {leaderboardEntries.length > 0 ? (
              leaderboardEntries.map((entry, index) => {
                const isCurrentUser = entry.ownerId === userId;

                return (
                  <article
                    key={`${entry.ownerId}-${entry.rank}`}
                    className={`rounded-[1.4rem] border px-4 py-4 ${
                      isCurrentUser
                        ? "border-[rgba(185,90,66,0.26)] bg-[rgba(248,226,219,0.92)]"
                        : index % 2 === 0
                          ? "border-[rgba(95,71,48,0.14)] bg-[rgba(255,250,244,0.88)]"
                          : "border-[rgba(95,71,48,0.12)] bg-[rgba(249,240,227,0.92)]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span
                          className={`inline-flex h-10 min-w-10 items-center justify-center rounded-full border px-3 text-sm font-semibold ${getRankBadge(
                            entry.rank,
                            isCurrentUser
                          )}`}
                        >
                          {entry.rank > 0 ? `#${entry.rank}` : "-"}
                        </span>
                        <div>
                          <p className="text-base font-semibold text-[color:var(--foreground)]">
                            {getDisplayUsername(entry, userId)}
                          </p>
                          <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--ink-soft)]">
                            {getDisplayOwnerLabel(entry, userId)}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-lg font-semibold text-[color:var(--foreground)]">
                          {entry.score}
                        </p>
                        <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--ink-soft)]">
                          Wins
                        </p>
                      </div>
                    </div>
                  </article>
                );
              })
          ) : (
              <div className="rounded-[1.35rem] border border-[rgba(95,71,48,0.14)] bg-[rgba(255,250,244,0.86)] px-4 py-4 text-sm leading-6 text-[color:var(--ink-soft)]">
                {isLoading ? "Loading the hall of fame." : "No ranked wins yet."}
              </div>
            )}
          </div>

          <div className="mt-6 rounded-[1.35rem] border border-[rgba(95,71,48,0.14)] bg-[rgba(255,250,244,0.86)] px-4 py-4 text-sm leading-6 text-[color:var(--ink-soft)]">
            {leaderboardEntries.length > 0
              ? "Keep winning to protect your place or break into the next rank."
              : "Play a few games to put your name on the board."}
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
