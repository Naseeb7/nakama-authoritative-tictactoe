import { SectionCard } from "@/components/ui/section-card";
import { StepCard } from "@/components/ui/step-card";
import { PaperLinkButton } from "@/components/ui/paper-primitives";

const foundationItems = [
  {
    title: "Easy to enter",
    body: "Open Playroom and drift into the next open game without any fuss.",
  },
  {
    title: "Pick your pace",
    body: "Choose a calm classic round or a brisk clock-ticking one when you want a little spark.",
  },
  {
    title: "Keep the memories",
    body: "Look back through keepsakes and the scoreboard whenever you want to revisit the fun.",
  },
];

export default function Home() {
  return (
    <div className="grid items-start gap-6 xl:grid-cols-[1.18fr_0.82fr]">
      <SectionCard className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(91,62,43,0.1),_transparent_28%),radial-gradient(circle_at_20%_80%,_rgba(214,164,93,0.12),_transparent_22%)]" />
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[color:var(--accent)]">
          Welcome
        </p>
        <h2 className="paper-heading mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-[color:var(--foreground)] sm:text-5xl lg:text-6xl">
          A quiet little tic-tac-toe playroom with a 90s notebook heart.
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[color:var(--ink-soft)] sm:text-base">
          Start a round in a couple of clicks, play live against someone else,
          and come back for another soft little game when the board clears.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <PaperLinkButton
            href="/play"
            className="px-5 py-3 text-sm"
          >
            Enter the playroom
          </PaperLinkButton>
          <PaperLinkButton
            href="/history"
            variant="primary"
            className="px-5 py-3 text-sm"
          >
            Open keepsakes
          </PaperLinkButton>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <StepCard
            step="Step 1"
            title="Open Playroom"
            body="Head to Playroom to start a new game or slip into one that is already waiting."
          />
          <StepCard
            step="Step 2"
            title="Choose a pace"
            body="Pick Classic for a gentle round or Rush for a little timer-driven excitement."
          />
          <StepCard
            step="Step 3"
            title="Make a memory"
            body="You go straight to the live board as soon as the game is ready."
          />
        </div>
      </SectionCard>

      <SectionCard className="self-start">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[color:var(--accent-deep)]">
          Why it feels nice
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
            If you want to play, choose `Enter the playroom`. If you want to
            look back first, open `Keepsakes`.
          </p>
        </div>
      </SectionCard>
    </div>
  );
}
