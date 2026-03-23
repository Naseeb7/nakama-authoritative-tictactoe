import Link from "next/link";

import { SectionCard } from "@/components/ui/section-card";

const foundationItems = [
  {
    title: "Realtime Matchmaking",
    body: "Queue into a room instantly through the authoritative RPC flow.",
  },
  {
    title: "Server-Owned Turns",
    body: "The backend validates every move and broadcasts the canonical board.",
  },
  {
    title: "Timed Pressure",
    body: "Switch into timed mode for countdown-driven matches and timeout wins.",
  },
  {
    title: "Recovery Built In",
    body: "Disconnect windows and route rejoin support keep matches recoverable.",
  },
];

export default function Home() {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.18fr_0.82fr]">
      <SectionCard className="relative overflow-hidden">
        <div className="pointer-events-none absolute right-[-3rem] top-[-3rem] h-40 w-40 rounded-full bg-[radial-gradient(circle,_rgba(240,195,171,0.8),_transparent_70%)]" />
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[color:var(--accent-deep)]">
          Lila: Grid Duel
        </p>
        <h2 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-stone-950 sm:text-5xl lg:text-6xl">
          A quick strategy duel with zero guesswork.
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[color:var(--ink-soft)] sm:text-base">
          Jump into a head-to-head tic-tac-toe match where the board state,
          turn order, timers, and reconnect rules are all enforced on the
          server. Clean rounds, fair outcomes, fast rematches.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/play"
            className="rounded-full bg-[color:var(--accent)] px-5 py-3 text-sm font-medium text-white shadow-[0_14px_30px_rgba(189,86,38,0.28)] transition hover:-translate-y-0.5 hover:bg-[color:var(--accent-deep)]"
          >
            Start a Match
          </Link>
          <Link
            href="/leaderboard"
            className="rounded-full border border-[color:var(--stroke-strong)] bg-white/75 px-5 py-3 text-sm font-medium text-stone-700 transition hover:-translate-y-0.5 hover:bg-white"
          >
            Enter the Hall of Fame
          </Link>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <div className="rounded-[1.5rem] border border-[color:var(--stroke)] bg-white/68 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--accent-deep)]">
              Modes
            </p>
            <p className="mt-2 text-2xl font-semibold text-stone-950">2</p>
            <p className="mt-1 text-sm text-[color:var(--ink-soft)]">Classic play and timed showdowns.</p>
          </div>
          <div className="rounded-[1.5rem] border border-[color:var(--stroke)] bg-white/68 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--accent-deep)]">
              Sync
            </p>
            <p className="mt-2 text-2xl font-semibold text-stone-950">1 source</p>
            <p className="mt-1 text-sm text-[color:var(--ink-soft)]">One authoritative board for both players.</p>
          </div>
          <div className="rounded-[1.5rem] border border-[color:var(--stroke)] bg-white/68 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--accent-deep)]">
              Rejoin
            </p>
            <p className="mt-2 text-2xl font-semibold text-stone-950">30 sec</p>
            <p className="mt-1 text-sm text-[color:var(--ink-soft)]">Recovery window before a dropped player forfeits.</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard className="bg-[linear-gradient(180deg,_rgba(37,25,19,0.98),_rgba(73,47,32,0.94))] text-stone-50">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-stone-400">
          Live Features
        </p>
        <div className="mt-5 grid gap-3">
          {foundationItems.map((item) => (
            <div
              key={item.title}
              className="rounded-[1.5rem] border border-white/10 bg-white/6 px-4 py-4"
            >
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-200">
                {item.title}
              </p>
              <p className="mt-2 text-sm leading-6 text-stone-300">
                {item.body}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-[1.6rem] border border-white/10 bg-white/6 px-5 py-5">
          <p className="text-xs uppercase tracking-[0.24em] text-stone-400">
            Why Lila works
          </p>
          <p className="mt-3 text-sm leading-7 text-stone-300">
            It keeps the rules honest. The server resolves every move, the room
            stays synchronized, and the interface stays focused on momentum
            instead of setup friction.
          </p>
        </div>
      </SectionCard>
    </div>
  );
}
