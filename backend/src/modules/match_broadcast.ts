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
