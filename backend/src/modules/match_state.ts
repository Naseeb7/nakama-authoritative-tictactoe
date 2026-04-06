function createInitialMatchState(matchId: string, mode: MatchMode, startTime: number): MatchState {
  return {
    matchId: matchId,
    historyKey: createHistoryKey(matchId, mode, startTime),
    board: ["", "", "", "", "", "", "", "", ""],
    players: [],
    symbols: {},
    currentTurn: null,
    winner: null,
    status: "waiting",
    label: getLifecycleLabel(mode, "waiting"),
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
  };
}

function createNextMatchState(
  state: MatchState,
  overrides: Partial<MatchState>
): MatchState {
  return {
    matchId: hasOwnProperty(overrides, "matchId") ? overrides.matchId as string : state.matchId,
    historyKey: hasOwnProperty(overrides, "historyKey") ? overrides.historyKey as string : state.historyKey,
    board: hasOwnProperty(overrides, "board") ? overrides.board as MatchState["board"] : state.board,
    players: hasOwnProperty(overrides, "players") ? overrides.players as string[] : state.players,
    symbols: hasOwnProperty(overrides, "symbols")
      ? overrides.symbols as Record<string, "X" | "O">
      : state.symbols,
    currentTurn: hasOwnProperty(overrides, "currentTurn")
      ? overrides.currentTurn as string | null
      : state.currentTurn,
    winner: hasOwnProperty(overrides, "winner") ? overrides.winner as string | null : state.winner,
    status: hasOwnProperty(overrides, "status") ? overrides.status as MatchStatus : state.status,
    label: hasOwnProperty(overrides, "label") ? overrides.label as string : state.label,
    startTime: hasOwnProperty(overrides, "startTime") ? overrides.startTime as number : state.startTime,
    endTime: hasOwnProperty(overrides, "endTime") ? overrides.endTime as number | null : state.endTime,
    moveHistory: hasOwnProperty(overrides, "moveHistory")
      ? overrides.moveHistory as MoveHistoryEntry[]
      : state.moveHistory,
    mode: hasOwnProperty(overrides, "mode") ? overrides.mode as MatchMode : state.mode,
    disconnectedPlayers: hasOwnProperty(overrides, "disconnectedPlayers")
      ? overrides.disconnectedPlayers as Record<string, number>
      : state.disconnectedPlayers,
    playerNames: hasOwnProperty(overrides, "playerNames")
      ? overrides.playerNames as Record<string, string>
      : state.playerNames,
    disconnectTimeoutSeconds: hasOwnProperty(overrides, "disconnectTimeoutSeconds")
      ? overrides.disconnectTimeoutSeconds as number
      : state.disconnectTimeoutSeconds,
    turnDeadlineTick: hasOwnProperty(overrides, "turnDeadlineTick")
      ? overrides.turnDeadlineTick as number | null
      : state.turnDeadlineTick,
    pausedTurnRemainingSeconds: hasOwnProperty(overrides, "pausedTurnRemainingSeconds")
      ? overrides.pausedTurnRemainingSeconds as number | null
      : state.pausedTurnRemainingSeconds,
    endReason: hasOwnProperty(overrides, "endReason")
      ? overrides.endReason as MatchEndReason | null
      : state.endReason,
    endReasonText: hasOwnProperty(overrides, "endReasonText")
      ? overrides.endReasonText as string | null
      : state.endReasonText,
    historyPersisted: hasOwnProperty(overrides, "historyPersisted")
      ? overrides.historyPersisted as boolean
      : state.historyPersisted,
    finishedTick: hasOwnProperty(overrides, "finishedTick")
      ? overrides.finishedTick as number | null
      : state.finishedTick
  };
}

function cloneSymbolMap(symbols: Record<string, "X" | "O">): Record<string, "X" | "O"> {
  var output: Record<string, "X" | "O"> = {};
  var playerId: string;

  for (playerId in symbols) {
    if (symbols.hasOwnProperty(playerId)) {
      output[playerId] = symbols[playerId];
    }
  }

  return output;
}

function cloneNumberMap(values: Record<string, number>): Record<string, number> {
  var output: Record<string, number> = {};
  var key: string;

  for (key in values) {
    if (values.hasOwnProperty(key)) {
      output[key] = values[key];
    }
  }

  return output;
}

function cloneStringMap(values: Record<string, string>): Record<string, string> {
  var output: Record<string, string> = {};
  var key: string;

  for (key in values) {
    if (values.hasOwnProperty(key)) {
      output[key] = values[key];
    }
  }

  return output;
}

function finalizeMatchState(
  state: MatchState,
  tick: number,
  winner: string | null,
  endReason: MatchEndReason,
  endReasonText: string
): void {
  state.status = "finished";
  state.currentTurn = null;
  state.turnDeadlineTick = null;
  state.pausedTurnRemainingSeconds = null;
  state.endTime = getCurrentUnixTimestamp();
  state.winner = winner;
  state.endReason = endReason;
  state.endReasonText = endReasonText;
  state.label = getLifecycleLabel(state.mode, "finished");
  state.finishedTick = tick;
}

function hasOwnProperty(value: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}
