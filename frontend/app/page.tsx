import Link from "next/link";

import { SectionCard } from "@/components/ui/section-card";
import { StepCard } from "@/components/ui/step-card";

const foundationItems = [
  {
    title: "Jump in fast",
    body: "Press Play to join the next open game without setting anything up first.",
  },
  {
    title: "Choose your pace",
    body: "Play Classic for a calm round or Rush when you want a timer on every turn.",
  },
  {
    title: "Track your games",
    body: "Check match history and leaderboard whenever you want to review your results.",
  },
];

export default function Home() {
  return (
    <div className="grid items-start gap-6 xl:grid-cols-[1.18fr_0.82fr]">
      <SectionCard className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(0,183,255,0.16),_transparent_28%),radial-gradient(circle_at_20%_80%,_rgba(255,79,216,0.12),_transparent_22%)]" />
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-300">
          Welcome
        </p>
        <h2 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
          Quick online tic-tac-toe, built for instant play.
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[color:var(--ink-soft)] sm:text-base">
          Start a match in a couple of clicks, play live against another
          player, and jump back in for another round when the game ends.
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
            title="Open Play"
            body="Head to the Play screen to start a new game or join one that is waiting."
          />
          <StepCard
            step="Step 2"
            title="Pick a mode"
            body="Choose Classic for standard games or Rush for timed turns."
          />
          <StepCard
            step="Step 3"
            title="Start playing"
            body="You are taken straight to the live board as soon as your match is ready."
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
            Where to begin
          </p>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            If you are here to play, use `Play now`. If you want to review past
            games first, open `View past matches`.
          </p>
        </div>
      </SectionCard>
    </div>
  );
}
