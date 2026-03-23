import { SectionCard } from "@/components/ui/section-card";

const backendFeatures = [
  "Global wins leaderboard writes are already implemented in Nakama.",
  "Per-player stats are persisted in storage for the signed-in user.",
  "Match history is persisted server-side but not yet exposed for client reads.",
];

export default function LeaderboardPage() {
  return (
    <SectionCard>
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
        Progress Surfaces
      </p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
        Leaderboard and stats come after gameplay wiring.
      </h2>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
        This page is reserved for the leaderboard and self-stats work in a
        later phase. The backend support is already present for wins and player
        stats, so the frontend only needs to read and present that data.
      </p>

      <div className="mt-6 grid gap-3">
        {backendFeatures.map((feature) => (
          <div
            key={feature}
            className="rounded-[1.4rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-700"
          >
            {feature}
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
