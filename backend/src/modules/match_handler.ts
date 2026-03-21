interface TicTacToeMatchState {
  matchId: string | null;
  presences: Presence[];
  tick: number;
}

var matchInit = function (
  ctx: RpcContext,
  logger: Logger,
  _nk: Nakama,
  params: Record<string, string>
): MatchInitResult<TicTacToeMatchState> {
  logger.info("matchInit executed.", {
    node: ctx.node
  });

  return {
    state: {
      matchId: typeof params.matchId === "string" ? params.matchId : null,
      presences: [],
      tick: 0
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
  state: TicTacToeMatchState,
  presence: Presence,
  _metadata?: Record<string, string>
): MatchJoinAttemptResult<TicTacToeMatchState> {
  logger.info("matchJoinAttempt executed.", {
    userId: presence.userId
  });

  return {
    state: state,
    accept: true
  };
};

var matchJoin = function (
  _ctx: RpcContext,
  logger: Logger,
  _nk: Nakama,
  _dispatcher: MatchDispatcher,
  _tick: number,
  state: TicTacToeMatchState,
  presences: Presence[]
): TicTacToeMatchState {
  var updatedPresences: Presence[] = state.presences.slice();
  var i: number;

  logger.info("matchJoin executed.", {
    joinedCount: presences.length
  });

  for (i = 0; i < presences.length; i += 1) {
    updatedPresences.push(presences[i]);
  }

  return {
    matchId: state.matchId,
    presences: updatedPresences,
    tick: state.tick
  };
};

var matchLeave = function (
  _ctx: RpcContext,
  logger: Logger,
  _nk: Nakama,
  _dispatcher: MatchDispatcher,
  _tick: number,
  state: TicTacToeMatchState,
  presences: Presence[]
): TicTacToeMatchState {
  var leavingSessionIds: Record<string, boolean> = {};
  var updatedPresences: Presence[] = [];
  var i: number;

  logger.info("matchLeave executed.", {
    leftCount: presences.length
  });

  for (i = 0; i < presences.length; i += 1) {
    leavingSessionIds[presences[i].sessionId] = true;
  }

  for (i = 0; i < state.presences.length; i += 1) {
    if (!leavingSessionIds[state.presences[i].sessionId]) {
      updatedPresences.push(state.presences[i]);
    }
  }

  return {
    matchId: state.matchId,
    presences: updatedPresences,
    tick: state.tick
  };
};

var matchLoop = function (
  _ctx: RpcContext,
  logger: Logger,
  _nk: Nakama,
  _dispatcher: MatchDispatcher,
  tick: number,
  state: TicTacToeMatchState,
  messages: MatchMessage[]
): MatchStateResult<TicTacToeMatchState> {
  logger.info("matchLoop executed.", {
    tick: tick,
    messageCount: messages.length
  });

  return {
    state: {
      matchId: state.matchId,
      presences: state.presences,
      tick: tick
    }
  };
};

var matchTerminate = function (
  _ctx: RpcContext,
  logger: Logger,
  _nk: Nakama,
  _dispatcher: MatchDispatcher,
  _tick: number,
  state: TicTacToeMatchState,
  graceSeconds: number
): TicTacToeMatchState {
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
  state: TicTacToeMatchState,
  data: string
): MatchSignalResult<TicTacToeMatchState> {
  logger.info("matchSignal executed.");

  return {
    state: state,
    data: data
  };
};

var createMatchHandler: MatchHandler<TicTacToeMatchState> = {
  matchInit: matchInit,
  matchJoinAttempt: matchJoinAttempt,
  matchJoin: matchJoin,
  matchLeave: matchLeave,
  matchLoop: matchLoop,
  matchTerminate: matchTerminate,
  matchSignal: matchSignal
};
