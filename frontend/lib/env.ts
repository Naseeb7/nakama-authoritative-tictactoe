const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = "7350";
const DEFAULT_SERVER_KEY = "defaultkey";

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (!value) {
    return fallback;
  }

  return value === "true";
}

export const nakamaEnv = {
  host: process.env.NEXT_PUBLIC_NAKAMA_HOST || DEFAULT_HOST,
  port: process.env.NEXT_PUBLIC_NAKAMA_PORT || DEFAULT_PORT,
  serverKey: process.env.NEXT_PUBLIC_NAKAMA_SERVER_KEY || DEFAULT_SERVER_KEY,
  useSSL: parseBoolean(process.env.NEXT_PUBLIC_NAKAMA_USE_SSL, false),
};

export function getNakamaHttpUrl(): string {
  const protocol = nakamaEnv.useSSL ? "https" : "http";

  return `${protocol}://${nakamaEnv.host}:${nakamaEnv.port}`;
}
