import Link from "next/link";

import { AuthStatusCard } from "@/components/layout/auth-status-card";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/play", label: "Play Now" },
  { href: "/leaderboard", label: "Hall of Fame" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen text-[color:var(--foreground)]">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-6 sm:px-8 lg:px-10">
        <header className="relative overflow-hidden rounded-[2.25rem] border border-white/35 bg-[linear-gradient(135deg,_rgba(255,252,247,0.82),_rgba(248,236,221,0.72))] px-5 py-5 shadow-[0_24px_90px_rgba(67,43,19,0.1)] backdrop-blur-xl sm:px-7 sm:py-6">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.75),_transparent_70%)]" />
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <Link
                href="/"
                className="inline-flex w-fit rounded-full border border-[color:var(--stroke-strong)] bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.32em] text-[color:var(--accent-deep)]"
              >
                Lila
              </Link>
              <div>
                <h1 className="font-sans text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">
                  Lila: Grid Duel
                </h1>
                <p className="max-w-2xl text-sm leading-6 text-[color:var(--ink-soft)] sm:text-base">
                  A fast two-player strategy game where every turn is confirmed by the
                  server, every room stays in sync, and every rematch is one tap away.
                </p>
              </div>
            </div>
            <AuthStatusCard />
          </div>

          <nav className="mt-5 flex flex-wrap gap-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full border border-[color:var(--stroke)] bg-white/70 px-4 py-2 text-sm font-medium text-stone-700 transition hover:-translate-y-0.5 hover:border-[color:var(--stroke-strong)] hover:bg-white hover:text-stone-950"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </header>

        <main className="flex-1 py-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
