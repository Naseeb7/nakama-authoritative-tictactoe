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

export default function LeaderboardPage() {
  const { client, session, status, userId, username } = useApp();
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
    <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <SectionCard>
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[color:var(--accent-deep)]">
          Your Record
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">
          Every win and streak, recorded live.
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[color:var(--ink-soft)] sm:text-base">
          This page tracks your wins, losses, games played, and streaks so you can
          see how your recent run is going.
        </p>

        <div className="mt-6 rounded-[1.5rem] border border-[color:var(--stroke)] bg-white/65 px-4 py-4 text-sm leading-6 text-stone-700">
          <p>Game: {status}</p>
          <p>Player: {username ?? "Unknown"}</p>
          <p>Profile: {userId ?? "Unavailable"}</p>
          <p>Loading: {isLoading ? "yes" : "no"}</p>
          {loadError ? <p className="mt-2 text-rose-700">{loadError}</p> : null}
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-[1.4rem] border border-[color:var(--stroke)] bg-white/70 px-4 py-4 text-sm text-stone-700">
            Wins: {playerStats.wins}
          </div>
          <div className="rounded-[1.4rem] border border-[color:var(--stroke)] bg-white/70 px-4 py-4 text-sm text-stone-700">
            Losses: {playerStats.losses}
          </div>
          <div className="rounded-[1.4rem] border border-[color:var(--stroke)] bg-white/70 px-4 py-4 text-sm text-stone-700">
            Games played: {playerStats.gamesPlayed}
          </div>
          <div className="rounded-[1.4rem] border border-[color:var(--stroke)] bg-white/70 px-4 py-4 text-sm text-stone-700">
            Current streak: {playerStats.currentStreak}
          </div>
          <div className="rounded-[1.4rem] border border-[color:var(--stroke)] bg-white/70 px-4 py-4 text-sm text-stone-700 sm:col-span-2">
            Best streak: {playerStats.bestStreak}
          </div>
        </div>
      </SectionCard>

      <SectionCard className="bg-[linear-gradient(180deg,_rgba(37,25,19,0.98),_rgba(73,47,32,0.94))] text-stone-50">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-stone-400">
          Hall of Fame
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
          The players with the most wins right now.
        </h2>

        <div className="mt-6 grid gap-3">
          {leaderboardEntries.length > 0 ? (
            leaderboardEntries.map((entry) => (
              <div
                key={`${entry.ownerId}-${entry.rank}`}
                className="rounded-[1.4rem] border border-white/10 bg-white/6 px-4 py-4 text-sm text-stone-200"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="font-medium">
                    #{entry.rank || "-"} {entry.username}
                  </span>
                  <span>{entry.score} wins</span>
                </div>
                <p className="mt-2 text-xs uppercase tracking-[0.2em] text-stone-400">
                  {entry.ownerId === userId ? "You" : entry.ownerId}
                </p>
              </div>
            ))
          ) : (
            <div className="rounded-[1.4rem] border border-white/10 bg-white/6 px-4 py-4 text-sm leading-6 text-stone-300">
              {isLoading
                ? "Loading the hall of fame."
                : "No ranked wins yet."}
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
