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
      "Straight-up play with no clock. Just you, your rival, and the board.",
  },
  {
    id: "timed",
    name: "Rush",
    description:
      "A faster mode with a ticking clock on every turn.",
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
    <div className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
      <SectionCard className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(0,183,255,0.12),_transparent_26%),radial-gradient(circle_at_bottom_right,_rgba(255,79,216,0.12),_transparent_24%)]" />
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-300">
          Play Now
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Queue up and drop straight into the arena.
        </h2>
        <div className="mt-5 flex flex-wrap gap-2 text-xs uppercase tracking-[0.22em]">
          <span className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-2 text-cyan-200">
            Game {status}
          </span>
          <span className="rounded-full border border-fuchsia-400/25 bg-fuchsia-500/10 px-3 py-2 text-fuchsia-200">
            Live {socketStatus}
          </span>
          <span className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-2 text-slate-300">
            Mode {selectedMode}
          </span>
          <span className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-2 text-slate-300">
            Queue {isPending ? "working" : joinStatus}
          </span>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {modes.map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => setSelectedMode(mode.id)}
              className={`rounded-[1.5rem] border p-4 text-left transition ${
                selectedMode === mode.id
                  ? mode.id === "timed"
                    ? "border-fuchsia-400/45 bg-fuchsia-500/12 text-white shadow-[0_0_28px_rgba(255,79,216,0.14)]"
                    : "border-cyan-400/45 bg-cyan-400/12 text-white shadow-[0_0_28px_rgba(0,183,255,0.14)]"
                  : "border-slate-800 bg-slate-950/70 text-slate-100 hover:-translate-y-0.5 hover:border-cyan-400/30 hover:bg-slate-950"
              }`}
            >
              <h3 className="text-lg font-semibold tracking-tight text-inherit">
                {mode.name}
              </h3>
              <p
                className={`mt-2 text-sm leading-6 ${
                  selectedMode === mode.id ? "text-slate-200" : "text-[color:var(--ink-soft)]"
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
            className="rounded-full border border-cyan-400/40 bg-cyan-400/12 px-5 py-3 text-sm font-medium text-cyan-100 shadow-[0_0_22px_rgba(0,183,255,0.14)] transition hover:-translate-y-0.5 hover:bg-cyan-400/18 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-800 disabled:text-slate-500 disabled:shadow-none"
          >
            Join Queue
          </button>
          <button
            type="button"
            onClick={() => handleMatchRequest("create_match")}
            disabled={isPending || joinStatus === "working" || status !== "ready"}
            className="rounded-full border border-fuchsia-400/35 bg-fuchsia-500/10 px-5 py-3 text-sm font-medium text-fuchsia-100 transition hover:-translate-y-0.5 hover:bg-fuchsia-500/16 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-800 disabled:text-slate-500"
          >
            Create Room
          </button>
        </div>

        {matchError ? (
          <div className="mt-6 rounded-[1.35rem] border border-rose-400/30 bg-rose-500/10 px-4 py-4 text-sm text-rose-200">
            {matchError}
          </div>
        ) : null}
      </SectionCard>

      <SectionCard className="bg-[linear-gradient(180deg,_rgba(8,12,28,0.96),_rgba(13,19,43,0.92))] text-slate-50">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-fuchsia-300">
          Next Up
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          {activeMatch ? activeMatch.matchId : "No room joined"}
        </h2>
        <p className="mt-3 text-sm leading-7 text-slate-300">
          {activeMatch
            ? `You are in ${activeMatch.mode} mode with ${activeMatch.presences.length} player slot(s) filled.`
            : "No game locked in yet. Join the queue or create your own room to begin."}
        </p>
        <div className="mt-6 grid gap-3">
          <div className="rounded-[1.35rem] border border-cyan-400/18 bg-slate-950/70 px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-300">
              Queue
            </p>
            <p className="mt-2 text-sm text-slate-200">
              Finds a game that is already waiting for one more player.
            </p>
          </div>
          <div className="rounded-[1.35rem] border border-fuchsia-400/18 bg-slate-950/70 px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.24em] text-fuchsia-300">
              Private Room
            </p>
            <p className="mt-2 text-sm text-slate-200">
              Starts a brand-new game just for this match.
            </p>
          </div>
        </div>
        {activeMatch ? (
          <button
            type="button"
            onClick={() =>
              router.push(`/match/${encodeURIComponent(activeMatch.matchId)}`)
            }
            className="mt-6 inline-flex rounded-full border border-cyan-400/35 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-100 transition hover:-translate-y-0.5 hover:bg-cyan-400/16"
          >
            Enter Room
          </button>
        ) : null}
      </SectionCard>
    </div>
  );
}
