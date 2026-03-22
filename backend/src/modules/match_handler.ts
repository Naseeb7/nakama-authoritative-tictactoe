type MatchStatus = "waiting" | "active" | "finished";
type MatchMode = "classic" | "timed";
var MOVE_OPCODE = 1;
var STATE_UPDATE_OPCODE = 2;
var GLOBAL_WINS_LEADERBOARD_ID = "global_wins";
var PLAYER_STATS_COLLECTION = "player_stats";
var PLAYER_STATS_KEY = "stats";
var TURN_TIMEOUT_SECONDS = 30;

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
  board: [string, string, string, string, string, string, string, string, string];
  players: string[];
  symbols: Record<string, "X" | "O">;
  currentTurn: string | null;
  winner: string | null;
  status: MatchStatus;
  moveHistory: MoveHistoryEntry[];
  mode: MatchMode;
  turnDeadlineTick: number | null;
}

interface MovePayload {
  position: number;
}

var matchInit = function (
  ctx: RpcContext,
  logger: Logger,
  _nk: Nakama,
  params: Record<string, string>
): MatchInitResult<MatchState> {
  var mode = getMatchModeFromParams(params);

  logger.info("matchInit executed.", {
    node: ctx.node,
    matchId: params.matchId,
    mode: mode
  });

  return {
    state: {
      board: ["", "", "", "", "", "", "", "", ""],
      players: [],
      symbols: {},
      currentTurn: null,
      winner: null,
      status: "waiting",
      moveHistory: [],
      mode: mode,
      turnDeadlineTick: null
    },
    tickRate: 1,
    label: getStateMatchLabelForMode(mode)
  };
};

var matchJoinAttempt = function (
  _ctx: RpcContext,
  logger: Logger,
  _nk: Nakama,
  _dispatcher: MatchDispatcher,
  _tick: number,
  state: MatchState,
  presence: Presence,
  _metadata?: Record<string, string>
): MatchJoinAttemptResult<MatchState> {
  var accept = state.players.length < 2;

  logger.info("matchJoinAttempt executed.", {
    userId: presence.userId,
    currentPlayerCount: state.players.length,
    accept: accept
  });

  return {
    state: state,
    accept: accept,
    rejectMessage: accept ? undefined : "Match is full."
  };
};

var matchJoin = function (
  _ctx: RpcContext,
  logger: Logger,
  _nk: Nakama,
  dispatcher: MatchDispatcher,
  tick: number,
  state: MatchState,
  presences: Presence[]
): MatchState {
  var updatedPlayers: string[] = state.players.slice();
  var updatedSymbols: Record<string, "X" | "O"> = {};
  var currentTurn = state.currentTurn;
  var status: MatchStatus = state.status;
  var turnDeadlineTick = state.turnDeadlineTick;
  var i: number;
  var playerId: string;

  for (playerId in state.symbols) {
    if (state.symbols.hasOwnProperty(playerId)) {
      updatedSymbols[playerId] = state.symbols[playerId];
    }
  }

  logger.info("matchJoin executed.", {
    joinedCount: presences.length
  });

  for (i = 0; i < presences.length; i += 1) {
    playerId = presences[i].userId;

    if (updatedPlayers.indexOf(playerId) === -1 && updatedPlayers.length < 2) {
      updatedPlayers.push(playerId);

      if (updatedPlayers.length === 1) {
        updatedSymbols[playerId] = "X";
      } else if (updatedPlayers.length === 2) {
        updatedSymbols[playerId] = "O";
      }
    }
  }

  if (updatedPlayers.length === 2) {
    status = "active";
    currentTurn = updatedPlayers[0];
    turnDeadlineTick = state.mode === "timed" ? tick + TURN_TIMEOUT_SECONDS : null;

    logger.info("Match activated.", {
      firstPlayer: updatedPlayers[0],
      secondPlayer: updatedPlayers[1],
      currentTurn: currentTurn,
      mode: state.mode,
      turnDeadlineTick: turnDeadlineTick
    });
  }

  var updatedState: MatchState = {
    board: state.board,
    players: updatedPlayers,
    symbols: updatedSymbols,
    currentTurn: currentTurn,
    winner: state.winner,
    status: status,
    moveHistory: state.moveHistory,
    mode: state.mode,
    turnDeadlineTick: turnDeadlineTick
  };

  broadcastMatchState(dispatcher, updatedState);

  return updatedState;
};

