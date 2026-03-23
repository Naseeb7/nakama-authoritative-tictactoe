"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { useApp } from "@/components/providers/app-provider";
import { SectionCard } from "@/components/ui/section-card";
import type { MatchMode } from "@/lib/match-types";

const modes = [
  {
    id: "classic",
    name: "Classic",
    description:
      "Standard authoritative tic-tac-toe with turn validation and win detection.",
  },
  {
    id: "timed",
    name: "Timed",
    description:
      "Adds the backend turn timer, reconnect pausing, and timeout forfeits.",
  },
] as const satisfies Array<{
  description: string;
  id: MatchMode;
  name: string;
}>;

export default function PlayPage() {
  const router = useRouter();
  const { activeMatch, joinStatus, matchError, requestMatch, socketStatus, status } =
    useApp();
  const [selectedMode, setSelectedMode] = useState<MatchMode>("classic");
  const [isPending, startTransition] = useTransition();

  function handleMatchRequest(action: "create_match" | "find_match") {
    startTransition(async () => {
      try {
        const matchId = await requestMatch(action, selectedMode);
        router.push(`/match/${encodeURIComponent(matchId)}`);
      } catch {
        return;
      }
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <SectionCard>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
          Match Entry
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
          Matchmaking is wired to the backend.
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
          This screen now calls the authoritative backend RPCs, joins the
          returned match over the realtime socket, and sends you into the match
          room route with the active match session cached locally.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {modes.map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => setSelectedMode(mode.id)}
              className={`rounded-[1.5rem] border p-4 text-left transition ${
                selectedMode === mode.id
                  ? "border-slate-950 bg-slate-950 text-slate-50"
                  : "border-slate-200 bg-slate-50 text-slate-900 hover:border-slate-300"
              }`}
            >
              <h3 className="text-lg font-semibold text-inherit">
                {mode.name}
              </h3>
              <p
                className={`mt-2 text-sm leading-6 ${
                  selectedMode === mode.id ? "text-slate-300" : "text-slate-600"
                }`}
              >
                {mode.description}
              </p>
            </button>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => handleMatchRequest("find_match")}
            disabled={isPending || joinStatus === "working" || status !== "ready"}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            Find Match
          </button>
          <button
            type="button"
            onClick={() => handleMatchRequest("create_match")}
            disabled={isPending || joinStatus === "working" || status !== "ready"}
            className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
          >
            Create Match
          </button>
        </div>

        <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-700">
          <p>App status: {status}</p>
          <p>Socket: {socketStatus}</p>
          <p>Selected mode: {selectedMode}</p>
          <p>Join state: {isPending ? "working" : joinStatus}</p>
          {matchError ? <p className="mt-2 text-rose-600">{matchError}</p> : null}
        </div>
      </SectionCard>

      <SectionCard className="bg-slate-950 text-slate-50">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
          Active Session
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight">
          {activeMatch ? activeMatch.matchId : "No active match"}
        </h2>
        <p className="mt-3 text-sm leading-7 text-slate-300">
          {activeMatch
            ? `Joined in ${activeMatch.mode} mode with ${activeMatch.presences.length} visible presence(s).`
            : "Once you create or find a match, this panel will reflect the current joined session."}
        </p>
        {activeMatch ? (
          <button
            type="button"
            onClick={() =>
              router.push(`/match/${encodeURIComponent(activeMatch.matchId)}`)
            }
            className="mt-6 inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium transition hover:bg-white/15"
          >
            Open current match
          </button>
        ) : null}
      </SectionCard>
    </div>
  );
}
