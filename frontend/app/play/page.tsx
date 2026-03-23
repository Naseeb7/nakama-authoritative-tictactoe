import Link from "next/link";

import { SectionCard } from "@/components/ui/section-card";

const modes = [
  {
    name: "Classic",
    description: "Standard authoritative tic-tac-toe with turn validation and win detection.",
  },
  {
    name: "Timed",
    description: "Adds the backend turn timer, reconnect pausing, and timeout forfeits.",
  },
];

export default function PlayPage() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <SectionCard>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
          Match Entry
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
          Matchmaking foundation is ready.
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
          This route is the Phase 1 placeholder for create-match and find-match
          flows. The auth session and socket lifecycle are already bootstrapped,
          so the next step is wiring the actual RPC calls and match join flow.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {modes.map((mode) => (
            <div
              key={mode.name}
              className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4"
            >
              <h3 className="text-lg font-semibold text-slate-900">
                {mode.name}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {mode.description}
              </p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard className="bg-slate-950 text-slate-50">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
          Next Route
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight">
          Match room placeholder
        </h2>
        <p className="mt-3 text-sm leading-7 text-slate-300">
          The dynamic route already exists so gameplay UI can land without
          another routing refactor.
        </p>
        <Link
          href="/match/sample-room"
          className="mt-6 inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium transition hover:bg-white/15"
        >
          Open sample match route
        </Link>
      </SectionCard>
    </div>
  );
}
