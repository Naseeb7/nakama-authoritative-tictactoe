"use client";

import { useApp } from "@/components/providers/app-provider";
import { getNakamaHttpUrl } from "@/lib/env";

function getStatusTone(status: "booting" | "ready" | "error") {
  if (status === "ready") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "error") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  return "border-amber-200 bg-amber-50 text-amber-700";
}

export function AuthStatusCard() {
  const { error, socketStatus, status, username } = useApp();

  return (
    <section className="w-full rounded-[1.75rem] border border-white/15 bg-[linear-gradient(180deg,_rgba(40,28,22,0.96),_rgba(67,42,28,0.92))] px-4 py-4 text-stone-50 shadow-[0_20px_50px_rgba(63,35,17,0.24)] sm:max-w-sm">
      <div className="flex items-center justify-between gap-3">
        <span
          className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] ${getStatusTone(
            status
          )}`}
        >
          {status}
        </span>
        <span className="text-xs uppercase tracking-[0.2em] text-stone-400">
          socket {socketStatus}
        </span>
      </div>

      <div className="mt-4 space-y-1">
        <p className="text-sm text-stone-400">Signed in as</p>
        <p className="text-lg font-semibold tracking-tight">
          {username ? username : "Connecting..."}
        </p>
      </div>

      <div className="mt-4 rounded-[1.35rem] border border-white/10 bg-white/6 px-3 py-3 text-xs text-stone-300">
        <p>Server: {getNakamaHttpUrl()}</p>
        {error ? <p className="mt-2 text-rose-200">{error}</p> : null}
      </div>
    </section>
  );
}
