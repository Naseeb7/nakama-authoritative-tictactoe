"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo } from "react";

import { useApp } from "@/components/providers/app-provider";
import { SectionCard } from "@/components/ui/section-card";

export default function MatchRoomPage() {
  const params = useParams<{ matchId: string }>();
  const router = useRouter();
  const { activeMatch, latestMatchState, leaveMatch, userId, username } = useApp();
  const matchId = params.matchId;
  const assignedSymbol = useMemo(() => {
    if (!latestMatchState || !userId) {
      return null;
    }

    return latestMatchState.symbols[userId] ?? null;
  }, [latestMatchState, userId]);

  return (
    <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
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
        </div>
      </SectionCard>

      <SectionCard>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
          Live Match Snapshot
        </p>
        {latestMatchState ? (
          <>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {latestMatchState.board.map((cell, index) => (
                <div
                  key={`${index}-${cell}`}
                  className="flex aspect-square items-center justify-center rounded-[1.2rem] border border-slate-200 bg-slate-50 text-3xl font-semibold text-slate-900"
                >
                  {cell || ""}
                </div>
              ))}
            </div>

            <div className="mt-4 grid gap-3 text-sm leading-6 text-slate-700">
              <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 px-4 py-4">
                Status: {latestMatchState.status}
              </div>
              <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 px-4 py-4">
                Current turn: {latestMatchState.currentTurn ?? "None"}
              </div>
              <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 px-4 py-4">
                Winner: {latestMatchState.winner ?? "Pending"}
              </div>
              <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 px-4 py-4">
                Players: {latestMatchState.players.length}
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
