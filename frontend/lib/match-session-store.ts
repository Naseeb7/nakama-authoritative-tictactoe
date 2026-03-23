export type StoredMatchSession = {
  matchId: string;
  mode: "classic" | "timed";
};

const MATCH_SESSION_KEY = "lila.match_session";

export function readStoredMatchSession(): StoredMatchSession | null {
  const rawValue = window.sessionStorage.getItem(MATCH_SESSION_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as StoredMatchSession;

    if (!parsed.matchId || !parsed.mode) {
      return null;
    }

    return parsed;
  } catch {
    clearStoredMatchSession();
    return null;
  }
}

export function writeStoredMatchSession(value: StoredMatchSession): void {
  window.sessionStorage.setItem(MATCH_SESSION_KEY, JSON.stringify(value));
}

export function clearStoredMatchSession(): void {
  window.sessionStorage.removeItem(MATCH_SESSION_KEY);
}