var matchLeave = function (
  _ctx: RpcContext,
  logger: Logger,
  _nk: Nakama,
  _dispatcher: MatchDispatcher,
  _tick: number,
  state: MatchState,
  presences: Presence[]
): MatchState {
  var leavingPlayerIds: Record<string, boolean> = {};
  var updatedPlayers: string[] = [];
  var updatedSymbols: Record<string, "X" | "O"> = {};
  var winner = state.winner;
  var status: MatchStatus = state.status;
  var currentTurn = state.currentTurn;
  var turnDeadlineTick = state.turnDeadlineTick;
  var i: number;
  var playerId: string;

  logger.info("matchLeave executed.", {
    leftCount: presences.length
  });

  for (i = 0; i < presences.length; i += 1) {
    leavingPlayerIds[presences[i].userId] = true;
  }

  for (i = 0; i < state.players.length; i += 1) {
    playerId = state.players[i];

    if (!leavingPlayerIds[playerId]) {
      updatedPlayers.push(playerId);
      if (state.symbols[playerId]) {
        updatedSymbols[playerId] = state.symbols[playerId];
      }
    }
  }

  if (state.status === "active" && updatedPlayers.length === 1) {
    winner = updatedPlayers[0];
    status = "finished";
    currentTurn = null;
    turnDeadlineTick = null;

    logger.info("Active match ended due to disconnect.", {
      winner: winner
    });

    try {
      updatePlayerStats(_nk, winner, true);
      _nk.leaderboardRecordWrite(GLOBAL_WINS_LEADERBOARD_ID, winner, "", 1, 0, {}, null);

      if (state.players.length > 1) {
        for (i = 0; i < state.players.length; i += 1) {
          if (state.players[i] !== winner) {
            updatePlayerStats(_nk, state.players[i], false);
          }
        }
      }
    } catch (error) {
      logger.error("Failed to persist disconnect result.", {
        winner: winner,
        error: String(error)
      });
    }
  } else if (updatedPlayers.length === 0) {
    currentTurn = null;
    turnDeadlineTick = null;
  }

  return {
    board: state.board,
    players: updatedPlayers,
    symbols: updatedSymbols,
    currentTurn: currentTurn,
    winner: winner,
    status: status,
    moveHistory: state.moveHistory,
    mode: state.mode,
    turnDeadlineTick: turnDeadlineTick
  };
};

