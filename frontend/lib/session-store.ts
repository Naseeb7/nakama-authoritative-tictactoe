import { Session } from "@heroiclabs/nakama-js";

const AUTH_TOKEN_KEY = "lila.nakama.auth_token";
const REFRESH_TOKEN_KEY = "lila.nakama.refresh_token";

export function readStoredSession(): Session | null {
  const authToken = window.localStorage.getItem(AUTH_TOKEN_KEY);
  const refreshToken = window.localStorage.getItem(REFRESH_TOKEN_KEY);

  if (!authToken || !refreshToken) {
    return null;
  }

  try {
    return Session.restore(authToken, refreshToken);
  } catch {
    clearStoredSession();
    return null;
  }
}

export function writeStoredSession(session: Session): void {
  window.localStorage.setItem(AUTH_TOKEN_KEY, session.token);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, session.refresh_token);
}

export function clearStoredSession(): void {
  window.localStorage.removeItem(AUTH_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
}
