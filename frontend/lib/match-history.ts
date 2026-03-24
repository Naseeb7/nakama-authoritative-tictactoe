export type MatchHistoryMode = "classic" | "timed";

export type MatchHistoryEntry = {
  durationSeconds: number;
  endReason: string;
  endReasonText: string;
  historyKey: string;
  matchId: string;
  mode: MatchHistoryMode;
  moveHistory: Array<{
    playerId: string;
    position: number;
  }>;
  playerNames: Record<string, string>;
  players: string[];
  timestamp: number;
  winner: string | null;
};

export type MatchHistoryResponse = {
  hasMore: boolean;
  limit: number;
  offset: number;
  records: MatchHistoryEntry[];
  total: number;
};
