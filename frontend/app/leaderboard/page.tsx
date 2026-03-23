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

  return {
    bestStreak: toSafeNumber(parsed.bestStreak),
    currentStreak: toSafeNumber(parsed.currentStreak),
    gamesPlayed: toSafeNumber(parsed.gamesPlayed),
    losses: toSafeNumber(parsed.losses),
    wins: toSafeNumber(parsed.wins),
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
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
          Phase 4
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
          Live leaderboard and player stats.
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
          This page now reads the global wins leaderboard and the signed-in
          player&apos;s stored stats directly from Nakama using the existing
          authenticated frontend session.
        </p>

        <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-700">
          <p>Frontend status: {status}</p>
          <p>Player: {username ?? "Unknown"}</p>
          <p>Player id: {userId ?? "Unavailable"}</p>
          <p>Surface state: {isLoading ? "loading" : "ready"}</p>
          {loadError ? <p className="mt-2 text-rose-600">{loadError}</p> : null}
        </div>

        <div className="mt-6 grid gap-3">
          <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
            Wins: {playerStats.wins}
          </div>
          <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
            Losses: {playerStats.losses}
          </div>
          <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
            Games played: {playerStats.gamesPlayed}
          </div>
          <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
            Current streak: {playerStats.currentStreak}
          </div>
          <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
            Best streak: {playerStats.bestStreak}
          </div>
        </div>
      </SectionCard>

      <SectionCard className="bg-slate-950 text-slate-50">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
          Global Wins
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight">
          Top players by authoritative match wins.
        </h2>

        <div className="mt-6 grid gap-3">
          {leaderboardEntries.length > 0 ? (
            leaderboardEntries.map((entry) => (
              <div
                key={`${entry.ownerId}-${entry.rank}`}
                className="rounded-[1.4rem] border border-white/10 bg-white/5 px-4 py-4 text-sm text-slate-200"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="font-medium">
                    #{entry.rank || "-"} {entry.username}
                  </span>
                  <span>{entry.score} win(s)</span>
                </div>
                <p className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-400">
                  {entry.ownerId === userId ? "You" : entry.ownerId}
                </p>
              </div>
            ))
          ) : (
            <div className="rounded-[1.4rem] border border-white/10 bg-white/5 px-4 py-4 text-sm leading-6 text-slate-300">
              {isLoading
                ? "Loading leaderboard records."
                : "No leaderboard records yet."}
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
