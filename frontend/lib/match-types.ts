export type MatchMode = "classic" | "timed";

export type MatchLifecycleStatus = "waiting" | "active" | "finished";

export type MatchStatePayload = {
  board: string[];
  currentTurn: string | null;
  disconnectedPlayers: Record<string, number>;
  disconnectTimeoutSeconds: number;
  endTime: number | null;
  label: string;
  mode: MatchMode;
  moveHistory: Array<{
    playerId: string;
    position: number;
  }>;
  players: string[];
  startTime: number;
  status: MatchLifecycleStatus;
  symbols: Record<string, "X" | "O">;
  turnDeadlineTick: number | null;
  turnExpiresAt: number | null;
  turnSecondsRemaining: number | null;
  serverTime: number;
  winner: string | null;
};

export type ActiveMatch = {
  createdByCurrentAction: boolean;
  matchId: string;
  mode: MatchMode;
  presences: Array<{
    sessionId: string;
    userId: string;
    username: string;
  }>;
  self: {
    sessionId: string;
    userId: string;
    username: string;
  } | null;
};
