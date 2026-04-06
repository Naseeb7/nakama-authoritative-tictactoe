import Link from "next/link";

import { SectionCard } from "@/components/ui/section-card";
import { StepCard } from "@/components/ui/step-card";

const foundationItems = [
  {
    title: "Live matchmaking",
    body: "Find a room that is already waiting for another player and get into the board fast.",
  },
  {
    title: "Authoritative state",
    body: "Both players see the same board, the same turn order, and the same result.",
  },
  {
    title: "Quick rematches",
    body: "Run it back from the match screen instead of starting the whole flow again.",
  },
];

export default function Home() {
  return (
    <div className="grid items-start gap-6 xl:grid-cols-[1.18fr_0.82fr]">
      <SectionCard className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(0,183,255,0.16),_transparent_28%),radial-gradient(circle_at_20%_80%,_rgba(255,79,216,0.12),_transparent_22%)]" />
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-300">
          Play-first lobby
        </p>
        <h2 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
          Get into a match without hunting for the right button.
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[color:var(--ink-soft)] sm:text-base">
          PulseGrid is built for a fast two-player loop: pick a mode, hit play,
          and step straight into a live room. No setup maze, no guesswork.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/play"
            className="rounded-full border border-cyan-400/40 bg-cyan-400/12 px-5 py-3 text-sm font-medium text-cyan-100 shadow-[0_0_26px_rgba(0,183,255,0.16)] transition hover:-translate-y-0.5 hover:bg-cyan-400/18"
          >
            Play now
          </Link>
          <Link
            href="/history"
            className="rounded-full border border-fuchsia-400/35 bg-fuchsia-500/10 px-5 py-3 text-sm font-medium text-fuchsia-100 transition hover:-translate-y-0.5 hover:bg-fuchsia-500/16"
          >
            View past matches
          </Link>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <StepCard
            step="Step 1"
            title="Choose a mode"
            body="Classic for open play, or Rush when you want a turn timer."
          />
          <StepCard
            step="Step 2"
            title="Hit play"
            body="Use the main play action to find the next open game immediately."
          />
          <StepCard
            step="Step 3"
            title="Join the board"
            body="If a room is ready, you move straight into the live match screen."
          />
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
            Fastest route
          </p>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            If someone asks where to start, the answer should be obvious: use
            the `Play` route in the main nav or the `Play now` button here on
            the home screen.
          </p>
        </div>
      </SectionCard>
    </div>
  );
}
