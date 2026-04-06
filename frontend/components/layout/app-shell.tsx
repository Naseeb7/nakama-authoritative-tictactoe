"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { AuthStatusCard } from "@/components/layout/auth-status-card";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/play", label: "Play" },
  { href: "/account", label: "Account" },
  { href: "/history", label: "Match History" },
  { href: "/leaderboard", label: "Hall of Fame" },
];

function isNavItemActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMatchRoute = pathname.startsWith("/match/");

  if (isMatchRoute) {
    return (
      <div className="min-h-screen text-[color:var(--foreground)]">
        <div className="mx-auto flex min-h-screen w-full max-w-[1500px] flex-col px-3 py-3 sm:px-6 sm:py-4 lg:px-8">
          <header className="relative overflow-hidden rounded-[1.5rem] border border-cyan-400/18 bg-[linear-gradient(135deg,_rgba(8,12,28,0.92),_rgba(12,18,38,0.86))] px-3 py-3 shadow-[0_0_0_1px_rgba(77,226,255,0.05),0_22px_70px_rgba(0,0,0,0.42)] backdrop-blur-xl sm:rounded-[1.75rem] sm:px-4 sm:py-4">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(77,226,255,0.12),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(255,79,216,0.08),_transparent_24%)]" />
            <div className="relative flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    href="/"
                    className="inline-flex w-fit rounded-full border border-cyan-400/35 bg-cyan-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-cyan-200 shadow-[0_0_18px_rgba(0,183,255,0.16)] sm:text-xs sm:tracking-[0.32em]"
                  >
                    PulseGrid
                  </Link>
                  <p className="hidden text-sm text-[color:var(--ink-soft)] sm:block">
                    Match focus mode. Core controls and live game state stay above the fold.
                  </p>
                </div>

                <nav className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
                  {navItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`shrink-0 rounded-full border px-3 py-2 text-xs font-medium transition sm:px-4 sm:text-sm ${
                        isNavItemActive(pathname, item.href)
                          ? "border-cyan-400/40 bg-cyan-400/12 text-cyan-100 shadow-[0_0_18px_rgba(0,183,255,0.16)]"
                          : "border-slate-700/90 bg-slate-900/70 text-slate-200 hover:-translate-y-0.5 hover:border-cyan-400/40 hover:bg-slate-950 hover:text-cyan-200 hover:shadow-[0_0_18px_rgba(0,183,255,0.16)]"
                      }`}
                    >
                      {item.label}
                    </Link>
                  ))}
                  <Link
                    href="/play"
                    className="shrink-0 rounded-full border border-fuchsia-400/35 bg-fuchsia-500/10 px-3 py-2 text-xs font-semibold text-fuchsia-100 transition hover:-translate-y-0.5 hover:bg-fuchsia-500/16 sm:px-4 sm:text-sm"
                  >
                    Start playing
                  </Link>
                </nav>
              </div>

              <AuthStatusCard compact />
            </div>
          </header>

          <main className="flex-1 py-3 sm:py-4">{children}</main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-[color:var(--foreground)]">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-6 sm:px-8 lg:px-10">
        <header className="relative overflow-hidden rounded-[1.6rem] border border-cyan-400/18 bg-[linear-gradient(135deg,_rgba(8,12,28,0.9),_rgba(12,18,38,0.82))] px-4 py-4 shadow-[0_0_0_1px_rgba(77,226,255,0.06),0_18px_54px_rgba(0,0,0,0.4)] backdrop-blur-xl sm:px-5">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(77,226,255,0.15),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(255,79,216,0.12),_transparent_24%)]" />
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    href="/"
                    className="inline-flex w-fit rounded-full border border-cyan-400/35 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.32em] text-cyan-200 shadow-[0_0_18px_rgba(0,183,255,0.18)]"
                  >
                    PulseGrid
                  </Link>
                  <p className="text-sm text-[color:var(--ink-soft)]">
                    Start a game fast and jump straight into the board.
                  </p>
                </div>
                <div>
                  <h1 className="font-sans text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                    Start a game without digging.
                  </h1>
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-[color:var(--ink-soft)]">
                    Open `Play`, choose a mode, and get into a live room fast.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/play"
                  className="inline-flex w-fit rounded-full border border-fuchsia-400/35 bg-fuchsia-500/10 px-4 py-2 text-sm font-semibold text-fuchsia-100 transition hover:-translate-y-0.5 hover:bg-fuchsia-500/16"
                >
                  Go to play
                </Link>
                <AuthStatusCard compact />
              </div>
            </div>

            <div className="h-px bg-[linear-gradient(90deg,rgba(77,226,255,0.24),rgba(255,255,255,0.08),transparent)]" />

            <nav className="flex flex-wrap gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                    isNavItemActive(pathname, item.href)
                      ? "border-cyan-400/40 bg-cyan-400/12 text-cyan-100 shadow-[0_0_18px_rgba(0,183,255,0.16)]"
                      : "border-slate-700/90 bg-slate-900/70 text-slate-200 hover:-translate-y-0.5 hover:border-cyan-400/40 hover:bg-slate-950 hover:text-cyan-200 hover:shadow-[0_0_18px_rgba(0,183,255,0.16)]"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>

        <main className="flex-1 py-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
