"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { useApp } from "@/components/providers/app-provider";
import { ChoiceCard } from "@/components/ui/choice-card";
import { SectionCard } from "@/components/ui/section-card";
import { StatusPill } from "@/components/ui/status-pill";
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
  const {
    activeMatch,
    clearMatchError,
    joinStatus,
    matchError,
    requestMatch,
    socketStatus,
    status,
  } = useApp();
  const [selectedMode, setSelectedMode] = useState<MatchMode>("classic");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    clearMatchError();
  }, [clearMatchError]);

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
          Start here
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Find a live game or open your own room.
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[color:var(--ink-soft)] sm:text-base">
          The default path is simple: pick a mode and press the main play
          button. Create a room only when you want to start a fresh match
          yourself.
        </p>
        <div className="mt-5 flex flex-wrap gap-2 text-xs uppercase tracking-[0.22em]">
          <StatusPill tone="cyan">Game {status}</StatusPill>
          <StatusPill tone="fuchsia">Live {socketStatus}</StatusPill>
          <StatusPill>Mode {selectedMode}</StatusPill>
          <StatusPill>Queue {isPending ? "working" : joinStatus}</StatusPill>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {modes.map((mode) => (
            <ChoiceCard
              key={mode.id}
              onClick={() => setSelectedMode(mode.id)}
              accent={mode.id === "timed" ? "fuchsia" : "cyan"}
              isActive={selectedMode === mode.id}
              title={mode.name}
              description={mode.description}
            />
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => handleMatchRequest("find_match")}
            disabled={isPending || joinStatus === "working" || status !== "ready"}
            className="rounded-full border border-cyan-400/40 bg-cyan-400/12 px-6 py-3 text-sm font-semibold text-cyan-100 shadow-[0_0_22px_rgba(0,183,255,0.14)] transition hover:-translate-y-0.5 hover:bg-cyan-400/18 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-800 disabled:text-slate-500 disabled:shadow-none"
          >
            Find match now
          </button>
          <button
            type="button"
            onClick={() => handleMatchRequest("create_match")}
            disabled={isPending || joinStatus === "working" || status !== "ready"}
            className="rounded-full border border-fuchsia-400/35 bg-fuchsia-500/10 px-5 py-3 text-sm font-medium text-fuchsia-100 transition hover:-translate-y-0.5 hover:bg-fuchsia-500/16 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-800 disabled:text-slate-500"
          >
            Create private room
          </button>
        </div>

        <p className="mt-4 text-sm leading-6 text-slate-400">
          `Find match now` is the normal play path. Use `Create private room`
          when you specifically want a brand-new room.
        </p>

        {matchError ? (
          <div className="mt-6 rounded-[1.35rem] border border-rose-400/30 bg-rose-500/10 px-4 py-4 text-sm text-rose-200">
            {matchError}
          </div>
        ) : null}
      </SectionCard>

      <SectionCard className="bg-[linear-gradient(180deg,_rgba(8,12,28,0.96),_rgba(13,19,43,0.92))] text-slate-50">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-fuchsia-300">
          What happens next
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          {activeMatch ? "You already have a live room" : "One clear route to play"}
        </h2>
        <p className="mt-3 text-sm leading-7 text-slate-300">
          {activeMatch
            ? `You are in ${activeMatch.mode} mode with ${activeMatch.presences.length} player slot(s) filled.`
            : "Pick a mode, press the main play button, and the app will join the next open room for you."}
        </p>
        <div className="mt-6 grid gap-3">
          <div className="rounded-[1.35rem] border border-cyan-400/18 bg-slate-950/70 px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-300">
              Default path
            </p>
            <p className="mt-2 text-sm text-slate-200">
              `Find match now` looks for a room that already needs one more player.
            </p>
          </div>
          <div className="rounded-[1.35rem] border border-fuchsia-400/18 bg-slate-950/70 px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.24em] text-fuchsia-300">
              Alternate path
            </p>
            <p className="mt-2 text-sm text-slate-200">
              `Create private room` starts a new room first and then joins it.
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
