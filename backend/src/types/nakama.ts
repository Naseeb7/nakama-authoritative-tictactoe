interface RpcContext {
  node?: string;
  userId?: string;
  username?: string;
  sessionId?: string;
  env?: Record<string, string>;
}

interface Logger {
  info(message: string, fields?: Record<string, unknown>): void;
}

interface Nakama {}

interface Presence {
  userId: string;
  sessionId: string;
  username?: string;
}

interface MatchMessage {
  opCode: number;
  data: string;
  sender: Presence;
}

interface MatchDispatcher {}

interface MatchStateResult<TState> {
  state: TState;
}

interface MatchSignalResult<TState> {
  state: TState;
  data?: string;
}

interface MatchInitResult<TState> {
  state: TState;
  tickRate: number;
  label: string;
}

interface MatchJoinAttemptResult<TState> {
  state: TState;
  accept: boolean;
  rejectMessage?: string;
}

interface MatchHandler<TState = unknown> {
  matchInit(ctx: RpcContext, logger: Logger, nk: Nakama, params: Record<string, string>): MatchInitResult<TState>;
  matchJoinAttempt(
    ctx: RpcContext,
    logger: Logger,
    nk: Nakama,
    dispatcher: MatchDispatcher,
    tick: number,
    state: TState,
    presence: Presence,
    metadata?: Record<string, string>
  ): MatchJoinAttemptResult<TState>;
  matchJoin(
    ctx: RpcContext,
    logger: Logger,
    nk: Nakama,
    dispatcher: MatchDispatcher,
    tick: number,
    state: TState,
    presences: Presence[]
  ): TState;
  matchLeave(
    ctx: RpcContext,
    logger: Logger,
    nk: Nakama,
    dispatcher: MatchDispatcher,
    tick: number,
    state: TState,
    presences: Presence[]
  ): TState;
  matchLoop(
    ctx: RpcContext,
    logger: Logger,
    nk: Nakama,
    dispatcher: MatchDispatcher,
    tick: number,
    state: TState,
    messages: MatchMessage[]
  ): MatchStateResult<TState>;
  matchTerminate(
    ctx: RpcContext,
    logger: Logger,
    nk: Nakama,
    dispatcher: MatchDispatcher,
    tick: number,
    state: TState,
    graceSeconds: number
  ): TState;
  matchSignal?(
    ctx: RpcContext,
    logger: Logger,
    nk: Nakama,
    dispatcher: MatchDispatcher,
    tick: number,
    state: TState,
    data: string
  ): MatchSignalResult<TState>;
}

interface RpcFunction {
  (ctx: RpcContext, logger: Logger, nk: Nakama, payload: string): string;
}

interface Initializer {
  registerMatch(name: string, handler: MatchHandler<any>): void;
  registerRpc(name: string, fn: RpcFunction): void;
}
