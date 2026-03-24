"use client";

import { useEffect, useState } from "react";

import { useApp } from "@/components/providers/app-provider";
import { SectionCard } from "@/components/ui/section-card";
import type { MatchHistoryEntry, MatchHistoryResponse } from "@/lib/match-history";

function formatDateTime(timestamp: number) {
  if (!Number.isFinite(timestamp)) {
    return "Unavailable";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp * 1000));
}

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "Unavailable";
  }

  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;

  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function getEntryResult(entry: MatchHistoryEntry, userId: string | null) {
  if (entry.winner === null) {
    return "Draw";
  }

  if (entry.winner === userId) {
    return "You won";
  }

  return "You lost";
}

function getPlayerLabel(
  entry: MatchHistoryEntry,
  playerId: string,
  userId: string | null,
  username: string | null,
  playerIndex: number
) {
  if (playerId === userId) {
    return username ?? "You";
  }

  if (entry.playerNames[playerId] && !isRawPlayerId(entry.playerNames[playerId])) {
    return entry.playerNames[playerId];
  }

  return `Guest ${playerIndex + 1}`;
}

function isRawPlayerId(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

const HISTORY_PAGE_SIZE = 12;

export default function HistoryPage() {
  const { client, session, status, userId, username, retryConnection } = useApp();
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [records, setRecords] = useState<MatchHistoryEntry[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    setOffset(0);
    setRecords([]);
    setHasMore(false);
    setTotal(0);
  }, [session, userId]);

  useEffect(() => {
    if (status !== "ready" || !client || !session) {
      return;
    }

    const nakamaClient = client;
    const nakamaSession = session;
    let cancelled = false;

    async function loadHistory() {
      setIsLoading(true);
      setLoadError(null);

      try {
        const response = await nakamaClient.rpc(nakamaSession, "list_match_history", {
          limit: HISTORY_PAGE_SIZE,
          offset,
        });
        const rawPayload =
          typeof response.payload === "string"
            ? response.payload
            : JSON.stringify(response.payload ?? {});
        const payload = JSON.parse(rawPayload || "{}") as MatchHistoryResponse;

        if (cancelled) {
          return;
        }

        const nextRecords = Array.isArray(payload.records) ? payload.records : [];

        setRecords((current) =>
          offset === 0 ? nextRecords : [...current, ...nextRecords]
        );
        setHasMore(Boolean(payload.hasMore));
        setTotal(typeof payload.total === "number" ? payload.total : 0);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setLoadError(error instanceof Error ? error.message : "Failed to load match history.");
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadHistory();

    return () => {
      cancelled = true;
    };
  }, [client, offset, session, status]);

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[0.88fr_1.12fr]">
      <SectionCard className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(0,183,255,0.14),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(255,79,216,0.1),_transparent_22%)]" />
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-300">
          Match Archive
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Review the last games, not just the last board.
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[color:var(--ink-soft)] sm:text-base">
          Completed matches are written by the backend and replayed here with their
          outcome reason, duration, mode, and player labels.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-[1.35rem] border border-cyan-400/18 bg-slate-950/70 px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-300">
              Stored
            </p>
            <p className="mt-2 text-2xl font-semibold text-white">{total}</p>
          </div>
          <div className="rounded-[1.35rem] border border-fuchsia-400/18 bg-slate-950/70 px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.24em] text-fuchsia-300">
              Visible
            </p>
            <p className="mt-2 text-2xl font-semibold text-white">{records.length}</p>
          </div>
          <div className="rounded-[1.35rem] border border-cyan-400/18 bg-slate-950/70 px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-300">
              More
            </p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {hasMore ? "Yes" : "No"}
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-[1.35rem] border border-white/10 bg-white/5 px-4 py-4 text-sm leading-6 text-slate-300">
          <p>Player: {username ?? "Unknown"}</p>
          <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">
            {status === "ready" ? "History is live." : "Waiting for app bootstrap."}
          </p>
        </div>

        {loadError ? (
          <div className="mt-6 rounded-[1.35rem] border border-rose-400/30 bg-rose-500/10 px-4 py-4 text-sm text-rose-200">
            <p>{loadError}</p>
            <button
              type="button"
              onClick={retryConnection}
              className="mt-3 rounded-full border border-rose-400/30 bg-rose-500/10 px-4 py-2 text-xs font-medium text-rose-100 transition hover:bg-rose-500/16"
            >
              Retry connection
            </button>
          </div>
        ) : null}
      </SectionCard>

      <SectionCard className="bg-[linear-gradient(180deg,_rgba(8,12,28,0.96),_rgba(13,19,43,0.92))] text-slate-50">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-fuchsia-300">
          Recent Matches
        </p>

        <div className="mt-5 grid gap-3">
          {isLoading ? (
            <div className="rounded-[1.35rem] border border-white/10 bg-white/5 px-4 py-4 text-sm leading-6 text-slate-300">
              Loading match history.
            </div>
          ) : records.length > 0 ? (
            records.map((record) => (
              <article
                key={record.historyKey}
                className="rounded-[1.4rem] border border-white/10 bg-white/6 px-4 py-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-100">
                      {formatDateTime(record.timestamp)}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">
                      {record.mode} mode
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-white">
                      {getEntryResult(record, userId)}
                    </p>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                      {record.durationSeconds > 0 ? formatDuration(record.durationSeconds) : "0:00"}
                    </p>
                  </div>
                </div>

                <p className="mt-3 text-sm leading-6 text-slate-300">
                  {record.endReasonText}
                </p>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-[1.15rem] border border-cyan-400/15 bg-slate-950/65 px-3 py-3 text-sm text-slate-200">
                    Winner: {record.winner
                      ? getPlayerLabel(
                          record,
                          record.winner,
                          userId,
                          username,
                          Math.max(0, record.players.indexOf(record.winner))
                        )
                      : "Draw"}
                  </div>
                  <div className="rounded-[1.15rem] border border-fuchsia-400/15 bg-slate-950/65 px-3 py-3 text-sm text-slate-200">
                    Result: {record.endReason}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {record.players.map((playerId) => (
                    <span
                      key={playerId}
                      className="rounded-full border border-white/10 bg-slate-950/60 px-3 py-1 text-xs uppercase tracking-[0.18em] text-slate-300"
                    >
                      {getPlayerLabel(
                        record,
                        playerId,
                        userId,
                        username,
                        record.players.indexOf(playerId)
                      )}
                    </span>
                  ))}
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-[1.35rem] border border-white/10 bg-white/5 px-4 py-4 text-sm leading-6 text-slate-300">
              {loadError ? "Unable to load history." : "No completed matches yet."}
            </div>
          )}
        </div>

        {hasMore ? (
          <button
            type="button"
            onClick={() => setOffset((current) => current + HISTORY_PAGE_SIZE)}
            disabled={isLoading}
            className="mt-6 inline-flex rounded-full border border-cyan-400/35 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-100 transition hover:-translate-y-0.5 hover:bg-cyan-400/16 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-800 disabled:text-slate-500"
          >
            {isLoading ? "Loading" : "Load older matches"}
          </button>
        ) : null}
      </SectionCard>
    </div>
  );
}
