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
  var label = getLifecycleLabel(mode, "waiting");
  var startTime = getCurrentUnixTimestamp();
  var matchId = params.matchId || "";

  logger.info("matchInit executed.", {
    node: ctx.node,
    matchId: params.matchId,
    mode: mode
  });

  return {
    state: {
      matchId: matchId,
      historyKey: createHistoryKey(matchId, mode, startTime),
      board: ["", "", "", "", "", "", "", "", ""],
      players: [],
      symbols: {},
      currentTurn: null,
      winner: null,
      status: "waiting",
      label: label,
      startTime: startTime,
      endTime: null,
      moveHistory: [],
      mode: mode,
      disconnectedPlayers: {},
      playerNames: {},
      disconnectTimeoutSeconds: DISCONNECT_TIMEOUT_SECONDS,
      turnDeadlineTick: null,
      pausedTurnRemainingSeconds: null,
      endReason: null,
      endReasonText: null,
      historyPersisted: false
    },
    tickRate: 1,
    label: label
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
  var isReturningPlayer = state.players.indexOf(presence.userId) !== -1;
  var accept = isReturningPlayer || (state.players.length < 2 && state.status !== "finished");

  logger.info("matchJoinAttempt executed.", {
    userId: presence.userId,
    currentPlayerCount: state.players.length,
    isReturningPlayer: isReturningPlayer,
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
): MatchJoinResult<MatchState> {
  var updatedPlayers: string[] = state.players.slice();
  var updatedSymbols: Record<string, "X" | "O"> = {};
  var updatedDisconnectedPlayers: Record<string, number> = {};
  var updatedPlayerNames: Record<string, string> = {};
  var currentTurn = state.currentTurn;
  var status: MatchStatus = state.status;
  var turnDeadlineTick = state.turnDeadlineTick;
  var pausedTurnRemainingSeconds = state.pausedTurnRemainingSeconds;
  var i: number;
  var playerId: string;
  var wasDisconnected = false;
  var previousLabel = state.label;

  for (playerId in state.symbols) {
    if (state.symbols.hasOwnProperty(playerId)) {
      updatedSymbols[playerId] = state.symbols[playerId];
    }
  }

  for (playerId in state.disconnectedPlayers) {
    if (state.disconnectedPlayers.hasOwnProperty(playerId)) {
      updatedDisconnectedPlayers[playerId] = state.disconnectedPlayers[playerId];
    }
  }

  for (playerId in state.playerNames) {
    if (state.playerNames.hasOwnProperty(playerId)) {
      updatedPlayerNames[playerId] = state.playerNames[playerId];
    }
  }

  logger.info("matchJoin executed.", {
    joinedCount: presences.length
  });

  for (i = 0; i < presences.length; i += 1) {
    playerId = presences[i].userId;

    if (updatedDisconnectedPlayers[playerId] !== undefined) {
      delete updatedDisconnectedPlayers[playerId];
      wasDisconnected = true;
    }

    if (presences[i].username) {
      updatedPlayerNames[playerId] = presences[i].username as string;
    } else if (updatedPlayerNames[playerId] === undefined) {
      updatedPlayerNames[playerId] = "Guest";
    }

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
    if (status === "waiting") {
      status = "active";
      currentTurn = updatedPlayers[0];
      turnDeadlineTick = state.mode === "timed" ? tick + TURN_TIMEOUT_SECONDS : null;
      pausedTurnRemainingSeconds = null;

      logger.info("Match activated.", {
        firstPlayer: updatedPlayers[0],
        secondPlayer: updatedPlayers[1],
        currentTurn: currentTurn,
        mode: state.mode,
        turnDeadlineTick: turnDeadlineTick
      });
    } else if (
      state.mode === "timed" &&
      state.status === "active" &&
      wasDisconnected &&
      !hasDisconnectedPlayers(updatedDisconnectedPlayers) &&
      currentTurn !== null &&
      turnDeadlineTick === null
    ) {
      turnDeadlineTick = tick + getReconnectTurnWindow(pausedTurnRemainingSeconds);
      pausedTurnRemainingSeconds = null;

      logger.info("Restored timed turn deadline after reconnect.", {
        currentTurn: currentTurn,
        turnDeadlineTick: turnDeadlineTick
      });
    }
  }

  var updatedState: MatchState = {
    matchId: state.matchId,
    historyKey: state.historyKey,
    board: state.board,
    players: updatedPlayers,
    symbols: updatedSymbols,
    currentTurn: currentTurn,
    winner: state.winner,
    status: status,
    label: getLifecycleLabel(state.mode, status),
    startTime: state.startTime,
    endTime: state.endTime,
    moveHistory: state.moveHistory,
    mode: state.mode,
    disconnectedPlayers: updatedDisconnectedPlayers,
    playerNames: updatedPlayerNames,
    disconnectTimeoutSeconds: state.disconnectTimeoutSeconds,
    turnDeadlineTick: turnDeadlineTick,
    pausedTurnRemainingSeconds: pausedTurnRemainingSeconds,
    endReason: state.endReason,
    endReasonText: state.endReasonText,
    historyPersisted: state.historyPersisted
  };

  updateMatchLabelIfNeeded(dispatcher, previousLabel, updatedState.label);

  broadcastMatchState(dispatcher, updatedState, tick);

  return {
    state: updatedState
  };
};

var matchLeave = function (
  _ctx: RpcContext,
  logger: Logger,
  _nk: Nakama,
  _dispatcher: MatchDispatcher,
  tick: number,
  state: MatchState,
  presences: Presence[]
): MatchLeaveResult<MatchState> {
  var updatedDisconnectedPlayers: Record<string, number> = {};
  var updatedPlayerNames: Record<string, string> = {};
  var turnDeadlineTick = state.turnDeadlineTick;
  var pausedTurnRemainingSeconds = state.pausedTurnRemainingSeconds;
  var i: number;
  var playerId: string;
  var disconnectedAt = getCurrentUnixTimestamp();
  var shouldPauseTurnTimer = false;

  logger.info("matchLeave executed.", {
    leftCount: presences.length
  });

  for (playerId in state.disconnectedPlayers) {
    if (state.disconnectedPlayers.hasOwnProperty(playerId)) {
      updatedDisconnectedPlayers[playerId] = state.disconnectedPlayers[playerId];
    }
  }

  for (playerId in state.playerNames) {
    if (state.playerNames.hasOwnProperty(playerId)) {
      updatedPlayerNames[playerId] = state.playerNames[playerId];
    }
  }

  for (i = 0; i < presences.length; i += 1) {
    playerId = presences[i].userId;

    if (state.players.indexOf(playerId) !== -1) {
      updatedDisconnectedPlayers[playerId] = disconnectedAt;
      shouldPauseTurnTimer = true;
    }
  }

  if (
    shouldPauseTurnTimer &&
    state.mode === "timed" &&
    state.status === "active" &&
    state.currentTurn !== null &&
    turnDeadlineTick !== null
  ) {
    pausedTurnRemainingSeconds = getRemainingTurnSeconds(turnDeadlineTick, tick);
    turnDeadlineTick = null;

    logger.info("Paused timed turn deadline because a player disconnected.", {
      pausedTurnRemainingSeconds: pausedTurnRemainingSeconds
    });
  }

  var updatedState: MatchState = {
    matchId: state.matchId,
    historyKey: state.historyKey,
    board: state.board,
    players: state.players,
    symbols: state.symbols,
    currentTurn: state.currentTurn,
    winner: state.winner,
    status: state.status,
    label: state.label,
    startTime: state.startTime,
    endTime: state.endTime,
    moveHistory: state.moveHistory,
    mode: state.mode,
    disconnectedPlayers: updatedDisconnectedPlayers,
    playerNames: updatedPlayerNames,
    disconnectTimeoutSeconds: state.disconnectTimeoutSeconds,
    turnDeadlineTick: turnDeadlineTick,
    pausedTurnRemainingSeconds: pausedTurnRemainingSeconds,
    endReason: state.endReason,
    endReasonText: state.endReasonText,
    historyPersisted: state.historyPersisted
  };

  broadcastMatchState(_dispatcher, updatedState, tick);

  return {
    state: updatedState
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

  if (state.status !== "finished" && hasDisconnectedPlayers(state.disconnectedPlayers)) {
    if (finalizeExpiredDisconnects(state, tick, logger, _nk, dispatcher)) {
      return {
        state: state
      };
    }
  }

  if (
    state.status === "active" &&
    state.mode === "timed" &&
    !hasDisconnectedPlayers(state.disconnectedPlayers) &&
    state.currentTurn !== null &&
    state.turnDeadlineTick !== null &&
    tick >= state.turnDeadlineTick
  ) {
    var previousLabel = state.label;
    timedOutPlayerId = state.currentTurn;
    timeoutWinnerId = getOtherPlayerId(state.players, timedOutPlayerId);

    state.status = "finished";
    state.currentTurn = null;
    state.turnDeadlineTick = null;
    state.pausedTurnRemainingSeconds = null;
    state.endTime = getCurrentUnixTimestamp();
    state.winner = timeoutWinnerId;
    state.endReason = "turn-timeout";
    state.endReasonText = buildTurnTimeoutText(state, timedOutPlayerId, timeoutWinnerId);
    state.label = getLifecycleLabel(state.mode, state.status);

    logger.info("Turn timer expired. Auto-forfeit applied.", {
      timedOutPlayerId: timedOutPlayerId,
      winner: timeoutWinnerId
    });

    if (timeoutWinnerId !== null) {
      try {
        updatePlayerStats(_nk, timeoutWinnerId, true);
        updatePlayerStats(_nk, timedOutPlayerId, false);
        _nk.leaderboardRecordWrite(
          GLOBAL_WINS_LEADERBOARD_ID,
          timeoutWinnerId,
          getLeaderboardUsername(state, timeoutWinnerId),
          1,
          0,
          {},
          null
        );
      } catch (error) {
        logger.error("Failed to persist timeout result.", {
          winner: timeoutWinnerId,
          loser: timedOutPlayerId,
          error: String(error)
        });
      }
    }

    updateMatchLabelIfNeeded(dispatcher, previousLabel, state.label);
    persistCompletedMatchIfNeeded(_nk, logger, state);
    broadcastMatchState(dispatcher, state, tick);

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

    if (hasDisconnectedPlayers(state.disconnectedPlayers)) {
      logger.info("Rejected move: waiting for disconnected player to reconnect.", {
        userId: message.sender.userId
      });
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
        userId: playerId,
        payloadDebug: describePayloadForLog(message.data)
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
      var previousWinLabel = state.label;
      loserId = getOtherPlayerId(state.players, playerId);
      state.winner = playerId;
      state.status = "finished";
      state.currentTurn = null;
      state.turnDeadlineTick = null;
      state.pausedTurnRemainingSeconds = null;
      state.endTime = getCurrentUnixTimestamp();
      state.endReason = "win";
      state.endReasonText = buildWinText(state, playerId, loserId);
      state.label = getLifecycleLabel(state.mode, state.status);

      try {
        updatePlayerStats(_nk, playerId, true);

        if (loserId !== null) {
          updatePlayerStats(_nk, loserId, false);
        }

        _nk.leaderboardRecordWrite(
          GLOBAL_WINS_LEADERBOARD_ID,
          playerId,
          getLeaderboardUsername(state, playerId),
          1,
          0,
          {},
          null
        );
      } catch (error) {
        logger.error("Failed to persist win result.", {
          winner: playerId,
          error: String(error)
        });
      }

      updateMatchLabelIfNeeded(dispatcher, previousWinLabel, state.label);
      persistCompletedMatchIfNeeded(_nk, logger, state);
    } else if (isBoardFull(state.board)) {
      var previousDrawLabel = state.label;
      state.status = "finished";
      state.currentTurn = null;
      state.turnDeadlineTick = null;
      state.pausedTurnRemainingSeconds = null;
      state.endTime = getCurrentUnixTimestamp();
      state.winner = null;
      state.endReason = "draw";
      state.endReasonText = "The match ended in a draw.";
      state.label = getLifecycleLabel(state.mode, state.status);

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

      updateMatchLabelIfNeeded(dispatcher, previousDrawLabel, state.label);
      persistCompletedMatchIfNeeded(_nk, logger, state);
    } else {
      nextPlayer = getOtherPlayerId(state.players, playerId);
      state.currentTurn = nextPlayer;
      state.turnDeadlineTick = state.mode === "timed" ? tick + TURN_TIMEOUT_SECONDS : null;
    }

    broadcastMatchState(dispatcher, state, tick);
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
): MatchStateResult<MatchState> {
  logger.info("matchTerminate executed.", {
    graceSeconds: graceSeconds
  });

  return {
    state: state
  };
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

function parseMovePayload(data: any): MovePayload | null {
  var normalizedPayload = normalizePayloadString(data);
  var decodedPayload: string | null;

  if (normalizedPayload === null) {
    return null;
  }

  try {
    return JSON.parse(normalizedPayload) as MovePayload;
  } catch (_error) {
    decodedPayload = decodeBase64Payload(normalizedPayload);

    if (decodedPayload === null) {
      return null;
    }

    try {
      return JSON.parse(decodedPayload) as MovePayload;
    } catch (_decodeError) {
      return null;
    }
  }
}

function normalizePayloadString(data: any): string | null {
  var i: number;
  var value: number;
  var output = "";
  var byteView: Uint8Array | null = null;

  if (typeof data === "string") {
    return data;
  }

  if (data === null || data === undefined) {
    return null;
  }

  if (typeof ArrayBuffer !== "undefined") {
    if (data instanceof ArrayBuffer) {
      byteView = new Uint8Array(data);
    } else if (
      typeof ArrayBuffer.isView === "function" &&
      ArrayBuffer.isView(data) &&
      data.buffer instanceof ArrayBuffer
    ) {
      byteView = new Uint8Array(data.buffer, data.byteOffset || 0, data.byteLength || 0);
    }
  }

  if (byteView !== null) {
    for (i = 0; i < byteView.length; i += 1) {
      output += String.fromCharCode(byteView[i]);
    }

    return output;
  }

  if (typeof data.length === "number") {
    for (i = 0; i < data.length; i += 1) {
      value = data[i];

      if (typeof value !== "number") {
        return null;
      }

      output += String.fromCharCode(value);
    }

    return output;
  }

  return null;
}

function describePayloadForLog(data: any): string {
  var normalizedPayload = normalizePayloadString(data);
  var stringValue: string;

  if (normalizedPayload !== null) {
    return "normalized:" + normalizedPayload;
  }

  try {
    stringValue = String(data);
  } catch (_error) {
    stringValue = "[stringify-failed]";
  }

  return (
    "type=" +
    typeof data +
    " string=" +
    stringValue +
    " json=" +
    safeJsonStringify(data)
  );
}

function safeJsonStringify(value: any): string {
  try {
    return JSON.stringify(value);
  } catch (_error) {
    return "[json-failed]";
  }
}

function decodeBase64Payload(data: string): string | null {
  var normalizedData = normalizePayloadString(data);
  var base64Chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  var cleanData: string;
  var output = "";
  var i: number;
  var enc1: number;
  var enc2: number;
  var enc3: number;
  var enc4: number;
  var chr1: number;
  var chr2: number;
  var chr3: number;

  if (normalizedData === null) {
    return null;
  }

  cleanData = normalizedData.replace(/\s+/g, "");

  if (!cleanData || cleanData.length % 4 !== 0) {
    return null;
  }

  for (i = 0; i < cleanData.length; i += 4) {
    enc1 = base64Chars.indexOf(cleanData.charAt(i));
    enc2 = base64Chars.indexOf(cleanData.charAt(i + 1));
    enc3 = cleanData.charAt(i + 2) === "=" ? 64 : base64Chars.indexOf(cleanData.charAt(i + 2));
    enc4 = cleanData.charAt(i + 3) === "=" ? 64 : base64Chars.indexOf(cleanData.charAt(i + 3));

    if (enc1 < 0 || enc2 < 0 || (enc3 < 0 && enc3 !== 64) || (enc4 < 0 && enc4 !== 64)) {
      return null;
    }

    chr1 = (enc1 << 2) | (enc2 >> 4);
    output += String.fromCharCode(chr1);

    if (enc3 !== 64) {
      chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
      output += String.fromCharCode(chr2);
    }

    if (enc4 !== 64) {
      chr3 = ((enc3 & 3) << 6) | enc4;
      output += String.fromCharCode(chr3);
    }
  }

  return output;
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

function broadcastMatchState(
  dispatcher: MatchDispatcher,
  state: MatchState,
  tick?: number
): void {
  dispatcher.broadcastMessage(
    STATE_UPDATE_OPCODE,
    JSON.stringify({
      board: state.board,
      players: state.players,
      symbols: state.symbols,
      currentTurn: state.currentTurn,
      winner: state.winner,
      status: state.status,
      label: state.label,
      startTime: state.startTime,
      endTime: state.endTime,
      moveHistory: state.moveHistory,
      mode: state.mode,
      disconnectedPlayers: state.disconnectedPlayers,
      playerNames: state.playerNames,
      disconnectTimeoutSeconds: state.disconnectTimeoutSeconds,
      turnDeadlineTick: state.turnDeadlineTick,
      turnSecondsRemaining: getTurnSecondsRemainingForBroadcast(state, tick),
      turnExpiresAt: getTurnExpiresAtForBroadcast(state, tick),
      serverTime: getCurrentUnixTimestamp(),
      endReason: state.endReason,
      endReasonText: state.endReasonText
    })
  );
}

function getTurnSecondsRemainingForBroadcast(
  state: MatchState,
  tick?: number
): number | null {
  if (state.mode !== "timed" || state.status !== "active") {
    return null;
  }

  if (state.turnDeadlineTick !== null && tick !== undefined) {
    return getRemainingTurnSeconds(state.turnDeadlineTick, tick);
  }

  if (state.pausedTurnRemainingSeconds !== null) {
    return state.pausedTurnRemainingSeconds;
  }

  return null;
}

function getTurnExpiresAtForBroadcast(
  state: MatchState,
  tick?: number
): number | null {
  var remainingSeconds = getTurnSecondsRemainingForBroadcast(state, tick);

  if (remainingSeconds === null) {
    return null;
  }

  return getCurrentUnixTimestamp() + remainingSeconds;
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
      value: stats as any,
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

function getLifecycleLabel(mode: MatchMode, status: MatchStatus): string {
  return MATCH_LABEL_PREFIX + ":" + mode + ":" + status;
}

function updateMatchLabelIfNeeded(dispatcher: MatchDispatcher, previousLabel: string, nextLabel: string): void {
  if (previousLabel === nextLabel) {
    return;
  }

  dispatcher.matchLabelUpdate(nextLabel);
}

function hasDisconnectedPlayers(disconnectedPlayers: Record<string, number>): boolean {
  var playerId: string;

  for (playerId in disconnectedPlayers) {
    if (disconnectedPlayers.hasOwnProperty(playerId)) {
      return true;
    }
  }

  return false;
}

function getCurrentUnixTimestamp(): number {
  return Math.floor(new Date().getTime() / 1000);
}

function getPlayerDisplayName(state: MatchState, playerId: string | null): string {
  if (playerId === null) {
    return "Unknown player";
  }

  if (state.playerNames[playerId] && !isLikelyRawPlayerId(state.playerNames[playerId])) {
    return state.playerNames[playerId];
  }

  return "Guest";
}

function getLeaderboardUsername(state: MatchState, playerId: string | null): string {
  return getPlayerDisplayName(state, playerId);
}

function isLikelyRawPlayerId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function buildWinText(state: MatchState, winnerId: string, loserId: string | null): string {
  if (loserId === null) {
    return getPlayerDisplayName(state, winnerId) + " won by completing a line.";
  }

  return (
    getPlayerDisplayName(state, winnerId) +
    " won by completing a line against " +
    getPlayerDisplayName(state, loserId)
  );
}

function buildTurnTimeoutText(
  state: MatchState,
  timedOutPlayerId: string | null,
  winnerId: string | null
): string {
  if (winnerId === null) {
    return "Turn timer expired before the match could decide a winner.";
  }

  if (timedOutPlayerId === null) {
    return getPlayerDisplayName(state, winnerId) + " won by timeout forfeit.";
  }

  return (
    getPlayerDisplayName(state, winnerId) +
    " won by timeout forfeit after " +
    getPlayerDisplayName(state, timedOutPlayerId) +
    " ran out of time."
  );
}

function buildReconnectTimeoutText(
  state: MatchState,
  winnerId: string | null,
  expiredPlayers: string[]
): string {
  var i: number;
  var expiredNames = [];

  for (i = 0; i < expiredPlayers.length; i += 1) {
    expiredNames.push(getPlayerDisplayName(state, expiredPlayers[i]));
  }

  if (winnerId === null) {
    return "The match ended after the reconnect window expired for " + expiredNames.join(", ") + ".";
  }

  return (
    getPlayerDisplayName(state, winnerId) +
    " won by reconnect-timeout forfeit after " +
    expiredNames.join(", ") +
    " failed to return in time."
  );
}

function getRemainingTurnSeconds(turnDeadlineTick: number, tick: number): number {
  var remaining = turnDeadlineTick - tick;

  if (remaining < 1) {
    return 1;
  }

  return remaining;
}

function getReconnectTurnWindow(pausedTurnRemainingSeconds: number | null): number {
  if (pausedTurnRemainingSeconds !== null && pausedTurnRemainingSeconds > 0) {
    return pausedTurnRemainingSeconds;
  }

  return TURN_TIMEOUT_SECONDS;
}

function finalizeExpiredDisconnects(
  state: MatchState,
  tick: number,
  logger: Logger,
  nk: Nakama,
  dispatcher: MatchDispatcher
): boolean {
  var now = getCurrentUnixTimestamp();
  var connectedPlayers = getConnectedPlayers(state.players, state.disconnectedPlayers);
  var expiredDisconnectedPlayers = getExpiredDisconnectedPlayers(
    state.disconnectedPlayers,
    state.disconnectTimeoutSeconds,
    now
  );
  var winner: string | null = null;
  var i: number;
  var previousLabel = state.label;

  if (expiredDisconnectedPlayers.length === 0) {
    return false;
  }

  if (connectedPlayers.length > 0) {
    winner = connectedPlayers[0];
  } else if (!haveAllDisconnectedPlayersExpired(state.players, state.disconnectedPlayers, now, state.disconnectTimeoutSeconds)) {
    return false;
  }

  state.status = "finished";
  state.currentTurn = null;
  state.turnDeadlineTick = null;
  state.pausedTurnRemainingSeconds = null;
  state.endTime = now;
  state.winner = winner;
  state.endReason = "reconnect-timeout";
  state.endReasonText = buildReconnectTimeoutText(state, winner, expiredDisconnectedPlayers);
  state.label = getLifecycleLabel(state.mode, state.status);

  logger.info("Reconnect timeout expired. Finalizing match.", {
    expiredDisconnectedPlayers: expiredDisconnectedPlayers,
    winner: winner,
    tick: tick
  });

  if (winner !== null) {
    try {
      updatePlayerStats(nk, winner, true);
      nk.leaderboardRecordWrite(
        GLOBAL_WINS_LEADERBOARD_ID,
        winner,
        getLeaderboardUsername(state, winner),
        1,
        0,
        {},
        null
      );

      for (i = 0; i < state.players.length; i += 1) {
        if (state.players[i] !== winner) {
          updatePlayerStats(nk, state.players[i], false);
        }
      }
    } catch (error) {
      logger.error("Failed to persist reconnect-timeout result.", {
        winner: winner,
        error: String(error)
      });
    }
  }

  updateMatchLabelIfNeeded(dispatcher, previousLabel, state.label);
  persistCompletedMatchIfNeeded(nk, logger, state);
  broadcastMatchState(dispatcher, state);

  return true;
}

function getConnectedPlayers(players: string[], disconnectedPlayers: Record<string, number>): string[] {
  var connectedPlayers: string[] = [];
  var i: number;

  for (i = 0; i < players.length; i += 1) {
    if (disconnectedPlayers[players[i]] === undefined) {
      connectedPlayers.push(players[i]);
    }
  }

  return connectedPlayers;
}

function getExpiredDisconnectedPlayers(
  disconnectedPlayers: Record<string, number>,
  disconnectTimeoutSeconds: number,
  now: number
): string[] {
  var expiredPlayers: string[] = [];
  var playerId: string;

  for (playerId in disconnectedPlayers) {
    if (
      disconnectedPlayers.hasOwnProperty(playerId) &&
      now - disconnectedPlayers[playerId] >= disconnectTimeoutSeconds
    ) {
      expiredPlayers.push(playerId);
    }
  }

  return expiredPlayers;
}

function haveAllDisconnectedPlayersExpired(
  players: string[],
  disconnectedPlayers: Record<string, number>,
  now: number,
  disconnectTimeoutSeconds: number
): boolean {
  var i: number;
  var playerId: string;

  for (i = 0; i < players.length; i += 1) {
    playerId = players[i];

    if (
      disconnectedPlayers[playerId] === undefined ||
      now - disconnectedPlayers[playerId] < disconnectTimeoutSeconds
    ) {
      return false;
    }
  }

  return players.length > 0;
}

function persistCompletedMatchIfNeeded(nk: Nakama, logger: Logger, state: MatchState): void {
  var durationSeconds: number;
  var historyRecord: Record<string, unknown>;

  if (state.status !== "finished" || state.historyPersisted) {
    return;
  }

  durationSeconds = getMatchDurationSeconds(state.startTime, state.endTime);
  historyRecord = {
    matchId: state.matchId,
    timestamp: state.endTime || getCurrentUnixTimestamp(),
    durationSeconds: durationSeconds,
    mode: state.mode,
    winner: state.winner,
    players: state.players,
    playerNames: state.playerNames,
    moveHistory: state.moveHistory,
    endReason: state.endReason,
    endReasonText: state.endReasonText
  };

  try {
    nk.storageWrite([
      {
        collection: MATCH_HISTORY_COLLECTION,
        key: state.historyKey,
        value: historyRecord as any,
        permissionRead: 0,
        permissionWrite: 0
      }
    ]);

    upsertMatchHistoryIndex(nk, state, durationSeconds);

    state.historyPersisted = true;
  } catch (error) {
    logger.error("Failed to persist match history.", {
      matchId: state.matchId,
      error: String(error)
    });
  }
}

function createHistoryKey(matchId: string, mode: MatchMode, startTime: number): string {
  if (matchId) {
    return matchId;
  }

  return MATCH_HISTORY_COLLECTION + ":" + mode + ":" + String(startTime) + ":" + createRandomSuffix();
}

function createRandomSuffix(): string {
  return String(new Date().getTime()) + ":" + String(Math.floor(Math.random() * 1000000));
}

function getMatchDurationSeconds(startTime: number, endTime: number | null): number {
  if (endTime === null || endTime < startTime) {
    return 0;
  }

  return endTime - startTime;
}
