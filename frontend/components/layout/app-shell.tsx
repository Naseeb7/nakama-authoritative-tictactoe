"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { AuthStatusCard } from "@/components/layout/auth-status-card";
import { PaperLinkButton, SketchDivider } from "@/components/ui/paper-primitives";

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
    "relative overflow-hidden rounded-[1.5rem] border border-[rgba(95,71,48,0.18)] bg-[rgba(250,243,229,0.96)] shadow-none";

  if (isMatchRoute) {
    return (
      <div className="min-h-screen text-[color:var(--foreground)]">
        <div className="mx-auto flex min-h-screen w-full max-w-[1500px] flex-col px-3 py-3 sm:px-6 sm:py-4 lg:px-8">
          <header className={`${shellBackdrop} px-3 py-3 sm:px-4 sm:py-4`}>
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.22),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(185,90,66,0.05),_transparent_24%)]" />
            <div className="relative flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <PaperLinkButton
                    href="/"
                    className="w-fit -rotate-[0.4deg] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] sm:text-xs sm:tracking-[0.32em]"
                  >
                    PulseGrid
                  </PaperLinkButton>
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
                          ? "border-[rgba(185,90,66,0.24)] bg-[rgba(243,219,205,0.98)] text-[color:var(--accent)]"
                          : "border-[rgba(95,71,48,0.16)] bg-[rgba(255,250,243,0.9)] text-[color:var(--foreground)] hover:border-[rgba(185,90,66,0.22)] hover:bg-[rgba(249,240,227,0.98)]"
                      }`}
                    >
                      {item.label}
                    </Link>
                  ))}
                  <PaperLinkButton
                    href="/play"
                    variant="primary"
                    className="shrink-0 px-3 py-2 text-xs font-semibold sm:px-4 sm:text-sm"
                  >
                    Start playing
                  </PaperLinkButton>
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
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.2),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(185,90,66,0.05),_transparent_24%)]" />
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <PaperLinkButton
                    href="/"
                    className="w-fit -rotate-[0.4deg] px-3 py-1 text-xs font-semibold uppercase tracking-[0.32em]"
                  >
                    PulseGrid
                  </PaperLinkButton>
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
                <PaperLinkButton
                  href="/play"
                  variant="primary"
                  className="inline-flex w-fit px-4 py-2 text-sm font-semibold"
                >
                  Go to play
                </PaperLinkButton>
                <AuthStatusCard compact />
              </div>
            </div>

            <SketchDivider />

            <nav className="flex flex-wrap gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                    isNavItemActive(pathname, item.href)
                      ? "border-[rgba(185,90,66,0.24)] bg-[rgba(243,219,205,0.98)] text-[color:var(--accent)]"
                      : "border-[rgba(95,71,48,0.16)] bg-[rgba(255,250,243,0.9)] text-[color:var(--foreground)] hover:border-[rgba(185,90,66,0.22)] hover:bg-[rgba(249,240,227,0.98)]"
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
