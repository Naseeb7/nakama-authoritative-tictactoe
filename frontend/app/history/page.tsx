"use client";

import { useEffect, useState } from "react";

import { useApp } from "@/components/providers/app-provider";
import { PaperButton } from "@/components/ui/paper-primitives";
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
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(91,62,43,0.08),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(214,164,93,0.12),_transparent_22%)]" />
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[color:var(--accent)]">
          Keepsakes
        </p>
        <h2 className="paper-heading mt-3 text-3xl font-semibold tracking-tight text-[color:var(--foreground)] sm:text-4xl">
          Look back through the rounds you have already tucked away.
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[color:var(--ink-soft)] sm:text-base">
          Finished matches are saved here with their ending, duration, mode, and
          player names so they feel like little keepsakes from the game room.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-[1.35rem] border border-[rgba(95,71,48,0.16)] bg-[rgba(255,250,244,0.88)] px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--accent)]">
              Stored
            </p>
            <p className="mt-2 text-2xl font-semibold text-[color:var(--foreground)]">
              {total}
            </p>
          </div>
          <div className="rounded-[1.35rem] border border-[rgba(91,62,43,0.16)] bg-[rgba(255,245,239,0.88)] px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--accent-deep)]">
              Visible
            </p>
            <p className="mt-2 text-2xl font-semibold text-[color:var(--foreground)]">
              {records.length}
            </p>
          </div>
          <div className="rounded-[1.35rem] border border-[rgba(95,71,48,0.16)] bg-[rgba(255,250,244,0.88)] px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--accent)]">
              More
            </p>
            <p className="mt-2 text-2xl font-semibold text-[color:var(--foreground)]">
              {hasMore ? "Yes" : "No"}
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-[1.35rem] border border-[rgba(95,71,48,0.14)] bg-[rgba(255,250,244,0.86)] px-4 py-4 text-sm leading-6 text-[color:var(--foreground)]">
          <p>Player: {username ?? "Unknown"}</p>
          <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[color:var(--ink-soft)]">
            {status === "ready" ? "Keepsakes are ready." : "Waiting for the game room to wake up."}
          </p>
        </div>

        {loadError ? (
          <div className="mt-6 rounded-[1.35rem] border border-[rgba(91,62,43,0.28)] bg-[rgba(238,224,208,0.92)] px-4 py-4 text-sm text-[color:var(--accent)]">
            <p>{loadError}</p>
            <PaperButton
              type="button"
              onClick={retryConnection}
              variant="primary"
              size="sm"
              className="mt-3"
            >
              Try again
            </PaperButton>
          </div>
        ) : null}
      </SectionCard>

      <SectionCard>
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[color:var(--accent-deep)]">
          Recent rounds
        </p>

        <div className="mt-5 grid gap-3">
          {isLoading ? (
            <div className="rounded-[1.35rem] border border-[rgba(95,71,48,0.14)] bg-[rgba(255,250,244,0.86)] px-4 py-4 text-sm leading-6 text-[color:var(--ink-soft)]">
              Gathering your keepsakes.
            </div>
          ) : records.length > 0 ? (
            records.map((record) => (
              <article
                key={record.historyKey}
                className="rounded-[1.4rem] border border-[rgba(95,71,48,0.14)] bg-[rgba(255,250,244,0.88)] px-4 py-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--foreground)]">
                      {formatDateTime(record.timestamp)}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[color:var(--ink-soft)]">
                      {record.mode} mode
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-[color:var(--foreground)]">
                      {getEntryResult(record, userId)}
                    </p>
                    <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--ink-soft)]">
                      {record.durationSeconds > 0 ? formatDuration(record.durationSeconds) : "0:00"}
                    </p>
                  </div>
                </div>

              <p className="mt-3 text-sm leading-6 text-[color:var(--ink-soft)]">
                {record.endReasonText}
              </p>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-[1.15rem] border border-[rgba(95,71,48,0.14)] bg-[rgba(255,250,244,0.86)] px-3 py-3 text-sm text-[color:var(--foreground)]">
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
                  <div className="rounded-[1.15rem] border border-[rgba(91,62,43,0.14)] bg-[rgba(255,245,239,0.88)] px-3 py-3 text-sm text-[color:var(--foreground)]">
                    Ending: {record.endReason}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {record.players.map((playerId) => (
                    <span
                      key={playerId}
                      className="rounded-full border border-[rgba(95,71,48,0.14)] bg-[rgba(255,250,244,0.88)] px-3 py-1 text-xs uppercase tracking-[0.18em] text-[color:var(--ink-soft)]"
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
            <div className="rounded-[1.35rem] border border-[rgba(95,71,48,0.14)] bg-[rgba(255,250,244,0.86)] px-4 py-4 text-sm leading-6 text-[color:var(--ink-soft)]">
              {loadError ? "Unable to load keepsakes." : "No finished rounds yet."}
            </div>
          )}
        </div>

        {hasMore ? (
          <PaperButton
            type="button"
            onClick={() => setOffset((current) => current + HISTORY_PAGE_SIZE)}
            disabled={isLoading}
            className="mt-6 inline-flex"
          >
            {isLoading ? "Loading" : "Load older rounds"}
          </PaperButton>
        ) : null}
      </SectionCard>
    </div>
  );
}
