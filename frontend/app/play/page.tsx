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
    <div className="grid gap-6 xl:grid-cols-[1.18fr_0.82fr]">
      <SectionCard className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(185,90,66,0.08),_transparent_26%),radial-gradient(circle_at_bottom_right,_rgba(214,164,93,0.12),_transparent_24%)]" />
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[color:var(--accent)]">
          Start here
        </p>
        <h2 className="paper-heading mt-3 text-3xl font-semibold tracking-tight text-[color:var(--foreground)] sm:text-4xl">
          Choose how you want to play.
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[color:var(--ink-soft)] sm:text-base">
          Pick your preferred style, then start a game. You can jump into the
          next available match, or open a fresh room if you want to wait there.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          <StatusPill tone="cyan">Ready: {status}</StatusPill>
          <StatusPill tone="fuchsia">Socket: {socketStatus}</StatusPill>
          <StatusPill>Mode: {selectedMode}</StatusPill>
        </div>

        <div className="mt-7 grid gap-4 sm:grid-cols-2">
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

        <div className="mt-8 rounded-[1.6rem] border border-[rgba(95,71,48,0.16)] bg-[rgba(255,250,244,0.88)] p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--accent-deep)]">
            Quick start
          </p>
          <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-lg font-semibold text-[color:var(--foreground)]">
                Find me a game
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
              {isPending || joinStatus === "working" ? "Joining..." : "Start game"}
            </PaperButton>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <PaperButton
            type="button"
            variant="primary"
            size="lg"
            onClick={() => handleMatchRequest("create_match")}
            disabled={isPending || joinStatus === "working" || status !== "ready"}
          >
            Start a new room
          </PaperButton>
          <p className="self-center text-sm text-[color:var(--ink-soft)]">
            Use this if you want to open your own room first.
          </p>
        </div>

        {matchError ? (
          <div className="mt-6 rounded-[1.35rem] border border-[rgba(185,90,66,0.28)] bg-[rgba(248,226,219,0.92)] px-4 py-4 text-sm text-[color:var(--accent)]">
            {matchError}
          </div>
        ) : null}
      </SectionCard>

      <SectionCard>
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[color:var(--accent-deep)]">
          Need help choosing?
        </p>
        <h2 className="paper-heading mt-3 text-2xl font-semibold tracking-tight text-[color:var(--foreground)] sm:text-3xl">
          {activeMatch ? "You already have a game open" : "Two simple ways to start"}
        </h2>
        <p className="mt-3 text-sm leading-7 text-[color:var(--ink-soft)]">
          {activeMatch
            ? `You are in ${activeMatch.mode} mode with ${activeMatch.presences.length} player slot(s) filled.`
            : "Pick the option that matches what you want to do next."}
        </p>
        <div className="mt-6 grid gap-3">
          <div className="rounded-[1.35rem] border border-[rgba(95,71,48,0.16)] bg-[rgba(255,250,244,0.88)] px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--accent)]">
              Start game
            </p>
            <p className="mt-2 text-sm text-[color:var(--foreground)]">
              Best when you just want to play right away.
            </p>
          </div>
          <div className="rounded-[1.35rem] border border-[rgba(185,90,66,0.16)] bg-[rgba(255,245,239,0.88)] px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--accent-deep)]">
              Start a new room
            </p>
            <p className="mt-2 text-sm text-[color:var(--foreground)]">
              Best when you want to open a fresh room and wait there.
            </p>
          </div>
        </div>
        {activeMatch ? (
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
        ) : null}
      </SectionCard>
    </div>
  );
}
