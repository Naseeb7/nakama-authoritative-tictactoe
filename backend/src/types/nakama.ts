interface RpcContext {
  node?: string;
  userId?: string;
  username?: string;
  sessionId?: string;
  env?: Record<string, string>;
}

interface Logger {
  info(message: string, fields?: Record<string, unknown>): void;
  error(message: string, fields?: Record<string, unknown>): void;
}

interface MatchListItem {
  matchId: string;
  authoritative: boolean;
  label?: string;
  size: number;
}

interface StorageReadRequest {
  collection: string;
  key: string;
  userId?: string;
}

interface StorageObject {
  collection: string;
  key: string;
  userId?: string;
  value: any;
}

interface StorageWriteRequest {
  collection: string;
  key: string;
  userId?: string;
  value: string;
  permissionRead?: number;
  permissionWrite?: number;
}

interface Nakama {
  matchCreate(moduleName: string, params?: Record<string, string>): string;
  matchList(
    limit: number,
    authoritative: boolean,
    label: string,
    minSize: number,
    maxSize: number,
    query: string
  ): MatchListItem[];
  leaderboardCreate(
    leaderboardId: string,
    authoritative: boolean,
    sortOrder: string,
    operator: string,
    resetSchedule: string | null,
    metadata: Record<string, unknown>
  ): void;
  leaderboardRecordWrite(
    leaderboardId: string,
    ownerId: string,
    username: string,
    score: number,
    subscore: number,
    metadata: Record<string, unknown>,
    overrideOperator?: number | null
  ): void;
  storageRead(objects: StorageReadRequest[]): StorageObject[];
  storageWrite(objects: StorageWriteRequest[]): void;
}

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

interface MatchDispatcher {
  broadcastMessage(opCode: number, data: string): void;
  matchLabelUpdate(label: string): void;
}

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
