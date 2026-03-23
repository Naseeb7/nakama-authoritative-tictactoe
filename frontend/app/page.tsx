import Link from "next/link";

import { SectionCard } from "@/components/ui/section-card";

const foundationItems = [
  "Nakama environment config with sensible local defaults",
  "Client-side guest/device authentication and session restore",
  "Realtime socket bootstrap for future matchmaking and match state",
  "App routes for landing, play, leaderboard, and match room",
];

export default function Home() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <SectionCard className="overflow-hidden">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
          Phase 1
        </p>
        <h2 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
          Frontend foundation before gameplay.
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
          The app is now structured around the backend that already exists:
          Nakama auth, realtime sockets, match entry routes, and room routes are
          in place so later phases can focus on the board and RPC flows instead
          of setup work.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/play"
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Continue to matchmaking
          </Link>
          <Link
            href="/leaderboard"
            className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Inspect future leaderboard route
          </Link>
        </div>
      </SectionCard>

      <SectionCard className="bg-[linear-gradient(180deg,_rgba(15,23,42,0.96),_rgba(15,23,42,0.88))] text-slate-50">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
          Included Now
        </p>
        <div className="mt-4 grid gap-3">
          {foundationItems.map((item) => (
            <div
              key={item}
              className="rounded-[1.5rem] border border-white/10 bg-white/5 px-4 py-4 text-sm leading-6 text-slate-200"
            >
              {item}
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
