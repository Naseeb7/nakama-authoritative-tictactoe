type MatchStatus = "waiting" | "active" | "finished";
var MOVE_OPCODE = 1;
var STATE_UPDATE_OPCODE = 2;

interface MoveHistoryEntry {
  playerId: string;
  position: number;
}

interface MatchState {
  board: [string, string, string, string, string, string, string, string, string];
  players: string[];
  symbols: Record<string, "X" | "O">;
  currentTurn: string | null;
  winner: string | null;
  status: MatchStatus;
  moveHistory: MoveHistoryEntry[];
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
  logger.info("matchInit executed.", {
    node: ctx.node,
    matchId: params.matchId
  });

  return {
    state: {
      board: ["", "", "", "", "", "", "", "", ""],
      players: [],
      symbols: {},
      currentTurn: null,
      winner: null,
      status: "waiting",
      moveHistory: []
    },
    tickRate: 1,
    label: "tic_tac_toe_match"
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
  _tick: number,
  state: MatchState,
  presences: Presence[]
): MatchState {
  var updatedPlayers: string[] = state.players.slice();
  var updatedSymbols: Record<string, "X" | "O"> = {};
  var currentTurn = state.currentTurn;
  var status: MatchStatus = state.status;
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

    logger.info("Match activated.", {
      firstPlayer: updatedPlayers[0],
      secondPlayer: updatedPlayers[1],
      currentTurn: currentTurn
    });
  }

  var updatedState: MatchState = {
    board: state.board,
    players: updatedPlayers,
    symbols: updatedSymbols,
    currentTurn: currentTurn,
    winner: state.winner,
    status: status,
    moveHistory: state.moveHistory
  };

  dispatcher.broadcastMessage(
    STATE_UPDATE_OPCODE,
    JSON.stringify({
      board: updatedState.board,
      players: updatedState.players,
      symbols: updatedState.symbols,
      currentTurn: updatedState.currentTurn,
      winner: updatedState.winner,
      status: updatedState.status,
      moveHistory: updatedState.moveHistory
    })
  );

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

    logger.info("Active match ended due to disconnect.", {
      winner: winner
    });
  } else if (updatedPlayers.length === 0) {
    currentTurn = null;
  }

  return {
    board: state.board,
    players: updatedPlayers,
    symbols: updatedSymbols,
    currentTurn: currentTurn,
    winner: winner,
    status: status,
    moveHistory: state.moveHistory
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

  logger.info("matchLoop executed.", {
    tick: tick,
    messageCount: messages.length
  });

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
    } else if (isBoardFull(state.board)) {
      state.status = "finished";
      state.currentTurn = null;
    } else {
      nextPlayer = getOtherPlayerId(state.players, playerId);
      state.currentTurn = nextPlayer;
    }

    dispatcher.broadcastMessage(
      STATE_UPDATE_OPCODE,
      JSON.stringify({
        board: state.board,
        currentTurn: state.currentTurn,
        winner: state.winner,
        status: state.status,
        moveHistory: state.moveHistory
      })
    );
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
