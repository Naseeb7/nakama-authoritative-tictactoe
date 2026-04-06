type MatchStatus = "waiting" | "active" | "finished";
type MatchMode = "classic" | "timed";
type MatchEndReason = "win" | "draw" | "turn-timeout" | "reconnect-timeout";

var MOVE_OPCODE = 1;
var STATE_UPDATE_OPCODE = 2;
var GLOBAL_WINS_LEADERBOARD_ID = "global_wins";
var PLAYER_STATS_COLLECTION = "player_stats";
var PLAYER_STATS_KEY = "stats";
var MATCH_HISTORY_COLLECTION = "match_history";
var TURN_TIMEOUT_SECONDS = 30;
var DISCONNECT_TIMEOUT_SECONDS = 30;
var FINISHED_MATCH_TTL_SECONDS = 15;
var MATCH_LABEL_PREFIX = "tic_tac_toe_match";

interface MoveHistoryEntry {
  playerId: string;
  position: number;
}

interface PlayerStats {
  wins: number;
  losses: number;
  gamesPlayed: number;
  currentStreak: number;
  bestStreak: number;
}

interface MatchState {
  matchId: string;
  historyKey: string;
  board: [string, string, string, string, string, string, string, string, string];
  players: string[];
  symbols: Record<string, "X" | "O">;
  currentTurn: string | null;
  winner: string | null;
  status: MatchStatus;
  label: string;
  startTime: number;
  endTime: number | null;
  moveHistory: MoveHistoryEntry[];
  mode: MatchMode;
  disconnectedPlayers: Record<string, number>;
  playerNames: Record<string, string>;
  disconnectTimeoutSeconds: number;
  turnDeadlineTick: number | null;
  pausedTurnRemainingSeconds: number | null;
  endReason: MatchEndReason | null;
  endReasonText: string | null;
  historyPersisted: boolean;
  finishedTick: number | null;
}

interface MovePayload {
  position: number;
}
