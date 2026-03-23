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
    <section className="w-full rounded-[1.5rem] border border-slate-200 bg-slate-950 px-4 py-4 text-slate-50 shadow-[0_12px_40px_rgba(15,23,42,0.18)] sm:max-w-sm">
      <div className="flex items-center justify-between gap-3">
        <span
          className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] ${getStatusTone(
            status
          )}`}
        >
          {status}
        </span>
        <span className="text-xs uppercase tracking-[0.2em] text-slate-400">
          socket {socketStatus}
        </span>
      </div>

      <div className="mt-4 space-y-1">
        <p className="text-sm text-slate-400">Signed in as</p>
        <p className="text-lg font-semibold">
          {username ? username : "Connecting..."}
        </p>
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-xs text-slate-300">
        <p>Server: {getNakamaHttpUrl()}</p>
        {error ? <p className="mt-2 text-rose-300">{error}</p> : null}
      </div>
    </section>
  );
}
