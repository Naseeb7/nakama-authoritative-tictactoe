"use client";

import { useEffect, useState } from "react";

import { useApp } from "@/components/providers/app-provider";
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
    return "border-cyan-400/35 bg-cyan-400/12 text-cyan-100";
  }

  if (rank === 1) {
    return "border-fuchsia-400/35 bg-fuchsia-500/12 text-fuchsia-100";
  }

  if (rank === 2) {
    return "border-cyan-400/28 bg-cyan-400/10 text-cyan-100";
  }

  if (rank === 3) {
    return "border-slate-500/40 bg-slate-500/12 text-slate-100";
  }

  return "border-white/10 bg-white/6 text-slate-200";
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
      <SectionCard className="relative overflow-hidden bg-[linear-gradient(180deg,_rgba(8,12,28,0.96),_rgba(13,19,43,0.92))] text-slate-50">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(0,183,255,0.16),_transparent_28%),radial-gradient(circle_at_bottom_left,_rgba(255,79,216,0.12),_transparent_24%)]" />

        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-300">
            Hall of Fame
          </p>
          <h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">
            The scoreboard, styled for the latest arena theme.
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
            Wins are written by the backend, then shown here with the current streak,
            best streak, and total games played. This page now matches the newer dark
            cyan/fuchsia visual language used across the app.
          </p>

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1.35rem] border border-cyan-400/18 bg-slate-950/70 px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-300">
                Wins
              </p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {playerStats.wins}
              </p>
            </div>
            <div className="rounded-[1.35rem] border border-fuchsia-400/18 bg-slate-950/70 px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-fuchsia-300">
                Losses
              </p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {playerStats.losses}
              </p>
            </div>
            <div className="rounded-[1.35rem] border border-cyan-400/18 bg-slate-950/70 px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-300">
                Games Played
              </p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {playerStats.gamesPlayed}
              </p>
            </div>
            <div className="rounded-[1.35rem] border border-fuchsia-400/18 bg-slate-950/70 px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-fuchsia-300">
                Current Streak
              </p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {playerStats.currentStreak}
              </p>
            </div>
            <div className="rounded-[1.35rem] border border-white/10 bg-white/5 px-4 py-4 sm:col-span-2">
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">
                Best Streak
              </p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {playerStats.bestStreak}
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-[1.35rem] border border-white/10 bg-white/5 px-4 py-4 text-sm leading-6 text-slate-300">
            <p>Player: {username ?? "Unknown"}</p>
            <p>Profile: {userId ?? "Unavailable"}</p>
            <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">
              Leaderboard ID: {GLOBAL_WINS_LEADERBOARD_ID}
            </p>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <div className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-2 text-xs uppercase tracking-[0.22em] text-cyan-200">
              {status}
            </div>
            <div className="rounded-full border border-fuchsia-400/25 bg-fuchsia-500/10 px-3 py-2 text-xs uppercase tracking-[0.22em] text-fuchsia-200">
              {isLoading ? "Refreshing" : "Live"}
            </div>
            {loadError ? (
              <button
                type="button"
                onClick={retryConnection}
                className="rounded-full border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-100 transition hover:bg-rose-500/16"
              >
                Retry connection
              </button>
            ) : null}
          </div>

          {loadError ? (
            <div className="mt-5 rounded-[1.35rem] border border-rose-400/30 bg-rose-500/10 px-4 py-4 text-sm text-rose-200">
              {loadError}
            </div>
          ) : null}
        </div>
      </SectionCard>

      <SectionCard className="relative overflow-hidden bg-[linear-gradient(180deg,_rgba(8,12,28,0.96),_rgba(13,19,43,0.92))] text-slate-50">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(0,183,255,0.08),_transparent_26%),radial-gradient(circle_at_bottom_right,_rgba(255,79,216,0.08),_transparent_24%)]" />

        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-fuchsia-300">
            Top Wins
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            The players with the strongest run right now.
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
            The list below is pulled from Nakama&apos;s leaderboard records and styled
            to match the rest of the current UI.
          </p>

          <div className="mt-6 grid gap-3">
            {leaderboardEntries.length > 0 ? (
              leaderboardEntries.map((entry, index) => {
                const isCurrentUser = entry.ownerId === userId;

                return (
                  <article
                    key={`${entry.ownerId}-${entry.rank}`}
                    className={`rounded-[1.4rem] border px-4 py-4 shadow-[0_0_0_1px_rgba(77,226,255,0.04)] ${
                      isCurrentUser
                        ? "border-cyan-400/30 bg-cyan-400/10"
                        : index % 2 === 0
                          ? "border-white/10 bg-white/6"
                          : "border-white/8 bg-slate-950/60"
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
                          <p className="text-base font-semibold text-white">
                            {getDisplayUsername(entry, userId)}
                          </p>
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                            {getDisplayOwnerLabel(entry, userId)}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-lg font-semibold text-white">
                          {entry.score}
                        </p>
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                          Wins
                        </p>
                      </div>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="rounded-[1.35rem] border border-white/10 bg-white/5 px-4 py-4 text-sm leading-6 text-slate-300">
                {isLoading
                  ? "Loading the hall of fame."
                  : "No ranked wins yet."}
              </div>
            )}
          </div>

          <div className="mt-6 rounded-[1.35rem] border border-white/10 bg-white/5 px-4 py-4 text-sm leading-6 text-slate-300">
            {leaderboardEntries.length > 0
              ? "Ranked wins update as the backend writes new completed matches."
              : "Play a few games to populate the leaderboard."}
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
