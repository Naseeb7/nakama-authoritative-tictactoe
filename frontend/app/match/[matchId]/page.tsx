import { SectionCard } from "@/components/ui/section-card";

export default async function MatchRoomPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;

  return (
    <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <SectionCard className="bg-slate-950 text-slate-50">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
          Match Room
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight">
          {matchId}
        </h2>
        <p className="mt-3 text-sm leading-7 text-slate-300 sm:text-base">
          This dynamic route will host the authoritative board, turn state,
          move history, reconnect banners, and timed-mode countdown.
        </p>
      </SectionCard>

      <SectionCard>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
          Planned Data
        </p>
        <div className="mt-4 grid gap-3 text-sm leading-6 text-slate-700">
          <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 px-4 py-4">
            Authoritative board state and current turn
          </div>
          <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 px-4 py-4">
            Assigned player symbol and match status
          </div>
          <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 px-4 py-4">
            Reconnect state, move history, and timed-mode deadline
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
