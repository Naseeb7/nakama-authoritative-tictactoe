"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

import { GameBoard } from "@/components/match/game-board";
import { useApp } from "@/components/providers/app-provider";
import { SectionCard } from "@/components/ui/section-card";
import type { MatchMode } from "@/lib/match-types";

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
  status: "waiting" | "active" | "finished"
) {
  if (status !== "finished") {
    return "Pending";
  }

  return winner ?? "Draw";
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

function getPlayerLabel(playerId: string, currentUserId: string | null) {
  return playerId === currentUserId ? "You" : playerId;
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
  const [clockOffset] = useState<number>(() =>
    Number.isFinite(serverTime) ? serverTime * 1000 - Date.now() : 0
  );
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (secondsRemaining === null || isPaused) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 250);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isPaused, secondsRemaining]);

  if (secondsRemaining === null) {
    return <>Unavailable</>;
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
    (turnExpiresAt * 1000 - (now + clockOffset)) / 1000
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
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 250);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

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
          error instanceof Error
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
    <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
      <SectionCard className="bg-[linear-gradient(180deg,_rgba(37,25,19,0.98),_rgba(73,47,32,0.94))] text-stone-50">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-stone-400">
          Arena
        </p>
        <h2 className="mt-3 break-all text-3xl font-semibold tracking-tight sm:text-4xl">
          {matchId}
        </h2>
        <p className="mt-3 text-sm leading-7 text-stone-300 sm:text-base">
          {activeMatch?.matchId === matchId
            ? "You are connected to the live room for this duel."
            : "This route is open, but your current session is not joined to this room id yet."}
        </p>

        <div className="mt-6 grid gap-3 text-sm text-stone-300">
          <div className="rounded-[1.4rem] border border-white/10 bg-white/6 px-4 py-4">
            Player: {username ?? "Unknown"}
          </div>
          <div className="rounded-[1.4rem] border border-white/10 bg-white/6 px-4 py-4">
            Symbol: {assignedSymbol ?? "Pending"}
          </div>
          <div className="rounded-[1.4rem] border border-white/10 bg-white/6 px-4 py-4">
            Ruleset: {activeMatch?.mode ?? "Unknown"}
          </div>
          <div className="rounded-[1.4rem] border border-white/10 bg-white/6 px-4 py-4">
            Result: {matchResult}
          </div>
          {isTimedMatch ? (
            <div className="rounded-[1.4rem] border border-amber-400/20 bg-amber-300/10 px-4 py-4 text-amber-100">
              Turn timer:{" "}
              <TurnTimer
                key={`hero-${latestMatchState?.turnExpiresAt ?? "none"}-${
                  hasDisconnectedPlayers ? "paused" : "live"
                }`}
                serverTime={latestMatchState.serverTime}
                turnExpiresAt={latestMatchState.turnExpiresAt}
                isPaused={hasDisconnectedPlayers}
                secondsRemaining={latestMatchState?.turnSecondsRemaining ?? null}
              />
            </div>
          ) : null}
        </div>
      </SectionCard>

      <SectionCard>
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[color:var(--accent-deep)]">
          Duel Board
        </p>

        {latestMatchState ? (
          <>
            <div
              className={`mt-4 rounded-[1.6rem] border px-5 py-5 ${
                latestMatchState.status === "finished"
                  ? "border-emerald-200 bg-emerald-50/90"
                  : latestMatchState.status === "waiting"
                    ? "border-sky-200 bg-sky-50/90"
                    : "border-[color:var(--stroke)] bg-white/68"
              }`}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--accent-deep)]">
                Match State
              </p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight text-stone-950 sm:text-3xl">
                {lifecycleHeading}
              </h3>
              <p className="mt-2 text-sm leading-6 text-stone-700">
                {latestMatchState.status === "waiting"
                  ? "The room is open and waiting for the second player to join before the first turn starts."
                  : latestMatchState.status === "finished"
                    ? `${matchResult}. Jump straight into another ${currentMode} duel from here.`
                    : hasDisconnectedPlayers
                      ? "A player disconnected. The authoritative room is holding state while the reconnect window counts down."
                    : canPlay
                      ? "It is your turn. The board is live against the server-authoritative state."
                      : "The board is live. Wait for the next authoritative turn update."}
              </p>

              {hasDisconnectedPlayers ? (
                <div className="mt-4 rounded-[1.3rem] border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
                  <p className="font-medium">
                    Rejoin window active
                  </p>
                  <p className="mt-1 leading-6">
                    If the disconnected player does not return before the timer expires,
                    the backend will finalize the match automatically.
                  </p>
                  <div className="mt-3 grid gap-3">
                    {disconnectedEntries.map(([playerId, disconnectedAt]) => (
                      <div
                        key={playerId}
                        className="rounded-[1.1rem] border border-amber-200 bg-white/70 px-4 py-3"
                      >
                        {getPlayerLabel(playerId, userId)} reconnects in{" "}
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
                <div className="mt-4 rounded-[1.2rem] border border-sky-200 bg-sky-50 px-4 py-4 text-sm text-sky-900">
                  {isRouteJoinPending
                    ? "Rejoining the live room for this route."
                    : "This route is waiting to reconnect to the live room."}
                </div>
              ) : null}

              {latestMatchState.status === "finished" ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[1.2rem] border border-white/60 bg-white/70 px-4 py-4 text-sm text-stone-700">
                    Result: {matchResult}
                  </div>
                  <div className="rounded-[1.2rem] border border-white/60 bg-white/70 px-4 py-4 text-sm text-stone-700">
                    Winner: {getWinnerText(latestMatchState.winner, latestMatchState.status)}
                  </div>
                  <div className="rounded-[1.2rem] border border-white/60 bg-white/70 px-4 py-4 text-sm text-stone-700">
                    Duration: {finishedDuration}
                  </div>
                </div>
              ) : null}

              {latestMatchState.status === "finished" ? (
                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => handleNextMatch("find_match")}
                    disabled={isRequeuing}
                    className="rounded-full bg-[color:var(--accent)] px-5 py-3 text-sm font-medium text-white shadow-[0_14px_30px_rgba(189,86,38,0.24)] transition hover:-translate-y-0.5 hover:bg-[color:var(--accent-deep)] disabled:cursor-not-allowed disabled:bg-stone-300 disabled:shadow-none"
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
                    className="rounded-full border border-[color:var(--stroke-strong)] bg-white/75 px-5 py-3 text-sm font-medium text-stone-700 transition hover:-translate-y-0.5 hover:bg-white disabled:cursor-not-allowed disabled:border-stone-200 disabled:text-stone-400"
                  >
                    Back to Lobby
                  </button>
                </div>
              ) : null}

              {latestMatchState.status === "finished" ? (
                <p className="mt-4 text-sm leading-6 text-stone-600">
                  Use `Play Again` on both clients to jump into the next live round.
                  Creating a new room manually will open a separate duel.
                </p>
              ) : null}

              {matchActionError || (activeMatch?.matchId !== matchId ? joinRouteError : null) ? (
                <div className="mt-4 rounded-[1.2rem] border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
                  {matchActionError ?? joinRouteError}
                </div>
              ) : null}
            </div>

            <div className="mt-4">
              <GameBoard
                board={latestMatchState.board}
                canPlay={canPlay && !isAwaitingAuthoritativeUpdate && !isSubmittingMove}
                onSelectCell={handleMove}
                pendingPosition={isAwaitingAuthoritativeUpdate ? pendingPosition : null}
              />
            </div>

            <div className="mt-4 grid gap-3 text-sm leading-6 text-slate-700">
              <div className="rounded-[1.4rem] border border-[color:var(--stroke)] bg-white/68 px-4 py-4 text-stone-700">
                Status: {latestMatchState.status}
              </div>
              <div className="rounded-[1.4rem] border border-[color:var(--stroke)] bg-white/68 px-4 py-4 text-stone-700">
                Current turn: {latestMatchState.currentTurn ?? "None"}
              </div>
              <div className="rounded-[1.4rem] border border-[color:var(--stroke)] bg-white/68 px-4 py-4 text-stone-700">
                Winner:{" "}
                {getWinnerText(
                  latestMatchState.winner,
                  latestMatchState.status
                )}
              </div>
              <div className="rounded-[1.4rem] border border-[color:var(--stroke)] bg-white/68 px-4 py-4 text-stone-700">
                Move count: {latestMatchState.moveHistory.length}
              </div>
              {isTimedMatch ? (
                <div className="rounded-[1.4rem] border border-amber-200 bg-amber-50 px-4 py-4">
                  {hasDisconnectedPlayers
                    ? "Turn timer paused with "
                    : "Turn timer: "}
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
                <div className="rounded-[1.4rem] border border-amber-200 bg-amber-50 px-4 py-4">
                  Reconnect timeout: {latestMatchState.disconnectTimeoutSeconds}s
                </div>
              ) : null}
              <div className="rounded-[1.4rem] border border-[color:var(--stroke)] bg-white/68 px-4 py-4 text-stone-700">
                {canPlay
                  ? "Your turn. Pick an empty square."
                  : activeMatch?.matchId !== matchId && socketStatus === "connected"
                    ? isRouteJoinPending
                      ? "Joining this match route over the live socket."
                      : "This route is ready to rejoin the live room."
                  : socketStatus !== "connected"
                    ? "Socket disconnected. Waiting to reconnect before sending or receiving match state."
                  : hasDisconnectedPlayers
                    ? "Waiting for the disconnected player to rejoin before authoritative play can continue."
                  : latestMatchState.status === "waiting"
                    ? "Waiting for another player to join."
                    : latestMatchState.status === "finished"
                      ? "Match finished."
                      : "Waiting for the other player."}
              </div>
              {matchError || moveError ? (
                <div className="rounded-[1.4rem] border border-rose-200 bg-rose-50 px-4 py-4 text-rose-700">
                  {moveError ?? matchError}
                </div>
              ) : null}
            </div>

            <div className="mt-6">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--accent-deep)]">
                Turn Log
              </p>
              <div className="mt-3 grid gap-2">
                {latestMatchState.moveHistory.length > 0 ? (
                  latestMatchState.moveHistory.map((move, index) => (
                    <div
                      key={`${move.playerId}-${move.position}-${index}`}
                      className="rounded-[1.2rem] border border-[color:var(--stroke)] bg-white/70 px-4 py-3 text-sm text-stone-700"
                    >
                      Turn {index + 1}: {move.playerId === userId ? "You" : move.playerId}{" "}
                      played position {move.position}
                    </div>
                  ))
                ) : (
                  <div className="rounded-[1.2rem] border border-[color:var(--stroke)] bg-white/70 px-4 py-3 text-sm text-stone-600">
                    No moves yet.
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="mt-4 rounded-[1.4rem] border border-[color:var(--stroke)] bg-white/68 px-4 py-4 text-sm leading-6 text-stone-700">
            Waiting for authoritative state broadcast from the backend.
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={async () => {
              await leaveMatch();
              router.push("/play");
            }}
            className="rounded-full bg-[color:var(--accent)] px-5 py-3 text-sm font-medium text-white shadow-[0_14px_30px_rgba(189,86,38,0.24)] transition hover:-translate-y-0.5 hover:bg-[color:var(--accent-deep)]"
          >
            Leave Room
          </button>
          <Link
            href="/play"
            className="rounded-full border border-[color:var(--stroke-strong)] bg-white/75 px-5 py-3 text-sm font-medium text-stone-700 transition hover:-translate-y-0.5 hover:bg-white"
          >
            Back to Lobby
          </Link>
        </div>
      </SectionCard>
    </div>
  );
}
