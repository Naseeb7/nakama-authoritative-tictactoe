"use client";

import {
  type Client,
  type Match,
  type MatchData,
  type MatchPresenceEvent,
  type Socket,
  Session,
} from "@heroiclabs/nakama-js";
import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { getOrCreateDeviceId } from "@/lib/device-id";
import {
  clearStoredMatchSession,
  readStoredMatchSession,
  writeStoredMatchSession,
} from "@/lib/match-session-store";
import type {
  ActiveMatch,
  MatchMode,
  MatchStatePayload,
} from "@/lib/match-types";
import { createNakamaClient } from "@/lib/nakama";
import {
  clearStoredSession,
  readStoredSession,
  writeStoredSession,
} from "@/lib/session-store";

type BootstrapStatus = "booting" | "ready" | "error";
type SocketStatus = "disconnected" | "connecting" | "connected";
type Account = Awaited<ReturnType<Client["getAccount"]>>;
type MatchAction = "create_match" | "find_match";
type MatchStatus = "idle" | "working" | "joined" | "error";
type MatchRpcPayload = {
  matchId: string | null;
};

type AppContextValue = {
  activeMatch: ActiveMatch | null;
  account: Account | null;
  clearMatchError: () => void;
  client: Client | null;
  error: string | null;
  joinExistingMatch: (matchId: string, mode: MatchMode) => Promise<void>;
  isAuthenticated: boolean;
  joinStatus: MatchStatus;
  latestMatchState: MatchStatePayload | null;
  leaveMatch: () => Promise<void>;
  matchError: string | null;
  requestMatch: (action: MatchAction, mode: MatchMode) => Promise<string>;
  session: Session | null;
  socket: Socket | null;
  socketStatus: SocketStatus;
  status: BootstrapStatus;
  userId: string | null;
  username: string | null;
};

const AppContext = createContext<AppContextValue | null>(null);
const SESSION_REFRESH_WINDOW_MS = 5 * 60 * 1000;
const STATE_UPDATE_OPCODE = 2;
const textDecoder = new TextDecoder();

function toErrorMessage(error: unknown): string {
  if (typeof error === "string") {
    return error;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    if ("code" in error && typeof error.code === "number") {
      return `${error.message} (code ${error.code})`;
    }

    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    try {
      return JSON.stringify(error);
    } catch {
      return "Unknown error";
    }
  }

  return "Unknown error";
}

function buildGuestUsername(deviceId: string): string {
  return `guest-${deviceId.replace(/[^a-zA-Z0-9]/g, "").slice(-8)}`;
}

function mapRealtimeMatch(
  match: Match,
  mode: MatchMode,
  createdByCurrentAction: boolean
): ActiveMatch {
  const presences = Array.isArray(match.presences) ? match.presences : [];

  return {
    createdByCurrentAction,
    matchId: match.match_id,
    mode,
    presences: presences.map((presence) => ({
      sessionId: presence.session_id,
      userId: presence.user_id,
      username: presence.username,
    })),
    self: match.self
      ? {
          sessionId: match.self.session_id,
          userId: match.self.user_id,
          username: match.self.username,
        }
      : null,
  };
}

function parseMatchData(matchData: MatchData): MatchStatePayload | null {
  if (matchData.op_code !== STATE_UPDATE_OPCODE) {
    return null;
  }

  try {
    return JSON.parse(textDecoder.decode(matchData.data)) as MatchStatePayload;
  } catch {
    return null;
  }
}

async function runMatchRpc(
  client: Client,
  session: Session,
  action: MatchAction,
  mode: MatchMode
): Promise<string> {
  const response = await client.rpc(session, action, { mode });
  const payload = response.payload as MatchRpcPayload | undefined;
  const matchId = payload?.matchId;

  if (!matchId) {
    throw new Error("The server did not return a match id.");
  }

  return matchId;
}

