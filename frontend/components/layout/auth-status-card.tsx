"use client";

import { type FormEvent, useEffect, useState } from "react";

import { useApp } from "@/components/providers/app-provider";

function getStatusTone(status: "booting" | "ready" | "error") {
  if (status === "ready") {
    return "border-[rgba(95,71,48,0.18)] bg-[rgba(239,229,210,0.9)] text-[color:var(--accent-deep)]";
  }

  if (status === "error") {
    return "border-[rgba(185,90,66,0.28)] bg-[rgba(248,226,219,0.92)] text-[color:var(--accent)]";
  }

  return "border-[rgba(95,71,48,0.18)] bg-[rgba(250,244,233,0.9)] text-[color:var(--ink-soft)]";
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
    error ??
    (socketStatus !== "connected"
      ? `Connection: ${socketStatus}`
      : "Connection stable");
  const connectionTone = error
    ? "text-[color:var(--accent)]"
    : socketStatus !== "connected"
      ? "text-[color:var(--accent-deep)]"
      : "text-[color:var(--ink-soft)]";

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
      <section className="paper-card rounded-full border border-[rgba(95,71,48,0.16)] bg-[rgba(251,247,239,0.92)] px-3 py-2 text-[color:var(--foreground)] shadow-[0_10px_28px_rgba(72,49,30,0.12)]">
        <div className="flex flex-wrap items-center gap-2">
          <span className="max-w-[10rem] truncate text-xs font-medium text-[color:var(--foreground)]">
            {username ? username : "Connecting..."}
          </span>
          <span
            className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${getStatusTone(
              status
            )}`}
          >
            {status}
          </span>
          <span className="rounded-full border border-[rgba(95,71,48,0.14)] bg-[rgba(255,250,244,0.9)] px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-[color:var(--ink-soft)]">
            {socketStatus}
          </span>
          {status !== "ready" || socketStatus !== "connected" ? (
            <button
              type="button"
              onClick={() => void retryConnection()}
              className="rounded-full border border-[rgba(185,90,66,0.24)] bg-[rgba(248,226,219,0.9)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--accent)] transition hover:-translate-y-0.5 hover:bg-[rgba(243,214,203,0.95)]"
            >
              Retry
            </button>
          ) : null}
          <a
            href="/account"
            className="rounded-full border border-[rgba(95,71,48,0.18)] bg-[rgba(255,249,239,0.88)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-deep)] transition hover:-translate-y-0.5 hover:bg-[rgba(249,240,227,0.96)]"
          >
            Account
          </a>
        </div>
      </section>
    );
  }

  return (
    <section className="paper-card w-full rounded-[1.75rem] border border-[rgba(95,71,48,0.18)] bg-[linear-gradient(180deg,rgba(255,250,243,0.98),rgba(242,230,210,0.96))] px-4 py-4 text-[color:var(--foreground)] shadow-[0_18px_34px_rgba(72,49,30,0.13)] sm:max-w-sm">
      <div className="flex items-center justify-between gap-3">
        <span
          className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] ${getStatusTone(
            status
          )}`}
        >
          {status}
        </span>
        <span className="text-xs uppercase tracking-[0.2em] text-[color:var(--ink-soft)]">
          live {socketStatus}
        </span>
      </div>

      <div className="mt-4 space-y-1">
        <p className="text-sm text-[color:var(--ink-soft)]">Pilot</p>
        <p className="text-lg font-semibold tracking-tight text-[color:var(--foreground)]">
          {username ? username : "Connecting..."}
        </p>
        <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--ink-soft)]">
          {status === "ready" ? "Identity online" : "Waiting for account"}
        </p>
      </div>

      <form onSubmit={handleNicknameSubmit} className="mt-4 space-y-3">
        <label className="block text-xs uppercase tracking-[0.2em] text-[color:var(--accent-deep)]">
          Change nickname
        </label>
        <div className="flex gap-2">
          <input
            value={draftUsername}
            onChange={(event) => setDraftUsername(event.target.value)}
            placeholder="Enter a new nickname"
            className="min-w-0 flex-1 rounded-full border border-[rgba(95,71,48,0.18)] bg-[rgba(255,250,244,0.96)] px-4 py-2 text-sm text-[color:var(--foreground)] outline-none transition placeholder:text-[color:var(--ink-soft)] focus:border-[rgba(185,90,66,0.35)] focus:ring-2 focus:ring-[rgba(185,90,66,0.1)]"
          />
          <button
            type="submit"
            disabled={isSaving || draftUsername.trim().length === 0}
            className="rounded-full border border-[rgba(95,71,48,0.22)] bg-[linear-gradient(180deg,rgba(255,248,241,0.98),rgba(241,224,203,0.96))] px-4 py-2 text-sm font-medium text-[color:var(--foreground)] transition hover:-translate-y-0.5 hover:border-[rgba(185,90,66,0.3)] hover:text-[color:var(--accent)] disabled:cursor-not-allowed disabled:border-[rgba(95,71,48,0.12)] disabled:bg-[rgba(250,246,239,0.75)] disabled:text-[rgba(107,91,77,0.6)]"
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
        {actionMessage ? (
          <p className="text-[color:var(--accent-deep)]">{actionMessage}</p>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {status !== "ready" || socketStatus !== "connected" ? (
          <button
            type="button"
            onClick={() => void retryConnection()}
            className="rounded-full border border-[rgba(185,90,66,0.22)] bg-[rgba(248,226,219,0.9)] px-3 py-2 text-xs font-medium text-[color:var(--accent)] transition hover:-translate-y-0.5 hover:bg-[rgba(243,214,203,0.95)]"
          >
            Retry connection
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => void logout()}
          className="rounded-full border border-[rgba(95,71,48,0.18)] bg-[rgba(255,250,244,0.92)] px-3 py-2 text-xs font-medium text-[color:var(--foreground)] transition hover:-translate-y-0.5 hover:border-[rgba(185,90,66,0.24)] hover:bg-[rgba(249,240,227,0.96)]"
        >
          Log out
        </button>
        <button
          type="button"
          onClick={() => void switchUser()}
          className="rounded-full border border-[rgba(95,71,48,0.18)] bg-[rgba(255,250,244,0.92)] px-3 py-2 text-xs font-medium text-[color:var(--foreground)] transition hover:-translate-y-0.5 hover:border-[rgba(185,90,66,0.24)] hover:bg-[rgba(249,240,227,0.96)]"
        >
          Switch user
        </button>
      </div>

    </section>
  );
}
