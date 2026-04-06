import type { Client, Match, MatchData } from "@heroiclabs/nakama-js";
import type { Session } from "@heroiclabs/nakama-js";

import type {
  ActiveMatch,
  MatchMode,
  MatchStatePayload,
} from "@/lib/match-types";
import { getErrorCode, toErrorMessage } from "@/lib/services/app-errors";

const STATE_UPDATE_OPCODE = 2;
const textDecoder = new TextDecoder();

type MatchAction = "create_match" | "find_match";
type MatchRpcPayload = {
  matchId: string | null;
};

export function isMatchNotFoundError(error: unknown): boolean {
  const message = toErrorMessage(error).toLowerCase();

  return getErrorCode(error) === 4 || message.includes("match not found");
}

export function isExpiredMatchError(error: unknown): boolean {
  const message = toErrorMessage(error).toLowerCase();
  const code = getErrorCode(error);

  return (
    code === 4 ||
    code === 5 ||
    message.includes("match not found") ||
    message.includes("match has already ended")
  );
}

export function isMatchLeaveSafeToIgnore(error: unknown): boolean {
  const message = toErrorMessage(error).toLowerCase();
  const code = getErrorCode(error);

  return (
    code === 4 ||
    code === 5 ||
    message.includes("match not found") ||
    message.includes("match has already ended") ||
    message.includes("socket is not connected")
  );
}

export function mapRealtimeMatch(
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

export function parseMatchData(matchData: MatchData): MatchStatePayload | null {
  if (matchData.op_code !== STATE_UPDATE_OPCODE) {
    return null;
  }

  try {
    return JSON.parse(textDecoder.decode(matchData.data)) as MatchStatePayload;
  } catch {
    return null;
  }
}

export async function runMatchRpc(
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
