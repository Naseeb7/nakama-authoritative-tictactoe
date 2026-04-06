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

function haveAllPlayersDisconnected(state: MatchState): boolean {
  var i: number;
  var playerId: string;

  if (state.players.length === 0) {
    return true;
  }

  for (i = 0; i < state.players.length; i += 1) {
    playerId = state.players[i];

    if (state.disconnectedPlayers[playerId] === undefined) {
      return false;
    }
  }

  return true;
}

function shouldStopFinishedMatch(state: MatchState, tick: number): boolean {
  if (haveAllPlayersDisconnected(state)) {
    return true;
  }

  if (state.finishedTick === null) {
    return false;
  }

  return tick - state.finishedTick >= FINISHED_MATCH_TTL_SECONDS;
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
