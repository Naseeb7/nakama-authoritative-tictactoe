"use client";

import {
  type Client,
  type Socket,
  Session,
} from "@heroiclabs/nakama-js";
import {
  createContext,
  startTransition,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { getOrCreateDeviceId } from "@/lib/device-id";
import { createNakamaClient } from "@/lib/nakama";
import {
  clearStoredSession,
  readStoredSession,
  writeStoredSession,
} from "@/lib/session-store";

type BootstrapStatus = "booting" | "ready" | "error";
type SocketStatus = "disconnected" | "connecting" | "connected";
type Account = Awaited<ReturnType<Client["getAccount"]>>;

type AppContextValue = {
  account: Account | null;
  client: Client | null;
  error: string | null;
  isAuthenticated: boolean;
  session: Session | null;
  socket: Socket | null;
  socketStatus: SocketStatus;
  status: BootstrapStatus;
  userId: string | null;
  username: string | null;
};

const AppContext = createContext<AppContextValue | null>(null);
const SESSION_REFRESH_WINDOW_MS = 5 * 60 * 1000;

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown error";
}

function buildGuestUsername(deviceId: string): string {
  return `guest-${deviceId.replace(/[^a-zA-Z0-9]/g, "").slice(-8)}`;
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
    account: null,
    client: null,
    error: null,
    isAuthenticated: false,
    session: null,
    socket: null,
    socketStatus: "disconnected",
    status: "booting",
    userId: null,
    username: null,
  });
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    let disposed = false;

    async function bootstrap() {
      const client = createNakamaClient();
      let socket: Socket | null = null;

      setValue((current) => ({
        ...current,
        client,
        error: null,
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

        await socket.connect(session, true);
        const account = await client.getAccount(session);

        if (disposed) {
          socket.disconnect(false);
          return;
        }

        socketRef.current = socket;

        startTransition(() => {
          setValue({
            account,
            client,
            error: null,
            isAuthenticated: true,
            session,
            socket,
            socketStatus: "connected",
            status: "ready",
            userId: session.user_id ?? account.user?.id ?? null,
            username: session.username ?? account.user?.username ?? null,
          });
        });
      } catch (error) {
        if (socket) {
          socket.disconnect(false);
        }

        if (disposed) {
          return;
        }

        clearStoredSession();

        startTransition(() => {
          setValue({
            account: null,
            client,
            error: toErrorMessage(error),
            isAuthenticated: false,
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

      if (socketRef.current) {
        socketRef.current.disconnect(false);
        socketRef.current = null;
      }
    };
  }, []);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error("useApp must be used inside AppProvider");
  }

  return context;
}