var matchLoop = function (
  _ctx: RpcContext,
  logger: Logger,
  _nk: Nakama,
  dispatcher: MatchDispatcher,
  tick: number,
  state: MatchState,
  messages: MatchMessage[]
): MatchStateResult<MatchState> {
  var i: number;
  var message: MatchMessage;
  var payload: MovePayload | null;
  var playerId: string;
  var playerSymbol: "X" | "O" | undefined;
  var nextPlayer: string | null;
  var loserId: string | null;
  var timedOutPlayerId: string | null;
  var timeoutWinnerId: string | null;

  logger.info("matchLoop executed.", {
    tick: tick,
    messageCount: messages.length
  });

  if (
    state.status === "active" &&
    state.mode === "timed" &&
    state.currentTurn !== null &&
    state.turnDeadlineTick !== null &&
    tick >= state.turnDeadlineTick
  ) {
    timedOutPlayerId = state.currentTurn;
    timeoutWinnerId = getOtherPlayerId(state.players, timedOutPlayerId);

    state.status = "finished";
    state.currentTurn = null;
    state.turnDeadlineTick = null;
    state.winner = timeoutWinnerId;

    logger.info("Turn timer expired. Auto-forfeit applied.", {
      timedOutPlayerId: timedOutPlayerId,
      winner: timeoutWinnerId
    });

    if (timeoutWinnerId !== null) {
      try {
        updatePlayerStats(_nk, timeoutWinnerId, true);
        updatePlayerStats(_nk, timedOutPlayerId, false);
        _nk.leaderboardRecordWrite(GLOBAL_WINS_LEADERBOARD_ID, timeoutWinnerId, "", 1, 0, {}, null);
      } catch (error) {
        logger.error("Failed to persist timeout result.", {
          winner: timeoutWinnerId,
          loser: timedOutPlayerId,
          error: String(error)
        });
      }
    }

    broadcastMatchState(dispatcher, state);

    return {
      state: state
    };
  }

  for (i = 0; i < messages.length; i += 1) {
    message = messages[i];

    if (state.status === "finished") {
      logger.info("Skipping remaining messages because match is finished.");
      break;
    }

    logger.info("Received match message.", {
      opCode: message.opCode,
      userId: message.sender.userId
    });

    if (message.opCode !== MOVE_OPCODE) {
      continue;
    }

    payload = parseMovePayload(message.data);
    playerId = message.sender.userId;

    if (state.status !== "active") {
      logger.info("Rejected move: match is not active.", {
        userId: playerId
      });
      continue;
    }

    if (state.currentTurn !== playerId) {
      logger.info("Rejected move: not current turn.", {
        userId: playerId,
        currentTurn: state.currentTurn
      });
      continue;
    }

    if (!payload || !isValidPosition(payload.position)) {
      logger.info("Rejected move: invalid position payload.", {
        userId: playerId
      });
      continue;
    }

    if (state.board[payload.position] !== "") {
      logger.info("Rejected move: board position already occupied.", {
        userId: playerId,
        position: payload.position
      });
      continue;
    }

    playerSymbol = state.symbols[playerId];
    if (!playerSymbol) {
      logger.info("Rejected move: player has no assigned symbol.", {
        userId: playerId
      });
      continue;
    }

    state.board[payload.position] = playerSymbol;
    state.moveHistory.push({
      playerId: playerId,
      position: payload.position
    });

    if (hasWinningLine(state.board, playerSymbol)) {
      state.winner = playerId;
      state.status = "finished";
      state.currentTurn = null;
      state.turnDeadlineTick = null;

      try {
        updatePlayerStats(_nk, playerId, true);
        loserId = getOtherPlayerId(state.players, playerId);

        if (loserId !== null) {
          updatePlayerStats(_nk, loserId, false);
        }

        _nk.leaderboardRecordWrite(GLOBAL_WINS_LEADERBOARD_ID, playerId, "", 1, 0, {}, null);
      } catch (error) {
        logger.error("Failed to persist win result.", {
          winner: playerId,
          error: String(error)
        });
      }
    } else if (isBoardFull(state.board)) {
      state.status = "finished";
      state.currentTurn = null;
      state.turnDeadlineTick = null;

      try {
        if (state.players.length > 0) {
          updateDrawStats(_nk, state.players[0]);
          resetPlayerStreak(_nk, state.players[0]);
        }

        if (state.players.length > 1) {
          updateDrawStats(_nk, state.players[1]);
          resetPlayerStreak(_nk, state.players[1]);
        }
      } catch (error) {
        logger.error("Failed to persist draw result.", {
          error: String(error)
        });
      }
    } else {
      nextPlayer = getOtherPlayerId(state.players, playerId);
      state.currentTurn = nextPlayer;
      state.turnDeadlineTick = state.mode === "timed" ? tick + TURN_TIMEOUT_SECONDS : null;
    }

    broadcastMatchState(dispatcher, state);
  }

  return {
    state: state
  };
};

var matchTerminate = function (
  _ctx: RpcContext,
  logger: Logger,
  _nk: Nakama,
  _dispatcher: MatchDispatcher,
  _tick: number,
  state: MatchState,
  graceSeconds: number
): MatchState {
  logger.info("matchTerminate executed.", {
    graceSeconds: graceSeconds
  });

  return state;
};

var matchSignal = function (
  _ctx: RpcContext,
  logger: Logger,
  _nk: Nakama,
  _dispatcher: MatchDispatcher,
  _tick: number,
  state: MatchState,
  data: string
): MatchSignalResult<MatchState> {
  logger.info("matchSignal executed.");

  return {
    state: state,
    data: data
  };
};

var createMatchHandler: MatchHandler<MatchState> = {
  matchInit: matchInit,
  matchJoinAttempt: matchJoinAttempt,
  matchJoin: matchJoin,
  matchLeave: matchLeave,
  matchLoop: matchLoop,
  matchTerminate: matchTerminate,
  matchSignal: matchSignal
};

function parseMovePayload(data: string): MovePayload | null {
  try {
    return JSON.parse(data) as MovePayload;
  } catch (_error) {
    return null;
  }
}

function isValidPosition(position: number): boolean {
  return typeof position === "number" && position >= 0 && position <= 8 && position % 1 === 0;
}

function isBoardFull(board: [string, string, string, string, string, string, string, string, string]): boolean {
  var i: number;

  for (i = 0; i < board.length; i += 1) {
    if (board[i] === "") {
      return false;
    }
  }

  return true;
}

