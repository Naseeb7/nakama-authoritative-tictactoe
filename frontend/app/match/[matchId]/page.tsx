"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

import { GameBoard } from "@/components/match/game-board";
import { useApp } from "@/components/providers/app-provider";
import { SectionCard } from "@/components/ui/section-card";
import type { MatchMode } from "@/lib/match-types";

function isExpiredMatchError(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "number" &&
    (error.code === 4 || error.code === 5)
  ) {
    return true;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    return (
      message.includes("match not found") ||
      message.includes("match has already ended")
    );
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    const message = error.message.toLowerCase();

    return (
      message.includes("match not found") ||
      message.includes("match has already ended")
    );
  }

  return false;
}

function getResultText(
  winner: string | null,
  userId: string | null,
  status: "waiting" | "active" | "finished"
) {
  if (status !== "finished") {
    return "Match in progress";
  }

  if (!winner) {
    return "Draw";
  }

  if (winner === userId) {
    return "You won";
  }

  return "You lost";
}

function getWinnerText(
  winner: string | null,
  status: "waiting" | "active" | "finished",
  userId: string | null,
  playerNames: Record<string, string>,
  symbols: Record<string, "X" | "O">
) {
  if (status !== "finished") {
    return "Pending";
  }

  if (!winner) {
    return "Draw";
  }

  return getPlayerLabel(winner, userId, playerNames, symbols);
}

function getPlayerLabel(
  playerId: string,
  currentUserId: string | null,
  playerNames: Record<string, string>,
  symbols: Record<string, "X" | "O">
) {
  if (playerId === currentUserId) {
    return "You";
  }

  if (playerNames[playerId]) {
    return playerNames[playerId];
  }

  if (symbols[playerId]) {
    return `Player ${symbols[playerId]}`;
  }

  return "Opponent";
}

function formatCountdown(seconds: number | null) {
  if (seconds === null || !Number.isFinite(seconds)) {
    return "Unavailable";
  }

  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;

  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function formatDuration(startTime: number, endTime: number | null) {
  if (!endTime || endTime <= startTime) {
    return "Unavailable";
  }

  const durationSeconds = endTime - startTime;
  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function getLifecycleHeading(status: "waiting" | "active" | "finished") {
  if (status === "waiting") {
    return "Waiting for opponent";
  }

  if (status === "finished") {
    return "Match complete";
  }

  return "Match in progress";
}

function TurnTimer({
  serverTime,
  turnExpiresAt,
  isPaused,
  secondsRemaining,
}: {
  serverTime: number;
  turnExpiresAt: number | null;
  isPaused: boolean;
  secondsRemaining: number | null;
}) {
  const [now, setNow] = useState<number | null>(null);
  const [clockOffsetMs, setClockOffsetMs] = useState(0);

  useEffect(() => {
    if (secondsRemaining === null || isPaused) {
      return;
    }

    setClockOffsetMs(
      Number.isFinite(serverTime) ? serverTime * 1000 - Date.now() : 0
    );

    const syncId = window.setTimeout(() => {
      setNow(Date.now());
    }, 0);

    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      window.clearTimeout(syncId);
      window.clearInterval(intervalId);
    };
  }, [isPaused, secondsRemaining, serverTime, turnExpiresAt]);

  if (secondsRemaining === null) {
    return <>Unavailable</>;
  }

  if (now === null) {
    return <>{formatCountdown(secondsRemaining)}</>;
  }

  if (
    isPaused ||
    turnExpiresAt === null ||
    !Number.isFinite(turnExpiresAt) ||
    !Number.isFinite(serverTime)
  ) {
    return <>{formatCountdown(secondsRemaining)}</>;
  }

  const remainingSeconds = Math.ceil(
    (turnExpiresAt * 1000 - (now + clockOffsetMs)) / 1000
  );

  return (
    <>
      {formatCountdown(remainingSeconds)}
    </>
  );
}

function ReconnectCountdown({
  disconnectedAt,
  timeoutSeconds,
}: {
  disconnectedAt: number;
  timeoutSeconds: number;
}) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const syncId = window.setTimeout(() => {
      setNow(Date.now());
    }, 0);

    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      window.clearTimeout(syncId);
      window.clearInterval(intervalId);
    };
  }, []);

  if (now === null) {
    return <>{formatCountdown(timeoutSeconds)}</>;
  }

  const expiresAt = (disconnectedAt + timeoutSeconds) * 1000;
  const remainingSeconds = Math.ceil((expiresAt - now) / 1000);

  return <>{formatCountdown(remainingSeconds)}</>;
}

