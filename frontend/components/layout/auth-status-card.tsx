"use client";

import { type FormEvent, useEffect, useState } from "react";

import { useApp } from "@/components/providers/app-provider";
import {
  PaperBadge,
  PaperButton,
  PaperCard,
  PaperInput,
  PaperLinkButton,
} from "@/components/ui/paper-primitives";

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
      <PaperCard variant="note" className="rounded-full px-3 py-2 text-[color:var(--foreground)]">
        <div className="flex flex-wrap items-center gap-2">
          <span className="max-w-[10rem] truncate text-xs font-medium text-[color:var(--foreground)]">
            {username ? username : "Connecting..."}
          </span>
          <PaperBadge
            tone={status === "ready" ? "accent-deep" : status === "error" ? "accent" : "neutral"}
            className="px-2 py-1 text-[10px]"
          >
            {status}
          </PaperBadge>
          <PaperBadge tone="neutral" className="px-2 py-1 text-[10px]">
            {socketStatus}
          </PaperBadge>
          {status !== "ready" || socketStatus !== "connected" ? (
            <PaperButton
              type="button"
              variant="primary"
              size="sm"
              onClick={() => void retryConnection()}
            >
              Retry
            </PaperButton>
          ) : null}
          <PaperLinkButton
            href="/account"
            className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]"
          >
            Account
          </PaperLinkButton>
        </div>
      </PaperCard>
    );
  }

  return (
    <PaperCard variant="note" className="w-full rounded-[1.35rem] px-4 py-4 text-[color:var(--foreground)] sm:max-w-sm">
      <div className="flex items-center justify-between gap-3">
        <PaperBadge
          tone={status === "ready" ? "accent-deep" : status === "error" ? "accent" : "neutral"}
          className="px-3 py-1 text-xs"
        >
          {status}
        </PaperBadge>
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
          <PaperInput
            value={draftUsername}
            onChange={(event) => setDraftUsername(event.target.value)}
            placeholder="Enter a new nickname"
            className="flex-1"
          />
          <PaperButton
            type="submit"
            variant="primary"
            disabled={isSaving || draftUsername.trim().length === 0}
          >
            {isSaving ? "Saving" : "Save"}
          </PaperButton>
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
          <PaperButton
            type="button"
            variant="primary"
            size="sm"
            onClick={() => void retryConnection()}
          >
            Retry connection
          </PaperButton>
        ) : null}
        <PaperButton
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => void logout()}
        >
          Log out
        </PaperButton>
        <PaperButton
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => void switchUser()}
        >
          Switch user
        </PaperButton>
      </div>

    </PaperCard>
  );
}
