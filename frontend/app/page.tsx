import Link from "next/link";

import { SectionCard } from "@/components/ui/section-card";

const foundationItems = [
  {
    title: "Fast Matchups",
    body: "Jump into a game fast or start a fresh round right away.",
  },
  {
    title: "Fair Turns",
    body: "Both players see the same board and the same result.",
  },
  {
    title: "Rush Mode",
    body: "Add a clock when you want faster, sharper rounds.",
  },
];

export default function Home() {
  return (
    <div className="grid items-start gap-6 xl:grid-cols-[1.18fr_0.82fr]">
      <SectionCard className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(0,183,255,0.16),_transparent_28%),radial-gradient(circle_at_20%_80%,_rgba(255,79,216,0.12),_transparent_22%)]" />
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-300">
          PulseGrid
        </p>
        <h2 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
          Read the board. Own the lane. Win the grid.
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[color:var(--ink-soft)] sm:text-base">
          PulseGrid turns tic-tac-toe into a quick head-to-head duel. Step in,
          make your move, and run it back.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/play"
            className="rounded-full border border-cyan-400/40 bg-cyan-400/12 px-5 py-3 text-sm font-medium text-cyan-100 shadow-[0_0_26px_rgba(0,183,255,0.16)] transition hover:-translate-y-0.5 hover:bg-cyan-400/18"
          >
            Start a Match
          </Link>
          <Link
            href="/leaderboard"
            className="rounded-full border border-fuchsia-400/35 bg-fuchsia-500/10 px-5 py-3 text-sm font-medium text-fuchsia-100 transition hover:-translate-y-0.5 hover:bg-fuchsia-500/16"
          >
            Enter the Hall of Fame
          </Link>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <div className="rounded-[1.5rem] border border-cyan-400/18 bg-slate-950/55 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-300">
              Modes
            </p>
            <p className="mt-2 text-2xl font-semibold text-white">2</p>
            <p className="mt-1 text-sm text-[color:var(--ink-soft)]">Classic play or a timed showdown.</p>
          </div>
          <div className="rounded-[1.5rem] border border-cyan-400/18 bg-slate-950/55 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-300">
              Board
            </p>
            <p className="mt-2 text-2xl font-semibold text-white">1 source</p>
            <p className="mt-1 text-sm text-[color:var(--ink-soft)]">One shared board for both players.</p>
          </div>
          <div className="rounded-[1.5rem] border border-cyan-400/18 bg-slate-950/55 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-300">
              Rejoin
            </p>
            <p className="mt-2 text-2xl font-semibold text-white">30 sec</p>
            <p className="mt-1 text-sm text-[color:var(--ink-soft)]">A short window to jump back into the game.</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard className="self-start bg-[linear-gradient(180deg,_rgba(8,12,28,0.96),_rgba(13,19,43,0.92))] text-slate-50">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-fuchsia-300">
          Why It Works
        </p>
        <div className="mt-5 grid gap-3">
          {foundationItems.map((item) => (
            <div
              key={item.title}
              className="rounded-[1.5rem] border border-white/10 bg-white/5 px-4 py-4"
            >
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-100">
                {item.title}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                {item.body}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-[1.6rem] border border-white/10 bg-white/6 px-5 py-5">
          <p className="text-xs uppercase tracking-[0.24em] text-fuchsia-300">
            Match Flow
          </p>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            Open the lobby, find a match, and play a clean round without setup clutter
            getting in the way.
          </p>
        </div>
      </SectionCard>
    </div>
  );
}
