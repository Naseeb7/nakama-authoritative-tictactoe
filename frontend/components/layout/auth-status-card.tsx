"use client";

import { type FormEvent, useEffect, useState } from "react";

import { useApp } from "@/components/providers/app-provider";

function getStatusTone(status: "booting" | "ready" | "error") {
  if (status === "ready") {
    return "border-cyan-400/40 bg-cyan-400/12 text-cyan-200";
  }

  if (status === "error") {
    return "border-rose-400/40 bg-rose-500/12 text-rose-200";
  }

  return "border-fuchsia-400/40 bg-fuchsia-500/12 text-fuchsia-200";
}

export function AuthStatusCard({ compact = false }: { compact?: boolean }) {
  const {
    error,
    logout,
    renameNickname,
    retryConnection,
    socketStatus,
    status,
    switchUser,
    username,
  } = useApp();
  const [draftUsername, setDraftUsername] = useState(username ?? "");
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const connectionMessage =
    error ?? (socketStatus !== "connected" ? `Connection: ${socketStatus}` : "Connection stable");
  const connectionTone = error ? "text-rose-200" : socketStatus !== "connected" ? "text-fuchsia-200" : "text-slate-500";

  useEffect(() => {
    setDraftUsername(username ?? "");
  }, [username]);

  async function handleNicknameSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActionError(null);
    setActionMessage(null);
    setIsSaving(true);

    try {
      await renameNickname(draftUsername);
      setActionMessage("Nickname updated.");
    } catch (nextError) {
      setActionError(
        nextError instanceof Error && nextError.message
          ? nextError.message
          : "Failed to update nickname."
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (compact) {
    return (
      <section className="w-full rounded-[1.25rem] border border-cyan-400/18 bg-[linear-gradient(180deg,_rgba(5,10,24,0.96),_rgba(9,16,37,0.92))] px-3 py-3 text-slate-50 shadow-[0_0_0_1px_rgba(77,226,255,0.06),0_0_20px_rgba(0,183,255,0.12)] sm:rounded-[1.4rem] sm:px-4 lg:max-w-md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
              Pilot
            </p>
            <p className="truncate text-sm font-semibold text-white">
              {username ? username : "Connecting..."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.18em]">
            <span
              className={`rounded-full border px-3 py-1 font-semibold ${getStatusTone(
                status
              )}`}
            >
              {status}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-slate-300">
              {socketStatus}
            </span>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          {status !== "ready" || socketStatus !== "connected" ? (
            <button
              type="button"
              onClick={() => void retryConnection()}
              className="rounded-full border border-fuchsia-400/35 bg-fuchsia-500/10 px-3 py-2 text-xs font-medium text-fuchsia-100 transition hover:bg-fuchsia-500/16"
            >
              Retry
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => void logout()}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-cyan-400/30 hover:bg-white/8"
          >
            Log out
          </button>
          <button
            type="button"
            onClick={() => void switchUser()}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-cyan-400/30 hover:bg-white/8"
          >
            Switch user
          </button>
        </div>

        <div className={`mt-3 min-h-5 text-xs ${connectionTone}`}>
          <p>{connectionMessage}</p>
        </div>

        <div className="mt-2 min-h-5 text-xs">
          {actionError ? <p className="text-rose-200">{actionError}</p> : null}
          {actionMessage ? <p className="text-cyan-200">{actionMessage}</p> : null}
        </div>
      </section>
    );
  }

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
          live {socketStatus}
        </span>
      </div>

      <div className="mt-4 space-y-1">
        <p className="text-sm text-slate-400">Pilot</p>
        <p className="text-lg font-semibold tracking-tight text-white">
          {username ? username : "Connecting..."}
        </p>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
          {status === "ready" ? "Identity online" : "Waiting for account"}
        </p>
      </div>

      <form onSubmit={handleNicknameSubmit} className="mt-4 space-y-3">
        <label className="block text-xs uppercase tracking-[0.2em] text-cyan-200">
          Change nickname
        </label>
        <div className="flex gap-2">
          <input
            value={draftUsername}
            onChange={(event) => setDraftUsername(event.target.value)}
            placeholder="Enter a new nickname"
            className="min-w-0 flex-1 rounded-full border border-white/10 bg-slate-950/70 px-4 py-2 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/40"
          />
          <button
            type="submit"
            disabled={isSaving || draftUsername.trim().length === 0}
            className="rounded-full border border-cyan-400/35 bg-cyan-400/12 px-4 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-400/18 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-800 disabled:text-slate-500"
          >
            {isSaving ? "Saving" : "Save"}
          </button>
        </div>
      </form>

      <div className={`mt-3 min-h-5 text-xs ${connectionTone}`}>
        <p>{connectionMessage}</p>
      </div>

      <div className="mt-2 min-h-5 text-xs">
        {actionError ? <p className="text-rose-200">{actionError}</p> : null}
        {actionMessage ? <p className="text-cyan-200">{actionMessage}</p> : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {status !== "ready" || socketStatus !== "connected" ? (
          <button
            type="button"
            onClick={() => void retryConnection()}
            className="rounded-full border border-fuchsia-400/35 bg-fuchsia-500/10 px-3 py-2 text-xs font-medium text-fuchsia-100 transition hover:bg-fuchsia-500/16"
          >
            Retry connection
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => void logout()}
          className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-cyan-400/30 hover:bg-white/8"
        >
          Log out
        </button>
        <button
          type="button"
          onClick={() => void switchUser()}
          className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-cyan-400/30 hover:bg-white/8"
        >
          Switch user
        </button>
      </div>

    </section>
  );
}
