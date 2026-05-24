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
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(185,90,66,0.1),_transparent_28%),radial-gradient(circle_at_20%_80%,_rgba(214,164,93,0.12),_transparent_22%)]" />
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[color:var(--accent)]">
          Welcome
        </p>
        <h2 className="paper-heading mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-[color:var(--foreground)] sm:text-5xl lg:text-6xl">
          Quick online tic-tac-toe, built like a tabletop keepsake.
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[color:var(--ink-soft)] sm:text-base">
          Start a match in a couple of clicks, play live against another
          player, and jump back in for another round when the game ends.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/play"
            className="rounded-full border border-[rgba(95,71,48,0.2)] bg-[linear-gradient(180deg,rgba(255,249,241,0.98),rgba(242,228,207,0.96))] px-5 py-3 text-sm font-medium text-[color:var(--foreground)] shadow-[0_12px_24px_rgba(78,54,35,0.12)] transition hover:-translate-y-0.5 hover:border-[rgba(185,90,66,0.24)] hover:text-[color:var(--accent)]"
          >
            Play now
          </Link>
          <Link
            href="/history"
            className="rounded-full border border-[rgba(185,90,66,0.22)] bg-[rgba(248,226,219,0.92)] px-5 py-3 text-sm font-medium text-[color:var(--accent)] transition hover:-translate-y-0.5 hover:bg-[rgba(243,214,203,0.98)]"
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

      <SectionCard className="self-start">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[color:var(--accent-deep)]">
          Why It Works
        </p>
        <div className="mt-5 grid gap-3">
          {foundationItems.map((item) => (
            <div
              key={item.title}
              className="rounded-[1.5rem] border border-[rgba(95,71,48,0.14)] bg-[rgba(255,250,244,0.86)] px-4 py-4"
            >
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--foreground)]">
                {item.title}
              </p>
              <p className="mt-2 text-sm leading-6 text-[color:var(--ink-soft)]">
                {item.body}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-[1.6rem] border border-[rgba(95,71,48,0.14)] bg-[rgba(255,250,244,0.86)] px-5 py-5">
          <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--accent)]">
            Where to begin
          </p>
          <p className="mt-3 text-sm leading-7 text-[color:var(--ink-soft)]">
            If you are here to play, use `Play now`. If you want to review past
            games first, open `View past matches`.
          </p>
        </div>
      </SectionCard>
    </div>
  );
}
