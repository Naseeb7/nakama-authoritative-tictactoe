"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { useApp } from "@/components/providers/app-provider";
import { ChoiceCard } from "@/components/ui/choice-card";
import { PaperButton } from "@/components/ui/paper-primitives";
import { SectionCard } from "@/components/ui/section-card";
import { StatusPill } from "@/components/ui/status-pill";
import type { MatchMode } from "@/lib/match-types";

const modes = [
  {
    id: "classic",
    name: "Classic",
    description:
      "A calm, no-rush round for slow afternoons and cozy bragging rights.",
  },
  {
    id: "timed",
    name: "Rush",
    description:
      "A snappier round with a little timer tick to keep the game lively.",
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
    <div className="grid gap-6">
      <SectionCard className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(91,62,43,0.08),_transparent_26%),radial-gradient(circle_at_bottom_right,_rgba(214,164,93,0.12),_transparent_24%)]" />
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[color:var(--accent)]">
          Start here
        </p>
        <h2 className="paper-heading mt-3 text-3xl font-semibold tracking-tight text-[color:var(--foreground)] sm:text-4xl">
          Play now.
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[color:var(--ink-soft)] sm:text-base">
          Pick a pace, then jump straight into the next match.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          <StatusPill tone="cyan">Ready: {status}</StatusPill>
          <StatusPill>Pace: {selectedMode}</StatusPill>
          <StatusPill tone="fuchsia">Signal: {socketStatus}</StatusPill>
        </div>

        <div className="mt-7 flex flex-col gap-4 rounded-[1.6rem] border border-[rgba(95,71,48,0.16)] bg-[rgba(255,250,244,0.88)] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--accent-deep)]">
              Quick start
            </p>
            <p className="mt-2 text-lg font-semibold text-[color:var(--foreground)]">
              Start a game with the selected pace.
            </p>
            <p className="mt-1 max-w-xl text-sm leading-6 text-[color:var(--ink-soft)]">
              We will place you into the next available {selectedMode} match.
            </p>
          </div>
          <PaperButton
            type="button"
            variant="secondary"
            size="lg"
            onClick={() => handleMatchRequest("find_match")}
            disabled={isPending || joinStatus === "working" || status !== "ready"}
          >
            {isPending || joinStatus === "working" ? "Heading in..." : "Start game"}
          </PaperButton>
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

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <PaperButton
            type="button"
            variant="primary"
            size="lg"
            onClick={() => handleMatchRequest("create_match")}
            disabled={isPending || joinStatus === "working" || status !== "ready"}
          >
            Open a fresh table
          </PaperButton>
          <p className="text-sm text-[color:var(--ink-soft)]">
            Only use this if you want your own room instead of joining the next
            open match.
          </p>
        </div>

        {matchError ? (
          <div className="mt-6 rounded-[1.35rem] border border-[rgba(91,62,43,0.28)] bg-[rgba(238,224,208,0.92)] px-4 py-4 text-sm text-[color:var(--accent)]">
            {matchError}
          </div>
        ) : null}
      </SectionCard>

      {activeMatch ? (
        <SectionCard className="border-[rgba(91,62,43,0.18)] bg-[rgba(255,250,244,0.92)]">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[color:var(--accent-deep)]">
            Already in a match
          </p>
          <p className="mt-3 text-sm leading-7 text-[color:var(--ink-soft)]">
            You are in {activeMatch.mode} mode with {activeMatch.presences.length} player
            slot(s) filled.
          </p>
          <PaperButton
            type="button"
            variant="secondary"
            onClick={() =>
              router.push(`/match/${encodeURIComponent(activeMatch.matchId)}`)
            }
            className="mt-6 inline-flex"
          >
            Go back to your game
          </PaperButton>
        </SectionCard>
      ) : null}
    </div>
  );
}
