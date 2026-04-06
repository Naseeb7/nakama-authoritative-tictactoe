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
      historyPersisted: false,
      finishedTick: null
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
  var accept = state.status !== "finished" && (isReturningPlayer || state.players.length < 2);

  logger.info("matchJoinAttempt executed.", {
    userId: presence.userId,
    currentPlayerCount: state.players.length,
    isReturningPlayer: isReturningPlayer,
    accept: accept
  });

  return {
    state: state,
    accept: accept,
    rejectMessage: accept
      ? undefined
      : state.status === "finished"
        ? "Match has already ended."
        : "Match is full."
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
    historyPersisted: state.historyPersisted,
    finishedTick: state.finishedTick
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
): MatchLeaveResult<MatchState> | null {
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
    historyPersisted: state.historyPersisted,
    finishedTick: state.finishedTick
  };

  if (updatedState.status === "finished" && haveAllPlayersDisconnected(updatedState)) {
    logger.info("Stopping finished match after all players left.", {
      matchId: updatedState.matchId
    });

    return null;
  }

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
): MatchStateResult<MatchState> | null {
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

  if (state.status === "finished" && shouldStopFinishedMatch(state, tick)) {
    logger.info("Stopping finished match after grace period.", {
      matchId: state.matchId,
      tick: tick,
      finishedTick: state.finishedTick
    });

    return null;
  }

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
    state.finishedTick = tick;

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
      state.finishedTick = tick;

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
      state.finishedTick = tick;

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
  state.finishedTick = tick;

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
