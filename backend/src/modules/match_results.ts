function persistTurnTimeoutResult(
  nk: Nakama,
  logger: Logger,
  state: MatchState,
  timedOutPlayerId: string,
  timeoutWinnerId: string | null
): void {
  if (timeoutWinnerId !== null) {
    try {
      updatePlayerStats(nk, timeoutWinnerId, true);
      updatePlayerStats(nk, timedOutPlayerId, false);
      writeGlobalWinRecord(nk, state, timeoutWinnerId);
    } catch (error) {
      logger.error("Failed to persist timeout result.", {
        winner: timeoutWinnerId,
        loser: timedOutPlayerId,
        error: String(error)
      });
    }
  }

  persistCompletedMatchIfNeeded(nk, logger, state);
}

function persistWinResult(
  nk: Nakama,
  logger: Logger,
  state: MatchState,
  winnerId: string,
  loserId: string | null
): void {
  try {
    updatePlayerStats(nk, winnerId, true);

    if (loserId !== null) {
      updatePlayerStats(nk, loserId, false);
    }

    writeGlobalWinRecord(nk, state, winnerId);
  } catch (error) {
    logger.error("Failed to persist win result.", {
      winner: winnerId,
      error: String(error)
    });
  }

  persistCompletedMatchIfNeeded(nk, logger, state);
}

function persistDrawResult(nk: Nakama, logger: Logger, state: MatchState): void {
  try {
    if (state.players.length > 0) {
      updateDrawStats(nk, state.players[0]);
      resetPlayerStreak(nk, state.players[0]);
    }

    if (state.players.length > 1) {
      updateDrawStats(nk, state.players[1]);
      resetPlayerStreak(nk, state.players[1]);
    }
  } catch (error) {
    logger.error("Failed to persist draw result.", {
      error: String(error)
    });
  }

  persistCompletedMatchIfNeeded(nk, logger, state);
}

function persistReconnectTimeoutResult(
  nk: Nakama,
  logger: Logger,
  state: MatchState,
  winner: string | null
): void {
  var i: number;

  if (winner !== null) {
    try {
      updatePlayerStats(nk, winner, true);
      writeGlobalWinRecord(nk, state, winner);

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

  persistCompletedMatchIfNeeded(nk, logger, state);
}

function writeGlobalWinRecord(nk: Nakama, state: MatchState, winnerId: string): void {
  nk.leaderboardRecordWrite(
    GLOBAL_WINS_LEADERBOARD_ID,
    winnerId,
    getLeaderboardUsername(state, winnerId),
    1,
    0,
    {},
    null
  );
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