export default function MatchRoomPage() {
  const params = useParams<{ matchId: string }>();
  const router = useRouter();
  const {
    activeMatch,
    joinExistingMatch,
    latestMatchState,
    leaveMatch,
    matchError,
    requestMatch,
    retryConnection,
    sendMove,
    socketStatus,
    userId,
    username,
  } = useApp();
  const [pendingPosition, setPendingPosition] = useState<number | null>(null);
  const [pendingMoveCount, setPendingMoveCount] = useState<number | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [isSubmittingMove, setIsSubmittingMove] = useState(false);
  const [matchActionError, setMatchActionError] = useState<string | null>(null);
  const [joinRouteError, setJoinRouteError] = useState<string | null>(null);
  const [isJoiningRouteMatch, setIsJoiningRouteMatch] = useState(false);
  const [isRequeuing, startRequeuing] = useTransition();
  const matchId = params.matchId;

  const assignedSymbol = useMemo(() => {
    if (!latestMatchState || !userId) {
      return null;
    }

    return latestMatchState.symbols[userId] ?? null;
  }, [latestMatchState, userId]);

  const canPlay =
    !!latestMatchState &&
    latestMatchState.status === "active" &&
    latestMatchState.currentTurn === userId &&
    socketStatus === "connected" &&
    activeMatch?.matchId === matchId;

  const matchResult = latestMatchState
    ? getResultText(latestMatchState.winner, userId, latestMatchState.status)
    : "Waiting for match state";
  const matchOutcome = latestMatchState
    ? latestMatchState.endReasonText ?? "Match outcome unavailable."
    : "Waiting for match state";

  const isAwaitingAuthoritativeUpdate =
    pendingPosition !== null &&
    pendingMoveCount !== null &&
    !!latestMatchState &&
    latestMatchState.moveHistory.length === pendingMoveCount;

  const isTimedMatch = latestMatchState?.mode === "timed";
  const isActiveMatch = latestMatchState?.status === "active";
  const hasDisconnectedPlayers =
    isActiveMatch &&
    !!latestMatchState &&
    Object.keys(latestMatchState.disconnectedPlayers).length > 0;
  const disconnectedEntries = latestMatchState
    ? Object.entries(latestMatchState.disconnectedPlayers)
    : [];
  const currentMode: MatchMode = latestMatchState?.mode ?? activeMatch?.mode ?? "classic";
  const lifecycleHeading = latestMatchState
    ? getLifecycleHeading(latestMatchState.status)
    : "Loading match";
  const finishedDuration = latestMatchState
    ? formatDuration(latestMatchState.startTime, latestMatchState.endTime)
    : "Unavailable";
  const isRouteJoinPending =
    activeMatch?.matchId !== matchId &&
    socketStatus === "connected" &&
    isJoiningRouteMatch;

  useEffect(() => {
    if (socketStatus === "connected" && activeMatch?.matchId === matchId) {
      setJoinRouteError(null);
    }
  }, [activeMatch?.matchId, matchId, socketStatus]);

  useEffect(() => {
    if (!matchId || socketStatus !== "connected") {
      return;
    }

    if (activeMatch?.matchId === matchId) {
      return;
    }

    let cancelled = false;

    async function ensureRouteMatchJoined() {
      setIsJoiningRouteMatch(true);

      try {
        await joinExistingMatch(matchId, activeMatch?.mode ?? "classic");

        if (!cancelled) {
          setIsJoiningRouteMatch(false);
          setJoinRouteError(null);
        }
      } catch (error) {
        if (cancelled) {
          return;
        }

        setIsJoiningRouteMatch(false);
        setJoinRouteError(
          isExpiredMatchError(error)
            ? "This room has already closed. Start a new game from the lobby."
            : error instanceof Error
              ? error.message
              : "Unable to join the match from the current route."
        );
      }
    }

    void ensureRouteMatchJoined();

    return () => {
      cancelled = true;
    };
  }, [activeMatch?.matchId, activeMatch?.mode, joinExistingMatch, matchId, socketStatus]);

  async function handleMove(position: number) {
    setMoveError(null);
    setPendingPosition(position);
    setIsSubmittingMove(true);
    setPendingMoveCount(latestMatchState?.moveHistory.length ?? 0);

    try {
      await sendMove(position);
      setIsSubmittingMove(false);
    } catch (error) {
      if (error instanceof Error) {
        setMoveError(error.message);
      } else {
        setMoveError("Move failed.");
      }

      setPendingPosition(null);
      setPendingMoveCount(null);
      setIsSubmittingMove(false);
    }
  }

  useEffect(() => {
    if (
      pendingPosition === null ||
      pendingMoveCount === null ||
      !latestMatchState
    ) {
      return;
    }

    if (
      latestMatchState.status === "finished" ||
      latestMatchState.moveHistory.length > pendingMoveCount
    ) {
      setPendingPosition(null);
      setPendingMoveCount(null);
      setIsSubmittingMove(false);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setMoveError(
        "The server did not confirm that move. Try the square again."
      );
      setPendingPosition(null);
      setPendingMoveCount(null);
      setIsSubmittingMove(false);
    }, 6000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    latestMatchState,
    pendingMoveCount,
    pendingPosition,
  ]);

  function handleNextMatch(action: "create_match" | "find_match") {
    setMatchActionError(null);

    startRequeuing(async () => {
      try {
        const nextMatchId = await requestMatch(action, currentMode);
        router.push(`/match/${encodeURIComponent(nextMatchId)}`);
      } catch (error) {
        if (error instanceof Error) {
          setMatchActionError(error.message);
        } else {
          setMatchActionError("Unable to join the next match.");
        }
      }
    });
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[0.88fr_1.12fr] xl:gap-6">
      <div className="order-2 grid gap-4 xl:order-1 xl:sticky xl:top-8 xl:self-start xl:gap-6">
        {latestMatchState ? (
          <SectionCard>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-300">
              Live HUD
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs uppercase tracking-[0.22em]">
              <span className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-2 text-cyan-200">
                Status {latestMatchState.status}
              </span>
              <span className="rounded-full border border-fuchsia-400/25 bg-fuchsia-500/10 px-3 py-2 text-fuchsia-200">
                Turn {latestMatchState.currentTurn ? getPlayerLabel(latestMatchState.currentTurn, userId, latestMatchState.playerNames, latestMatchState.symbols) : "none"}
              </span>
              <span className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-2 text-slate-300">
                Winner{" "}
                {getWinnerText(
                  latestMatchState.winner,
                  latestMatchState.status,
                  userId,
                  latestMatchState.playerNames,
                  latestMatchState.symbols
                )}
              </span>
              <span className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-2 text-slate-300">
                Moves {latestMatchState.moveHistory.length}
              </span>
            </div>
            <div className="mt-4 grid gap-3 text-sm leading-6">
              {isTimedMatch ? (
                <div className="rounded-[1.2rem] border border-cyan-400/28 bg-cyan-400/10 px-4 py-3 text-cyan-100 sm:rounded-[1.4rem] sm:py-4">
                  {hasDisconnectedPlayers ? "The clock is paused with " : "Clock: "}
                  <TurnTimer
                    key={`body-${latestMatchState.turnExpiresAt ?? "none"}-${
                      hasDisconnectedPlayers ? "paused" : "live"
                    }`}
                    serverTime={latestMatchState.serverTime}
                    turnExpiresAt={latestMatchState.turnExpiresAt}
                    isPaused={hasDisconnectedPlayers}
                    secondsRemaining={latestMatchState.turnSecondsRemaining}
                  />
                  {hasDisconnectedPlayers ? " remaining until play resumes." : null}
                </div>
              ) : null}
              {hasDisconnectedPlayers ? (
                <div className="rounded-[1.2rem] border border-fuchsia-400/25 bg-fuchsia-500/10 px-4 py-3 text-fuchsia-100 sm:rounded-[1.4rem] sm:py-4">
                  Return time left: {latestMatchState.disconnectTimeoutSeconds}s
                </div>
              ) : null}
              <div className="rounded-[1.2rem] border border-cyan-400/18 bg-slate-950/70 px-4 py-3 text-slate-200 sm:rounded-[1.4rem] sm:py-4">
                {canPlay
                  ? "Your turn. Pick an empty square."
                  : activeMatch?.matchId !== matchId && socketStatus === "connected"
                    ? isRouteJoinPending
                      ? "Opening this game again."
                      : "Getting this game ready."
                  : socketStatus !== "connected"
                    ? "Trying to reconnect you to the game."
                  : hasDisconnectedPlayers
                    ? "Waiting to see if the other player comes back."
                  : latestMatchState.status === "waiting"
                    ? "Waiting for another player."
                    : latestMatchState.status === "finished"
                      ? "Game over."
                      : "Waiting for the other player to move."}
              </div>
              {matchError || moveError ? (
                <div className="rounded-[1.2rem] border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-rose-200 sm:rounded-[1.4rem] sm:py-4">
                  {moveError ?? matchError}
                  {socketStatus !== "connected" || latestMatchState === null ? (
                    <button
                      type="button"
                      onClick={retryConnection}
                      className="mt-3 rounded-full border border-rose-400/30 bg-rose-500/10 px-4 py-2 text-xs font-medium text-rose-100 transition hover:bg-rose-500/16"
                    >
                      Retry connection
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={async () => {
                  await leaveMatch();
                  router.push("/play");
                }}
                className="rounded-full border border-fuchsia-400/35 bg-fuchsia-500/10 px-5 py-3 text-sm font-medium text-fuchsia-100 transition hover:-translate-y-0.5 hover:bg-fuchsia-500/16"
              >
                Leave Room
              </button>
              <Link
                href="/play"
                className="rounded-full border border-cyan-400/35 bg-cyan-400/10 px-5 py-3 text-sm font-medium text-cyan-100 transition hover:-translate-y-0.5 hover:bg-cyan-400/16"
              >
                Back to Lobby
              </Link>
            </div>
          </SectionCard>
        ) : null}

        <SectionCard className="bg-[linear-gradient(180deg,_rgba(8,12,28,0.96),_rgba(13,19,43,0.92))] text-slate-50">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-fuchsia-300">
            Arena
          </p>
          <h2 className="mt-3 break-all text-xl font-semibold tracking-tight text-white sm:text-3xl xl:text-4xl">
            {matchId}
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-[1.15rem] border border-cyan-400/18 bg-slate-950/70 px-4 py-3 sm:rounded-[1.35rem] sm:py-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-300">
                Pilot
              </p>
              <p className="mt-2 text-base font-semibold text-white">
                {username ?? "Unknown"}
              </p>
            </div>
            <div className="rounded-[1.15rem] border border-fuchsia-400/18 bg-slate-950/70 px-4 py-3 sm:rounded-[1.35rem] sm:py-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-fuchsia-300">
                Symbol
              </p>
              <p className="mt-2 text-base font-semibold text-white">
                {assignedSymbol ?? "Pending"}
              </p>
            </div>
            <div className="rounded-[1.15rem] border border-cyan-400/18 bg-slate-950/70 px-4 py-3 sm:rounded-[1.35rem] sm:py-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-300">
                Ruleset
              </p>
              <p className="mt-2 text-base font-semibold text-white">
                {currentMode}
              </p>
            </div>
            <div className="rounded-[1.15rem] border border-fuchsia-400/18 bg-slate-950/70 px-4 py-3 sm:rounded-[1.35rem] sm:py-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-fuchsia-300">
                Result
              </p>
              <p className="mt-2 text-base font-semibold text-white">
                {matchResult}
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-400">
                {matchOutcome}
              </p>
            </div>
            {isTimedMatch ? (
              <div className="rounded-[1.15rem] border border-cyan-400/30 bg-[linear-gradient(180deg,_rgba(0,183,255,0.14),_rgba(0,183,255,0.08))] px-4 py-3 text-cyan-50 shadow-[0_0_24px_rgba(0,183,255,0.16)] sm:col-span-2 sm:rounded-[1.35rem] sm:py-4 xl:col-span-1">
                <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-200">
                  Turn Clock
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-[0.14em] sm:text-3xl sm:tracking-[0.16em]">
                  <TurnTimer
                    key={`hero-${latestMatchState?.turnExpiresAt ?? "none"}-${
                      hasDisconnectedPlayers ? "paused" : "live"
                    }`}
                    serverTime={latestMatchState.serverTime}
                    turnExpiresAt={latestMatchState.turnExpiresAt}
                    isPaused={hasDisconnectedPlayers}
                    secondsRemaining={latestMatchState?.turnSecondsRemaining ?? null}
                  />
                </p>
                <p className="mt-2 text-xs uppercase tracking-[0.18em] text-cyan-100/80">
                  {hasDisconnectedPlayers
                    ? "Paused while waiting for reconnect"
                    : latestMatchState?.currentTurn
                      ? `${getPlayerLabel(
                          latestMatchState.currentTurn,
                          userId,
                          latestMatchState.playerNames,
                          latestMatchState.symbols
                        )} is on the clock`
                      : "Clock ready"}
                </p>
              </div>
            ) : null}
          </div>
        </SectionCard>
      </div>

      <SectionCard className="order-1 relative overflow-hidden xl:order-2">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(0,183,255,0.08),_transparent_26%),radial-gradient(circle_at_bottom_right,_rgba(255,79,216,0.08),_transparent_24%)]" />
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-300">
          Duel Board
        </p>

        {latestMatchState ? (
          <>
            <div
              className={`mt-4 rounded-[1.25rem] border px-4 py-4 sm:rounded-[1.6rem] sm:px-5 sm:py-5 ${
                latestMatchState.status === "finished"
                  ? "border-cyan-400/28 bg-cyan-400/8"
                  : latestMatchState.status === "waiting"
                    ? "border-fuchsia-400/25 bg-fuchsia-500/8"
                    : "border-cyan-400/18 bg-slate-950/66"
              }`}
            >
              <h3 className="mt-2 text-xl font-semibold tracking-tight text-white sm:text-3xl">
                {lifecycleHeading}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                {latestMatchState.status === "waiting"
                  ? "The game is ready and waiting for one more player."
                  : latestMatchState.status === "finished"
                    ? `${matchResult}. You can jump straight into another ${currentMode} game from here.`
                    : hasDisconnectedPlayers
                      ? "Someone dropped out for a moment. The game is holding their spot for a short time."
                    : canPlay
                      ? "It is your turn."
                      : "The board is live. Wait for the next move."}
              </p>

              {hasDisconnectedPlayers ? (
                <div className="mt-4 rounded-[1.15rem] border border-fuchsia-400/28 bg-fuchsia-500/10 px-4 py-4 text-sm text-fuchsia-100 sm:rounded-[1.3rem]">
                  <p className="font-medium">
                    Comeback window active
                  </p>
                  <p className="mt-1 leading-6">
                    If the missing player does not make it back in time, the game will end on its own.
                  </p>
                  <div className="mt-3 grid gap-3">
                    {disconnectedEntries.map(([playerId, disconnectedAt]) => (
                      <div
                        key={playerId}
                        className="rounded-[1rem] border border-fuchsia-400/20 bg-slate-950/55 px-4 py-3 sm:rounded-[1.1rem]"
                      >
                        {getPlayerLabel(
                          playerId,
                          userId,
                          latestMatchState.playerNames,
                          latestMatchState.symbols
                        )}{" "}
                        reconnects in{" "}
                        <ReconnectCountdown
                          disconnectedAt={disconnectedAt}
                          timeoutSeconds={latestMatchState.disconnectTimeoutSeconds}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {activeMatch?.matchId !== matchId && socketStatus === "connected" ? (
                <div className="mt-4 rounded-[1.1rem] border border-cyan-400/28 bg-cyan-400/10 px-4 py-4 text-sm text-cyan-100 sm:rounded-[1.2rem]">
                  {isRouteJoinPending
                    ? "Rejoining this game."
                    : "Getting this game ready again."}
                </div>
              ) : null}

              {latestMatchState.status === "finished" ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-[1.1rem] border border-cyan-400/18 bg-slate-950/70 px-4 py-4 text-sm text-slate-200 sm:rounded-[1.2rem]">
                    Result: {matchResult}
                  </div>
                  <div className="rounded-[1.1rem] border border-fuchsia-400/18 bg-slate-950/70 px-4 py-4 text-sm text-slate-200 sm:rounded-[1.2rem]">
                    Winner:{" "}
                    {getWinnerText(
                      latestMatchState.winner,
                      latestMatchState.status,
                      userId,
                      latestMatchState.playerNames,
                      latestMatchState.symbols
                    )}
                  </div>
                  <div className="rounded-[1.1rem] border border-cyan-400/18 bg-slate-950/70 px-4 py-4 text-sm text-slate-200 sm:rounded-[1.2rem]">
                    Duration: {finishedDuration}
                  </div>
                  <div className="rounded-[1.1rem] border border-fuchsia-400/18 bg-slate-950/70 px-4 py-4 text-sm text-slate-200 sm:rounded-[1.2rem]">
                    Outcome: {matchOutcome}
                  </div>
                </div>
              ) : null}

              {latestMatchState.status === "finished" ? (
                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => handleNextMatch("find_match")}
                    disabled={isRequeuing}
                    className="rounded-full border border-cyan-400/35 bg-cyan-400/12 px-5 py-3 text-sm font-medium text-cyan-100 shadow-[0_0_22px_rgba(0,183,255,0.14)] transition hover:-translate-y-0.5 hover:bg-cyan-400/18 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-800 disabled:text-slate-500 disabled:shadow-none"
                  >
                    Play Again
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await leaveMatch();
                      router.push("/play");
                    }}
                    disabled={isRequeuing}
                    className="rounded-full border border-fuchsia-400/35 bg-fuchsia-500/10 px-5 py-3 text-sm font-medium text-fuchsia-100 transition hover:-translate-y-0.5 hover:bg-fuchsia-500/16 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-800 disabled:text-slate-500"
                  >
                    Back to Lobby
                  </button>
                </div>
              ) : null}

              {latestMatchState.status === "finished" ? (
                <p className="mt-4 text-sm leading-6 text-slate-400">
                  Use `Play Again` on both screens to jump into the next round.
                  `Back to Lobby` takes you out to the game menu.
                </p>
              ) : null}

              {matchActionError || (activeMatch?.matchId !== matchId ? joinRouteError : null) ? (
                <div className="mt-4 rounded-[1.1rem] border border-rose-400/30 bg-rose-500/10 px-4 py-4 text-sm text-rose-200 sm:rounded-[1.2rem]">
                  {matchActionError ?? joinRouteError}
                </div>
              ) : null}
            </div>

            {isTimedMatch ? (
              <div className="mt-4 rounded-[1.25rem] border border-cyan-400/35 bg-[linear-gradient(135deg,_rgba(0,183,255,0.16),_rgba(11,18,42,0.94))] px-4 py-4 text-cyan-50 shadow-[0_0_28px_rgba(0,183,255,0.16)] sm:rounded-[1.6rem] sm:px-5 sm:py-5">
                <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-200">
                  Active Turn Clock
                </p>
                <div className="mt-2 flex flex-wrap items-end justify-between gap-3 sm:gap-4">
                  <div>
                    <p className="text-3xl font-semibold tracking-[0.12em] text-white sm:text-5xl sm:tracking-[0.18em]">
                      <TurnTimer
                        key={`banner-${latestMatchState.turnExpiresAt ?? "none"}-${
                          hasDisconnectedPlayers ? "paused" : "live"
                        }`}
                        serverTime={latestMatchState.serverTime}
                        turnExpiresAt={latestMatchState.turnExpiresAt}
                        isPaused={hasDisconnectedPlayers}
                        secondsRemaining={latestMatchState.turnSecondsRemaining}
                      />
                    </p>
                    <p className="mt-2 text-sm leading-6 text-cyan-100/80">
                      {hasDisconnectedPlayers
                        ? "Clock paused while the reconnect window is active."
                        : latestMatchState.currentTurn
                          ? `${getPlayerLabel(
                              latestMatchState.currentTurn,
                              userId,
                              latestMatchState.playerNames,
                              latestMatchState.symbols
                            )} must play before time runs out.`
                          : "Waiting for the next turn."}
                    </p>
                  </div>
                  <div className="rounded-full border border-cyan-200/20 bg-slate-950/35 px-4 py-2 text-xs uppercase tracking-[0.2em] text-cyan-100">
                    {hasDisconnectedPlayers ? "Paused" : "Live"}
                  </div>
                </div>
              </div>
            ) : null}

            <div className="mt-4">
              <GameBoard
                board={latestMatchState.board}
                canPlay={canPlay && !isAwaitingAuthoritativeUpdate && !isSubmittingMove}
                onSelectCell={handleMove}
                pendingPosition={isAwaitingAuthoritativeUpdate ? pendingPosition : null}
              />
            </div>

            <div className="mt-6">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">
                Turn Log
              </p>
              <div className="mt-3 grid gap-2">
                {latestMatchState.moveHistory.length > 0 ? (
                  latestMatchState.moveHistory.map((move, index) => (
                    <div
                      key={`${move.playerId}-${move.position}-${index}`}
                      className={`rounded-[1.2rem] border px-4 py-3 text-sm ${
                        index % 2 === 0
                          ? "border-cyan-400/18 bg-slate-950/70 text-slate-200"
                          : "border-fuchsia-400/18 bg-slate-950/78 text-slate-200"
                      }`}
                    >
                      Turn {index + 1}:{" "}
                      {getPlayerLabel(
                        move.playerId,
                        userId,
                        latestMatchState.playerNames,
                        latestMatchState.symbols
                      )}{" "}
                      played position {move.position}
                    </div>
                  ))
                ) : (
                  <div className="rounded-[1.2rem] border border-slate-800 bg-slate-950/75 px-4 py-3 text-sm text-slate-400">
                    No moves yet.
                  </div>
                )}
              </div>
            </div>
          </>
        ) : joinRouteError ? (
          <div className="mt-4 rounded-[1.4rem] border border-rose-400/30 bg-rose-500/10 px-4 py-5 text-sm leading-6 text-rose-100">
            <p className="text-base font-semibold text-white">Match unavailable</p>
            <p className="mt-2">{joinRouteError}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/play"
                className="rounded-full border border-cyan-400/35 bg-cyan-400/10 px-5 py-3 text-sm font-medium text-cyan-100 transition hover:-translate-y-0.5 hover:bg-cyan-400/16"
              >
                Back to Lobby
              </Link>
              <Link
                href="/history"
                className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-slate-200 transition hover:border-cyan-400/30 hover:bg-white/8"
              >
                Open History
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-[1.4rem] border border-slate-800 bg-slate-950/75 px-4 py-4 text-sm leading-6 text-slate-400">
            Waiting for authoritative state broadcast from the backend.
          </div>
        )}
      </SectionCard>
    </div>
  );
}
