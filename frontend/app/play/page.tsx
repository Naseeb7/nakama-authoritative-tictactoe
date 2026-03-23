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
      "Pure head-to-head play with clean turn validation and instant win checks.",
  },
  {
    id: "timed",
    name: "Rush",
    description:
      "Adds turn pressure, pause-on-disconnect handling, and timeout victories.",
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
      <SectionCard>
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[color:var(--accent-deep)]">
          Play Now
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">
          Choose how the next duel begins.
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[color:var(--ink-soft)] sm:text-base">
          Match into an open room or spin up a fresh one. Once the server
          responds, Lila joins the room immediately and drops you into the live board.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {modes.map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => setSelectedMode(mode.id)}
              className={`rounded-[1.5rem] border p-4 text-left transition ${
                selectedMode === mode.id
                  ? "border-[color:var(--accent-deep)] bg-[linear-gradient(180deg,_rgba(189,86,38,0.96),_rgba(142,52,16,0.98))] text-white shadow-[0_16px_34px_rgba(189,86,38,0.24)]"
                  : "border-[color:var(--stroke)] bg-white/70 text-stone-900 hover:-translate-y-0.5 hover:border-[color:var(--stroke-strong)] hover:bg-white"
              }`}
            >
              <h3 className="text-lg font-semibold tracking-tight text-inherit">
                {mode.name}
              </h3>
              <p
                className={`mt-2 text-sm leading-6 ${
                  selectedMode === mode.id ? "text-orange-100" : "text-[color:var(--ink-soft)]"
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
            className="rounded-full bg-[color:var(--accent)] px-5 py-3 text-sm font-medium text-white shadow-[0_14px_30px_rgba(189,86,38,0.24)] transition hover:-translate-y-0.5 hover:bg-[color:var(--accent-deep)] disabled:cursor-not-allowed disabled:bg-stone-300 disabled:shadow-none"
          >
            Join Queue
          </button>
          <button
            type="button"
            onClick={() => handleMatchRequest("create_match")}
            disabled={isPending || joinStatus === "working" || status !== "ready"}
            className="rounded-full border border-[color:var(--stroke-strong)] bg-white/75 px-5 py-3 text-sm font-medium text-stone-700 transition hover:-translate-y-0.5 hover:bg-white disabled:cursor-not-allowed disabled:border-stone-200 disabled:text-stone-400"
          >
            Create Room
          </button>
        </div>

        <div className="mt-6 rounded-[1.5rem] border border-[color:var(--stroke)] bg-white/65 px-4 py-4 text-sm leading-6 text-stone-700">
          <p>Connection: {status}</p>
          <p>Live socket: {socketStatus}</p>
          <p>Selected mode: {selectedMode}</p>
          <p>Queue status: {isPending ? "working" : joinStatus}</p>
          {matchError ? <p className="mt-2 text-rose-700">{matchError}</p> : null}
        </div>
      </SectionCard>

      <SectionCard className="bg-[linear-gradient(180deg,_rgba(37,25,19,0.98),_rgba(73,47,32,0.94))] text-stone-50">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-stone-400">
          Current Room
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
          {activeMatch ? activeMatch.matchId : "No room joined"}
        </h2>
        <p className="mt-3 text-sm leading-7 text-stone-300">
          {activeMatch
            ? `You are in ${activeMatch.mode} mode with ${activeMatch.presences.length} visible player presence(s).`
            : "Once you join a room, this panel will track the match you are currently connected to."}
        </p>
        <div className="mt-6 grid gap-3">
          <div className="rounded-[1.4rem] border border-white/10 bg-white/6 px-4 py-4 text-sm text-stone-200">
            `Join Queue` reuses a waiting room when one is already open.
          </div>
          <div className="rounded-[1.4rem] border border-white/10 bg-white/6 px-4 py-4 text-sm text-stone-200">
            `Create Room` always opens a separate private room id.
          </div>
        </div>
        {activeMatch ? (
          <button
            type="button"
            onClick={() =>
              router.push(`/match/${encodeURIComponent(activeMatch.matchId)}`)
            }
            className="mt-6 inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5 hover:bg-white/15"
          >
            Enter Room
          </button>
        ) : null}
      </SectionCard>
    </div>
  );
}