async function restoreOrCreateSession(client: Client): Promise<Session> {
  const storedSession = readStoredSession();
  const nowInSeconds = Date.now() / 1000;
  const refreshCutoffInSeconds =
    (Date.now() + SESSION_REFRESH_WINDOW_MS) / 1000;

  if (storedSession && !storedSession.isrefreshexpired(nowInSeconds)) {
    let session = storedSession;

    if (storedSession.isexpired(refreshCutoffInSeconds)) {
      try {
        session = await client.sessionRefresh(storedSession);
        writeStoredSession(session);
      } catch {
        clearStoredSession();
      }
    }

    if (!session.isexpired(nowInSeconds)) {
      return session;
    }
  }

  clearStoredSession();

  const deviceId = getOrCreateDeviceId();
  const session = await client.authenticateDevice(
    deviceId,
    true,
    buildGuestUsername(deviceId)
  );

  writeStoredSession(session);

  return session;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [value, setValue] = useState<AppContextValue>({
    activeMatch: null,
    account: null,
    clearMatchError: () => undefined,
    client: null,
    error: null,
    joinExistingMatch: async () => undefined,
    isAuthenticated: false,
    joinStatus: "idle",
    latestMatchState: null,
    leaveMatch: async () => undefined,
    matchError: null,
    requestMatch: async () => "",
    session: null,
    socket: null,
    socketStatus: "disconnected",
    status: "booting",
    userId: null,
    username: null,
  });
  const socketRef = useRef<Socket | null>(null);
  const clientRef = useRef<Client | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const activeMatchRef = useRef<ActiveMatch | null>(null);

  const clearMatchError = useCallback(() => {
    setValue((current) => ({
      ...current,
      matchError: null,
    }));
  }, []);

  const leaveMatch = useCallback(async () => {
    const socket = socketRef.current;
    const activeMatch = activeMatchRef.current;

    if (!socket || !activeMatch) {
      return;
    }

    await socket.leaveMatch(activeMatch.matchId);
    activeMatchRef.current = null;
    clearStoredMatchSession();

    setValue((current) => ({
      ...current,
      activeMatch: null,
      joinStatus: "idle",
      latestMatchState: null,
      matchError: null,
    }));
  }, []);

  const joinExistingMatch = useCallback(
    async (matchId: string, mode: MatchMode) => {
      const socket = socketRef.current;

      if (!socket) {
        throw new Error("Socket is not connected.");
      }

      setValue((current) => ({
        ...current,
        joinStatus: "working",
        matchError: null,
      }));

      try {
        const joinedMatch = await socket.joinMatch(matchId);
        const nextMatch = mapRealtimeMatch(joinedMatch, mode, false);

        activeMatchRef.current = nextMatch;
        writeStoredMatchSession({ matchId, mode });

        setValue((current) => ({
          ...current,
          activeMatch: nextMatch,
          joinStatus: "joined",
          matchError: null,
        }));
      } catch (error) {
        console.error("joinExistingMatch failed", error);
        const message = toErrorMessage(error);

        setValue((current) => ({
          ...current,
          joinStatus: "error",
          matchError: message,
        }));

        throw error;
      }
    },
    []
  );

  const requestMatch = useCallback(
    async (action: MatchAction, mode: MatchMode) => {
      const client = clientRef.current;
      const session = sessionRef.current;
      const socket = socketRef.current;

      if (!client || !session || !socket) {
        throw new Error("App is not connected to Nakama yet.");
      }

      setValue((current) => ({
        ...current,
        joinStatus: "working",
        matchError: null,
      }));

      try {
        const matchId = await runMatchRpc(client, session, action, mode);
        const joinedMatch = await socket.joinMatch(matchId);
        const nextMatch = mapRealtimeMatch(
          joinedMatch,
          mode,
          action === "create_match"
        );

        activeMatchRef.current = nextMatch;
        writeStoredMatchSession({ matchId, mode });

        setValue((current) => ({
          ...current,
          activeMatch: nextMatch,
          joinStatus: "joined",
          matchError: null,
        }));

        return matchId;
      } catch (error) {
        console.error("requestMatch failed", error);
        const message = toErrorMessage(error);

        setValue((current) => ({
          ...current,
          joinStatus: "error",
          matchError: message,
        }));

        throw error;
      }
    },
    []
  );

  useEffect(() => {
    let disposed = false;

    async function bootstrap() {
      const client = createNakamaClient();
      let socket: Socket | null = null;

      setValue((current) => ({
        ...current,
        clearMatchError,
        client,
        error: null,
        joinExistingMatch,
        leaveMatch,
        requestMatch,
        socketStatus: "connecting",
        status: "booting",
      }));

      try {
        const session = await restoreOrCreateSession(client);
        socket = client.createSocket(undefined, process.env.NODE_ENV === "development");

        socket.ondisconnect = () => {
          if (disposed) {
            return;
          }

          startTransition(() => {
            setValue((current) => ({
              ...current,
              socket: null,
              socketStatus: "disconnected",
            }));
          });
        };

        socket.onerror = () => {
          if (disposed) {
            return;
          }

          startTransition(() => {
            setValue((current) => ({
              ...current,
              error: "Socket connection error",
              socketStatus: "disconnected",
            }));
          });
        };

        socket.onmatchdata = (matchData) => {
          const nextState = parseMatchData(matchData);

          if (!nextState) {
            return;
          }

          if (
            activeMatchRef.current &&
            matchData.match_id !== activeMatchRef.current.matchId
          ) {
            return;
          }

          startTransition(() => {
            setValue((current) => ({
              ...current,
              latestMatchState: nextState,
            }));
          });
        };

        socket.onmatchpresence = (event: MatchPresenceEvent) => {
          if (
            !activeMatchRef.current ||
            event.match_id !== activeMatchRef.current.matchId
          ) {
            return;
          }

          const joins = Array.isArray(event.joins) ? event.joins : [];
          const leaves = Array.isArray(event.leaves) ? event.leaves : [];

          const nextPresences = new Map(
            activeMatchRef.current.presences.map((presence) => [
              presence.sessionId,
              presence,
            ])
          );

          joins.forEach((presence) => {
            nextPresences.set(presence.session_id, {
              sessionId: presence.session_id,
              userId: presence.user_id,
              username: presence.username,
            });
          });

          leaves.forEach((presence) => {
            nextPresences.delete(presence.session_id);
          });

          activeMatchRef.current = {
            ...activeMatchRef.current,
            presences: Array.from(nextPresences.values()),
          };

          startTransition(() => {
            setValue((current) => ({
              ...current,
              activeMatch: activeMatchRef.current,
            }));
          });
        };

        await socket.connect(session, true);
        const account = await client.getAccount(session);

        if (disposed) {
          socket.disconnect(false);
          return;
        }

        clientRef.current = client;
        sessionRef.current = session;
        socketRef.current = socket;

        startTransition(() => {
          setValue({
            activeMatch: null,
            account,
            clearMatchError,
            client,
            error: null,
            joinExistingMatch,
            isAuthenticated: true,
            joinStatus: "idle",
            latestMatchState: null,
            leaveMatch,
            matchError: null,
            requestMatch,
            session,
            socket,
            socketStatus: "connected",
            status: "ready",
            userId: session.user_id ?? account.user?.id ?? null,
            username: session.username ?? account.user?.username ?? null,
          });
        });

        const storedMatch = readStoredMatchSession();

        if (storedMatch) {
          try {
            const joinedMatch = await socket.joinMatch(storedMatch.matchId);
            const nextMatch = mapRealtimeMatch(
              joinedMatch,
              storedMatch.mode,
              false
            );

            if (disposed) {
              return;
            }

            activeMatchRef.current = nextMatch;

            startTransition(() => {
              setValue((current) => ({
                ...current,
                activeMatch: nextMatch,
                joinStatus: "joined",
              }));
            });
          } catch {
            clearStoredMatchSession();
          }
        }
      } catch (error) {
        console.error("bootstrap failed", error);
        if (socket) {
          socket.disconnect(false);
        }

        if (disposed) {
          return;
        }

        clearStoredSession();
        clearStoredMatchSession();

        startTransition(() => {
          setValue({
            activeMatch: null,
            account: null,
            clearMatchError,
            client,
            error: toErrorMessage(error),
            joinExistingMatch,
            isAuthenticated: false,
            joinStatus: "error",
            latestMatchState: null,
            leaveMatch,
            matchError: null,
            requestMatch,
            session: null,
            socket: null,
            socketStatus: "disconnected",
            status: "error",
            userId: null,
            username: null,
          });
        });
      }
    }

    bootstrap();

    return () => {
      disposed = true;
      clientRef.current = null;
      sessionRef.current = null;

      if (socketRef.current) {
        socketRef.current.disconnect(false);
        socketRef.current = null;
      }
    };
  }, [clearMatchError, joinExistingMatch, leaveMatch, requestMatch]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error("useApp must be used inside AppProvider");
  }

  return context;
}
