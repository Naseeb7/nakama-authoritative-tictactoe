import type { Client } from "@heroiclabs/nakama-js";
import { Session } from "@heroiclabs/nakama-js";

import { getOrCreateDeviceId } from "@/lib/device-id";
import {
  clearStoredSession,
  readStoredSession,
  writeStoredSession,
} from "@/lib/session-store";
import { toErrorMessage } from "@/lib/services/app-errors";

const SESSION_REFRESH_WINDOW_MS = 5 * 60 * 1000;

type HttpErrorResponse = {
  clone?: () => HttpErrorResponse;
  json?: () => Promise<unknown>;
  status: number;
  statusText?: string;
  text?: () => Promise<string>;
};

function isHttpErrorResponse(error: unknown): error is HttpErrorResponse {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof error.status === "number"
  );
}

function extractNicknameServerMessage(payload: unknown): string | null {
  if (typeof payload === "string") {
    const trimmedPayload = payload.trim();

    if (!trimmedPayload || trimmedPayload === "{}") {
      return null;
    }

    try {
      return extractNicknameServerMessage(JSON.parse(trimmedPayload));
    } catch {
      return trimmedPayload;
    }
  }

  if (!payload || typeof payload !== "object") {
    return null;
  }

  if ("message" in payload && typeof payload.message === "string") {
    const trimmedMessage = payload.message.trim();
    return trimmedMessage ? trimmedMessage : null;
  }

  if ("error" in payload && typeof payload.error === "string") {
    const trimmedError = payload.error.trim();
    return trimmedError ? trimmedError : null;
  }

  return null;
}

async function readNicknameServerMessage(response: HttpErrorResponse): Promise<string | null> {
  const readableResponse =
    typeof response.clone === "function" ? response.clone() : response;

  if (typeof readableResponse.text === "function") {
    try {
      return extractNicknameServerMessage(await readableResponse.text());
    } catch {
      return null;
    }
  }

  if (typeof readableResponse.json === "function") {
    try {
      return extractNicknameServerMessage(await readableResponse.json());
    } catch {
      return null;
    }
  }

  return null;
}

export async function toNicknameErrorMessage(error: unknown): Promise<string> {
  if (isHttpErrorResponse(error)) {
    const serverMessage = await readNicknameServerMessage(error);

    if (error.status === 409) {
      return "That nickname is already taken. Try another one.";
    }

    if (serverMessage) {
      return serverMessage;
    }

    if (error.statusText) {
      return error.statusText;
    }

    return "Failed to update nickname.";
  }

  const directMessage = toErrorMessage(error);

  if (directMessage && directMessage !== "Unknown error" && directMessage !== "{}") {
    return directMessage;
  }

  return "Failed to update nickname.";
}

export function buildGuestUsername(deviceId: string): string {
  return `guest-${deviceId.replace(/[^a-zA-Z0-9]/g, "").slice(-8)}`;
}

export async function restoreOrCreateSession(client: Client): Promise<Session> {
  const storedSession = readStoredSession();
  const nowInSeconds = Date.now() / 1000;
  const refreshCutoffInSeconds =
    (Date.now() + SESSION_REFRESH_WINDOW_MS) / 1000;

  if (storedSession && !storedSession.isrefreshexpired(nowInSeconds)) {
    let session = storedSession;

    if (storedSession.isexpired(refreshCutoffInSeconds)) {
      try {
        session = await client.sessionRefresh(storedSession);
        writeStoredSession(session);
      } catch {
        clearStoredSession();
      }
    }

    if (!session.isexpired(nowInSeconds)) {
      return session;
    }
  }

  clearStoredSession();

  const deviceId = getOrCreateDeviceId();
  const session = await client.authenticateDevice(
    deviceId,
    true,
    buildGuestUsername(deviceId)
  );

  writeStoredSession(session);

  return session;
}
