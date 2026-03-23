"use client";

import { useApp } from "@/components/providers/app-provider";
import { getNakamaHttpUrl } from "@/lib/env";

function getStatusTone(status: "booting" | "ready" | "error") {
  if (status === "ready") {
    return "border-cyan-400/40 bg-cyan-400/12 text-cyan-200";
  }

  if (status === "error") {
    return "border-rose-400/40 bg-rose-500/12 text-rose-200";
  }

  return "border-fuchsia-400/40 bg-fuchsia-500/12 text-fuchsia-200";
}

export function AuthStatusCard() {
  const { error, socketStatus, status, username } = useApp();

  return (
    <section className="w-full rounded-[1.75rem] border border-cyan-400/20 bg-[linear-gradient(180deg,_rgba(5,10,24,0.96),_rgba(9,16,37,0.92))] px-4 py-4 text-slate-50 shadow-[0_0_0_1px_rgba(77,226,255,0.08),0_0_30px_rgba(0,183,255,0.14)] sm:max-w-sm">
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
        <p className="text-sm text-slate-400">Pilot</p>
        <p className="text-lg font-semibold tracking-tight text-white">
          {username ? username : "Connecting..."}
        </p>
      </div>

      <div className="mt-4 rounded-[1.35rem] border border-white/8 bg-white/5 px-3 py-3 text-xs text-slate-300">
        <p>Server: {getNakamaHttpUrl()}</p>
        {error ? <p className="mt-2 text-rose-200">{error}</p> : null}
      </div>
    </section>
  );
}
