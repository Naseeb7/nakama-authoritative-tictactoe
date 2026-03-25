const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = "7350";
const DEFAULT_SERVER_KEY = "defaultkey";

function normalize(value: string | undefined): string | undefined {
  const trimmed = value?.trim();

  return trimmed ? trimmed : undefined;
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  const normalized = normalize(value)?.toLowerCase();

  if (!normalized) {
    return fallback;
  }

  return normalized === "true";
}

function parseConfiguredUrl(): URL | null {
  const rawUrl = normalize(process.env.NEXT_PUBLIC_NAKAMA_URL);

  if (!rawUrl) {
    return null;
  }

  try {
    return new URL(rawUrl);
  } catch {
    throw new Error(
      "NEXT_PUBLIC_NAKAMA_URL must be a valid absolute URL, for example https://example.up.railway.app"
    );
  }
}

const configuredUrl = parseConfiguredUrl();

export const nakamaEnv = {
  host:
    configuredUrl?.hostname ??
    normalize(process.env.NEXT_PUBLIC_NAKAMA_HOST) ??
    DEFAULT_HOST,
  port:
    normalize(process.env.NEXT_PUBLIC_NAKAMA_PORT) ??
    configuredUrl?.port ??
    (configuredUrl?.protocol === "https:" ? "443" : DEFAULT_PORT),
  serverKey:
    normalize(process.env.NEXT_PUBLIC_NAKAMA_SERVER_KEY) ?? DEFAULT_SERVER_KEY,
  useSSL: configuredUrl
    ? configuredUrl.protocol === "https:"
    : parseBoolean(process.env.NEXT_PUBLIC_NAKAMA_USE_SSL, false),
};

export function getNakamaHttpUrl(): string {
  const protocol = nakamaEnv.useSSL ? "https" : "http";
  const defaultPort = nakamaEnv.useSSL ? "443" : "80";
  const portSegment = nakamaEnv.port === defaultPort ? "" : `:${nakamaEnv.port}`;

  return `${protocol}://${nakamaEnv.host}${portSegment}`;
}
