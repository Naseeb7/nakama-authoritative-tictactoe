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
  const shellBackdrop =
    "relative overflow-hidden rounded-[1.8rem] border border-[rgba(95,71,48,0.18)] bg-[linear-gradient(180deg,rgba(253,248,238,0.96),rgba(240,227,206,0.94))] shadow-[0_20px_54px_rgba(78,54,35,0.14)]";

  if (isMatchRoute) {
    return (
      <div className="min-h-screen text-[color:var(--foreground)]">
        <div className="mx-auto flex min-h-screen w-full max-w-[1500px] flex-col px-3 py-3 sm:px-6 sm:py-4 lg:px-8">
          <header className={`${shellBackdrop} px-3 py-3 sm:rounded-[1.95rem] sm:px-4 sm:py-4`}>
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.45),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(185,90,66,0.08),_transparent_24%)]" />
            <div className="relative flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    href="/"
                    className="inline-flex w-fit -rotate-1 rounded-full border border-[rgba(95,71,48,0.18)] bg-[rgba(255,250,241,0.92)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-[color:var(--accent-deep)] shadow-[0_10px_24px_rgba(78,54,35,0.1)] sm:text-xs sm:tracking-[0.32em]"
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
                          ? "border-[rgba(185,90,66,0.26)] bg-[rgba(243,219,205,0.98)] text-[color:var(--accent)] shadow-[0_12px_24px_rgba(78,54,35,0.12)]"
                          : "border-[rgba(95,71,48,0.16)] bg-[rgba(255,250,243,0.9)] text-[color:var(--foreground)] hover:-translate-y-0.5 hover:border-[rgba(185,90,66,0.24)] hover:bg-[rgba(249,240,227,0.98)] hover:shadow-[0_12px_22px_rgba(78,54,35,0.1)]"
                      }`}
                    >
                      {item.label}
                    </Link>
                  ))}
                  <Link
                    href="/play"
                    className="shrink-0 rounded-full border border-[rgba(185,90,66,0.24)] bg-[rgba(248,226,219,0.92)] px-3 py-2 text-xs font-semibold text-[color:var(--accent)] transition hover:-translate-y-0.5 hover:bg-[rgba(243,214,203,0.98)] sm:px-4 sm:text-sm"
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
        <header className={`${shellBackdrop} px-4 py-4 sm:px-5`}>
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.42),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(185,90,66,0.08),_transparent_24%)]" />
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    href="/"
                    className="inline-flex w-fit -rotate-1 rounded-full border border-[rgba(95,71,48,0.18)] bg-[rgba(255,250,241,0.92)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.32em] text-[color:var(--accent-deep)] shadow-[0_10px_24px_rgba(78,54,35,0.1)]"
                  >
                    PulseGrid
                  </Link>
                  <p className="text-sm text-[color:var(--ink-soft)]">
                    Start a game fast and jump straight into the board.
                  </p>
                </div>
                <div>
                  <h1 className="paper-heading text-2xl font-semibold tracking-tight text-[color:var(--foreground)] sm:text-3xl">
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
                  className="inline-flex w-fit rounded-full border border-[rgba(185,90,66,0.24)] bg-[rgba(248,226,219,0.92)] px-4 py-2 text-sm font-semibold text-[color:var(--accent)] transition hover:-translate-y-0.5 hover:bg-[rgba(243,214,203,0.98)]"
                >
                  Go to play
                </Link>
                <AuthStatusCard compact />
              </div>
            </div>

            <div className="h-px bg-[linear-gradient(90deg,rgba(185,90,66,0.24),rgba(255,255,255,0.6),transparent)]" />

            <nav className="flex flex-wrap gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                    isNavItemActive(pathname, item.href)
                      ? "border-[rgba(185,90,66,0.26)] bg-[rgba(243,219,205,0.98)] text-[color:var(--accent)] shadow-[0_12px_24px_rgba(78,54,35,0.12)]"
                      : "border-[rgba(95,71,48,0.16)] bg-[rgba(255,250,243,0.9)] text-[color:var(--foreground)] hover:-translate-y-0.5 hover:border-[rgba(185,90,66,0.24)] hover:bg-[rgba(249,240,227,0.98)] hover:shadow-[0_12px_22px_rgba(78,54,35,0.1)]"
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
