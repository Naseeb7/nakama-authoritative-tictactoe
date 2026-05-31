import { PaperLinkButton } from "@/components/ui/paper-primitives";
import { SectionCard } from "@/components/ui/section-card";

export default function Home() {
  return (
    <div className="grid items-start gap-6 xl:grid-cols-[1.08fr_0.92fr]">
      <SectionCard className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(91,62,43,0.1),_transparent_28%),radial-gradient(circle_at_20%_80%,_rgba(214,164,93,0.12),_transparent_22%)]" />
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[color:var(--accent)]">
          Play now
        </p>
        <h2 className="paper-heading mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-[color:var(--foreground)] sm:text-5xl lg:text-6xl">
          Start a live tic-tac-toe round in seconds.
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[color:var(--ink-soft)] sm:text-base">
          Open Playroom, choose a pace, and jump straight to the board.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <PaperLinkButton
            href="/play"
            variant="primary"
            className="px-6 py-3 text-sm font-semibold"
          >
            Play now
          </PaperLinkButton>
          <PaperLinkButton
            href="/leaderboard"
            className="px-5 py-3 text-sm"
          >
            View scoreboard
          </PaperLinkButton>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <div className="rounded-[1.5rem] border border-[rgba(95,71,48,0.14)] bg-[rgba(255,250,244,0.86)] px-4 py-4">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--foreground)]">
              Open Playroom
            </p>
            <p className="mt-2 text-sm leading-6 text-[color:var(--ink-soft)]">
              The quickest path into a live match.
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-[rgba(95,71,48,0.14)] bg-[rgba(255,250,244,0.86)] px-4 py-4">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--foreground)]">
              Pick a pace
            </p>
            <p className="mt-2 text-sm leading-6 text-[color:var(--ink-soft)]">
              Classic or Rush, then straight to the board.
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-[rgba(95,71,48,0.14)] bg-[rgba(255,250,244,0.86)] px-4 py-4">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--foreground)]">
              Start playing
            </p>
            <p className="mt-2 text-sm leading-6 text-[color:var(--ink-soft)]">
              You do not need to dig through extra screens.
            </p>
          </div>
        </div>
      </SectionCard>

      <SectionCard className="self-start">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[color:var(--accent-deep)]">
          Fastest path
        </p>
        <p className="mt-4 text-sm leading-7 text-[color:var(--ink-soft)]">
          Tap `Play now` if you want the shortest route into a match. The rest
          of the site stays out of the way until you need it.
        </p>
        <div className="mt-6 rounded-[1.6rem] border border-[rgba(95,71,48,0.14)] bg-[rgba(255,250,244,0.86)] px-5 py-5">
          <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--accent)]">
            One tap
          </p>
          <p className="mt-3 text-sm leading-7 text-[color:var(--ink-soft)]">
            `Play now` opens the play flow immediately. Choose your pace, then
            start a match.
          </p>
          <PaperLinkButton
            href="/play"
            variant="primary"
            className="mt-5 inline-flex px-5 py-3 text-sm font-semibold"
          >
            Play now
          </PaperLinkButton>
        </div>
      </SectionCard>
    </div>
  );
}
