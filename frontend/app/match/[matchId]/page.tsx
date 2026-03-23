"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { GameBoard } from "@/components/match/game-board";
import { useApp } from "@/components/providers/app-provider";
import { SectionCard } from "@/components/ui/section-card";

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

export default function MatchRoomPage() {
  const params = useParams<{ matchId: string }>();
  const router = useRouter();
  const {
    activeMatch,
    latestMatchState,
    leaveMatch,
    matchError,
    sendMove,
    socketStatus,
    userId,
    username,
  } = useApp();
  const [pendingPosition, setPendingPosition] = useState<number | null>(null);
  const [pendingMoveCount, setPendingMoveCount] = useState<number | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [isSubmittingMove, setIsSubmittingMove] = useState(false);
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

  return (
    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <SectionCard className="bg-slate-950 text-slate-50">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
          Match Room
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight">
          {matchId}
        </h2>
        <p className="mt-3 text-sm leading-7 text-slate-300 sm:text-base">
          {activeMatch?.matchId === matchId
            ? "This room is connected to the active authoritative match session."
            : "This route is ready, but the current client session is not joined to this match id."}
        </p>

        <div className="mt-6 grid gap-3 text-sm text-slate-300">
          <div className="rounded-[1.4rem] border border-white/10 bg-white/5 px-4 py-4">
            Player: {username ?? "Unknown"}
          </div>
          <div className="rounded-[1.4rem] border border-white/10 bg-white/5 px-4 py-4">
            Symbol: {assignedSymbol ?? "Pending"}
          </div>
          <div className="rounded-[1.4rem] border border-white/10 bg-white/5 px-4 py-4">
            Mode: {activeMatch?.mode ?? "Unknown"}
          </div>
          <div className="rounded-[1.4rem] border border-white/10 bg-white/5 px-4 py-4">
            Result: {matchResult}
          </div>
        </div>
      </SectionCard>

      <SectionCard>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
          Authoritative Board
        </p>

        {latestMatchState ? (
          <>
            <div className="mt-4">
              <GameBoard
                board={latestMatchState.board}
                canPlay={canPlay && !isAwaitingAuthoritativeUpdate && !isSubmittingMove}
                onSelectCell={handleMove}
                pendingPosition={isAwaitingAuthoritativeUpdate ? pendingPosition : null}
              />
            </div>

            <div className="mt-4 grid gap-3 text-sm leading-6 text-slate-700">
              <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 px-4 py-4">
                Status: {latestMatchState.status}
              </div>
              <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 px-4 py-4">
                Current turn: {latestMatchState.currentTurn ?? "None"}
              </div>
              <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 px-4 py-4">
                Winner:{" "}
                {getWinnerText(
                  latestMatchState.winner,
                  latestMatchState.status
                )}
              </div>
              <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 px-4 py-4">
                Move count: {latestMatchState.moveHistory.length}
              </div>
              <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 px-4 py-4">
                {canPlay
                  ? "Your turn. Pick an empty square."
                  : socketStatus !== "connected"
                    ? "Socket disconnected. Reconnect before sending moves."
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
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                Move History
              </p>
              <div className="mt-3 grid gap-2">
                {latestMatchState.moveHistory.length > 0 ? (
                  latestMatchState.moveHistory.map((move, index) => (
                    <div
                      key={`${move.playerId}-${move.position}-${index}`}
                      className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
                    >
                      Turn {index + 1}: {move.playerId} played position{" "}
                      {move.position}
                    </div>
                  ))
                ) : (
                  <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    No moves yet.
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="mt-4 rounded-[1.4rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-700">
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
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Leave Match
          </button>
          <Link
            href="/play"
            className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Back to matchmaking
          </Link>
        </div>
      </SectionCard>
    </div>
  );
}
