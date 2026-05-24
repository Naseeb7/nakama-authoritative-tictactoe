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

        <div className="mt-8 rounded-[1.6rem] border border-[rgba(95,71,48,0.16)] bg-[rgba(255,250,244,0.88)] p-5 shadow-[0_18px_30px_rgba(78,54,35,0.1)]">
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
            <button
              type="button"
              onClick={() => handleMatchRequest("find_match")}
              disabled={isPending || joinStatus === "working" || status !== "ready"}
              className="rounded-full border border-[rgba(95,71,48,0.22)] bg-[linear-gradient(180deg,rgba(255,248,241,0.98),rgba(241,224,203,0.96))] px-6 py-3 text-sm font-semibold text-[color:var(--foreground)] shadow-[0_12px_22px_rgba(78,54,35,0.12)] transition hover:-translate-y-0.5 hover:border-[rgba(185,90,66,0.3)] hover:text-[color:var(--accent)] disabled:cursor-not-allowed disabled:border-[rgba(95,71,48,0.12)] disabled:bg-[rgba(250,246,239,0.75)] disabled:text-[rgba(107,91,77,0.6)] disabled:shadow-none"
            >
              {isPending || joinStatus === "working" ? "Joining..." : "Start game"}
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => handleMatchRequest("create_match")}
            disabled={isPending || joinStatus === "working" || status !== "ready"}
            className="rounded-full border border-[rgba(185,90,66,0.22)] bg-[rgba(248,226,219,0.92)] px-5 py-3 text-sm font-medium text-[color:var(--accent)] transition hover:-translate-y-0.5 hover:bg-[rgba(243,214,203,0.98)] disabled:cursor-not-allowed disabled:border-[rgba(95,71,48,0.12)] disabled:bg-[rgba(250,246,239,0.75)] disabled:text-[rgba(107,91,77,0.6)]"
          >
            Start a new room
          </button>
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
          <button
            type="button"
            onClick={() =>
              router.push(`/match/${encodeURIComponent(activeMatch.matchId)}`)
            }
            className="mt-6 inline-flex rounded-full border border-[rgba(95,71,48,0.18)] bg-[rgba(255,250,243,0.92)] px-4 py-2 text-sm font-medium text-[color:var(--accent-deep)] transition hover:-translate-y-0.5 hover:bg-[rgba(249,240,227,0.98)]"
          >
            Go back to your game
          </button>
        ) : null}
      </SectionCard>
    </div>
  );
}
