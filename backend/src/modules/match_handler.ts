type MatchStatus = "waiting" | "active" | "finished";

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
  _dispatcher: MatchDispatcher,
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

  return {
    board: state.board,
    players: updatedPlayers,
    symbols: updatedSymbols,
    currentTurn: currentTurn,
    winner: state.winner,
    status: status,
    moveHistory: state.moveHistory
  };
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
  _dispatcher: MatchDispatcher,
  tick: number,
  state: MatchState,
  messages: MatchMessage[]
): MatchStateResult<MatchState> {
  var i: number;
  var message: MatchMessage;

  logger.info("matchLoop executed.", {
    tick: tick,
    messageCount: messages.length
  });

  for (i = 0; i < messages.length; i += 1) {
    message = messages[i];

    logger.info("Received match message.", {
      opCode: message.opCode,
      userId: message.sender.userId
    });
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
