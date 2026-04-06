var matchInit = function (
  ctx: RpcContext,
  logger: Logger,
  _nk: Nakama,
  params: Record<string, string>
): MatchInitResult<MatchState> {
  var mode = getMatchModeFromParams(params);
  var startTime = getCurrentUnixTimestamp();
  var matchId = params.matchId || "";
  var initialState = createInitialMatchState(matchId, mode, startTime);

  logger.info("matchInit executed.", {
    node: ctx.node,
    matchId: params.matchId,
    mode: mode
  });

  return {
    state: initialState,
    tickRate: 1,
    label: initialState.label
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
  var updatedSymbols = cloneSymbolMap(state.symbols);
  var updatedDisconnectedPlayers = cloneNumberMap(state.disconnectedPlayers);
  var updatedPlayerNames = cloneStringMap(state.playerNames);
  var currentTurn = state.currentTurn;
  var status: MatchStatus = state.status;
  var turnDeadlineTick = state.turnDeadlineTick;
  var pausedTurnRemainingSeconds = state.pausedTurnRemainingSeconds;
  var i: number;
  var playerId: string;
  var wasDisconnected = false;
  var previousLabel = state.label;

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

  var updatedState = createNextMatchState(state, {
    players: updatedPlayers,
    symbols: updatedSymbols,
    currentTurn: currentTurn,
    status: status,
    label: getLifecycleLabel(state.mode, status),
    disconnectedPlayers: updatedDisconnectedPlayers,
    playerNames: updatedPlayerNames,
    turnDeadlineTick: turnDeadlineTick,
    pausedTurnRemainingSeconds: pausedTurnRemainingSeconds
  });

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
  var updatedDisconnectedPlayers = cloneNumberMap(state.disconnectedPlayers);
  var updatedPlayerNames = cloneStringMap(state.playerNames);
  var turnDeadlineTick = state.turnDeadlineTick;
  var pausedTurnRemainingSeconds = state.pausedTurnRemainingSeconds;
  var i: number;
  var playerId: string;
  var disconnectedAt = getCurrentUnixTimestamp();
  var shouldPauseTurnTimer = false;

  logger.info("matchLeave executed.", {
    leftCount: presences.length
  });

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

  var updatedState = createNextMatchState(state, {
    disconnectedPlayers: updatedDisconnectedPlayers,
    playerNames: updatedPlayerNames,
    turnDeadlineTick: turnDeadlineTick,
    pausedTurnRemainingSeconds: pausedTurnRemainingSeconds
  });

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

    finalizeMatchState(
      state,
      tick,
      timeoutWinnerId,
      "turn-timeout",
      buildTurnTimeoutText(state, timedOutPlayerId, timeoutWinnerId)
    );

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
      finalizeMatchState(state, tick, playerId, "win", buildWinText(state, playerId, loserId));

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
      finalizeMatchState(state, tick, null, "draw", "The match ended in a draw.");

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

  finalizeMatchState(
    state,
    tick,
    winner,
    "reconnect-timeout",
    buildReconnectTimeoutText(state, winner, expiredDisconnectedPlayers)
  );
  state.endTime = now;

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