function getOtherPlayerId(players: string[], currentPlayerId: string): string | null {
  var i: number;

  for (i = 0; i < players.length; i += 1) {
    if (players[i] !== currentPlayerId) {
      return players[i];
    }
  }

  return null;
}

function hasWinningLine(
  board: [string, string, string, string, string, string, string, string, string],
  symbol: "X" | "O"
): boolean {
  var winningLines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6]
  ];
  var i: number;
  var line: number[];

  for (i = 0; i < winningLines.length; i += 1) {
    line = winningLines[i];

    if (board[line[0]] === symbol && board[line[1]] === symbol && board[line[2]] === symbol) {
      return true;
    }
  }

  return false;
}

function broadcastMatchState(dispatcher: MatchDispatcher, state: MatchState): void {
  dispatcher.broadcastMessage(
    STATE_UPDATE_OPCODE,
    JSON.stringify({
      board: state.board,
      players: state.players,
      symbols: state.symbols,
      currentTurn: state.currentTurn,
      winner: state.winner,
      status: state.status,
      moveHistory: state.moveHistory,
      mode: state.mode,
      turnDeadlineTick: state.turnDeadlineTick
    })
  );
}

function updatePlayerStats(nk: Nakama, userId: string, didWin: boolean): void {
  var stats = readPlayerStats(nk, userId);

  stats.gamesPlayed += 1;

  if (didWin) {
    stats.wins += 1;
    stats.currentStreak += 1;

    if (stats.currentStreak > stats.bestStreak) {
      stats.bestStreak = stats.currentStreak;
    }
  } else {
    stats.losses += 1;
    stats.currentStreak = 0;
  }

  writePlayerStats(nk, userId, stats);
}

function resetPlayerStreak(nk: Nakama, userId: string): void {
  var stats = readPlayerStats(nk, userId);

  stats.currentStreak = 0;

  writePlayerStats(nk, userId, stats);
}

function updateDrawStats(nk: Nakama, userId: string): void {
  var stats = readPlayerStats(nk, userId);

  stats.gamesPlayed += 1;
  stats.currentStreak = 0;

  writePlayerStats(nk, userId, stats);
}

function readPlayerStats(nk: Nakama, userId: string): PlayerStats {
  var objects = nk.storageRead([
    {
      collection: PLAYER_STATS_COLLECTION,
      key: PLAYER_STATS_KEY,
      userId: userId
    }
  ]);

  if (!objects || objects.length === 0) {
    return createDefaultPlayerStats();
  }

  return normalizePlayerStats(objects[0].value);
}

function writePlayerStats(nk: Nakama, userId: string, stats: PlayerStats): void {
  nk.storageWrite([
    {
      collection: PLAYER_STATS_COLLECTION,
      key: PLAYER_STATS_KEY,
      userId: userId,
      value: JSON.stringify(stats),
      permissionRead: 1,
      permissionWrite: 0
    }
  ]);
}

function createDefaultPlayerStats(): PlayerStats {
  return {
    wins: 0,
    losses: 0,
    gamesPlayed: 0,
    currentStreak: 0,
    bestStreak: 0
  };
}

function normalizePlayerStats(rawValue: any): PlayerStats {
  var parsed = typeof rawValue === "string" ? parseStatsValue(rawValue) : rawValue;
  var base = createDefaultPlayerStats();

  if (!parsed) {
    return base;
  }

  return {
    wins: toSafeNumber(parsed.wins),
    losses: toSafeNumber(parsed.losses),
    gamesPlayed: toSafeNumber(parsed.gamesPlayed),
    currentStreak: toSafeNumber(parsed.currentStreak),
    bestStreak: toSafeNumber(parsed.bestStreak)
  };
}

function parseStatsValue(rawValue: string): any {
  try {
    return JSON.parse(rawValue);
  } catch (_error) {
    return null;
  }
}

function toSafeNumber(value: any): number {
  if (typeof value === "number" && value >= 0) {
    return value;
  }

  return 0;
}

function getMatchModeFromParams(params: Record<string, string>): MatchMode {
  if (params.mode === "timed") {
    return "timed";
  }

  return "classic";
}

function getStateMatchLabelForMode(mode: MatchMode): string {
  if (mode === "timed") {
    return "tic_tac_toe_match_timed";
  }

  return "tic_tac_toe_match";
}
