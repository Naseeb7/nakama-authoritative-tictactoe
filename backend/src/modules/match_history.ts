var MATCH_HISTORY_INDEX_COLLECTION = "match_history_index";
var MATCH_HISTORY_INDEX_KEY = "recent";
var MATCH_HISTORY_PAGE_SIZE = 12;

function parseMatchHistoryPayload(payload: string): any {
  if (!payload) {
    return {};
  }

  try {
    return JSON.parse(payload);
  } catch (_error) {
    return {};
  }
}

function clampHistoryLimit(limit: any): number {
  var parsed = typeof limit === "number" ? limit : Number(limit);

  if (!isFiniteNumber(parsed) || parsed < 1) {
    return MATCH_HISTORY_PAGE_SIZE;
  }

  if (parsed > 50) {
    return 50;
  }

  return Math.floor(parsed);
}

function clampHistoryOffset(offset: any): number {
  var parsed = typeof offset === "number" ? offset : Number(offset);

  if (!isFiniteNumber(parsed) || parsed < 0) {
    return 0;
  }

  return Math.floor(parsed);
}

function readMatchHistoryIndex(nk: Nakama, userId: string): MatchHistoryIndexEntry[] {
  var objects = nk.storageRead([
    {
      collection: MATCH_HISTORY_INDEX_COLLECTION,
      key: MATCH_HISTORY_INDEX_KEY,
      userId: userId
    }
  ]);

  if (!objects || objects.length === 0) {
    return [];
  }

  return normalizeMatchHistoryIndex(objects[0].value);
}

function normalizeMatchHistoryIndex(value: any): MatchHistoryIndexEntry[] {
  var parsed = typeof value === "string" ? parseJsonValue(value) : value;
  var entries: MatchHistoryIndexEntry[] = [];
  var i: number;
  var rawEntry: any;

  if (!parsed || !parsed.entries || typeof parsed.entries.length !== "number") {
    return [];
  }

  for (i = 0; i < parsed.entries.length; i += 1) {
    rawEntry = parsed.entries[i];

    if (isValidHistoryIndexEntry(rawEntry)) {
      entries.push({
        historyKey: String(rawEntry.historyKey),
        matchId: String(rawEntry.matchId),
        timestamp: clampTimestamp(rawEntry.timestamp),
        mode: rawEntry.mode === "timed" ? "timed" : "classic"
      });
    }
  }

  return entries;
}

function isValidHistoryIndexEntry(value: any): boolean {
  return !!value && typeof value.historyKey === "string" && typeof value.matchId === "string";
}

function clampTimestamp(value: any): number {
  var parsed = typeof value === "number" ? value : Number(value);

  if (!isFiniteNumber(parsed) || parsed < 0) {
    return getCurrentUnixTimestamp();
  }

  return Math.floor(parsed);
}

function parseJsonValue(value: string): any {
  try {
    return JSON.parse(value);
  } catch (_error) {
    return null;
  }
}

function normalizeMatchHistoryRecord(object: StorageObject): MatchHistoryRecord {
  var value = typeof object.value === "string" ? parseJsonValue(object.value) : object.value;

  return {
    historyKey: object.key,
    matchId: value && typeof value.matchId === "string" ? value.matchId : object.key,
    timestamp: clampTimestamp(value && value.timestamp),
    durationSeconds: clampDuration(value && value.durationSeconds),
    mode: value && value.mode === "timed" ? "timed" : "classic",
    winner: value && typeof value.winner === "string" ? value.winner : null,
    players: Array.isArray(value && value.players) ? value.players : [],
    playerNames: normalizePlayerNameMap(value && value.playerNames),
    moveHistory: Array.isArray(value && value.moveHistory) ? value.moveHistory : [],
    endReason: typeof (value && value.endReason) === "string" ? value.endReason : "unknown",
    endReasonText:
      typeof (value && value.endReasonText) === "string"
        ? value.endReasonText
        : "Match outcome unavailable."
  };
}

function clampDuration(value: any): number {
  var parsed = typeof value === "number" ? value : Number(value);

  if (!isFiniteNumber(parsed) || parsed < 0) {
    return 0;
  }

  return Math.floor(parsed);
}

function normalizePlayerNameMap(value: any): Record<string, string> {
  var parsed = typeof value === "string" ? parseJsonValue(value) : value;
  var output: Record<string, string> = {};
  var playerId: string;

  if (!parsed || typeof parsed !== "object") {
    return output;
  }

  for (playerId in parsed) {
    if (parsed.hasOwnProperty(playerId) && typeof parsed[playerId] === "string") {
      output[playerId] = parsed[playerId];
    }
  }

  return output;
}

function upsertMatchHistoryIndex(
  nk: Nakama,
  state: MatchState,
  durationSeconds: number
): void {
  var nextEntry: MatchHistoryIndexEntry = {
    historyKey: state.historyKey,
    matchId: state.matchId,
    timestamp: state.endTime || getCurrentUnixTimestamp(),
    mode: state.mode
  };
  var writeRequests: StorageWriteRequest[] = [];
  var playerEntries: MatchHistoryIndexEntry[] = [];
  var filteredEntries: MatchHistoryIndexEntry[] = [];
  var i: number;
  var j: number;
  var playerId: string;

  for (i = 0; i < state.players.length; i += 1) {
    playerId = state.players[i];
    playerEntries = readMatchHistoryIndex(nk, playerId);
    filteredEntries = [];

    for (j = 0; j < playerEntries.length; j += 1) {
      if (playerEntries[j].historyKey !== state.historyKey) {
        filteredEntries.push(playerEntries[j]);
      }
    }

    filteredEntries.unshift(nextEntry);

    if (filteredEntries.length > 50) {
      filteredEntries = filteredEntries.slice(0, 50);
    }

    writeRequests.push({
      collection: MATCH_HISTORY_INDEX_COLLECTION,
      key: MATCH_HISTORY_INDEX_KEY,
      userId: playerId,
      value: {
        entries: filteredEntries,
        lastUpdatedAt: state.endTime || getCurrentUnixTimestamp(),
        lastDurationSeconds: durationSeconds
      } as any,
      permissionRead: 0,
      permissionWrite: 0
    });
  }

  if (writeRequests.length > 0) {
    nk.storageWrite(writeRequests);
  }
}

function isFiniteNumber(value: any): boolean {
  return typeof value === "number" && isFinite(value);
}
