var GLOBAL_WINS_LEADERBOARD_ID = "global_wins";
var DEFAULT_MATCH_MODE = "classic";
var TIMED_MATCH_MODE = "timed";
var MATCH_LABEL_PREFIX = "tic_tac_toe_match";
var MATCH_LIST_LIMIT = 1000;
var MATCH_HISTORY_COLLECTION = "match_history";
var MATCH_HISTORY_INDEX_COLLECTION = "match_history_index";
var MATCH_HISTORY_INDEX_KEY = "recent";
var MATCH_HISTORY_PAGE_SIZE = 12;

function createMatchRpc(
  _ctx: RpcContext,
  logger: Logger,
  nk: Nakama,
  payload: string
): string {
  var matchId: string | null = null;
  var mode = getRequestedMatchMode(payload);

  try {
    matchId = nk.matchCreate("tic_tac_toe_match", {
      mode: mode
    });

    logger.info("Created new Tic-Tac-Toe match", {
      matchId: matchId,
      mode: mode
    });
  } catch (error) {
    logger.error("Failed to create Tic-Tac-Toe match", {
      mode: mode,
      error: String(error)
    });
  }

  return JSON.stringify({ matchId: matchId });
}

function findMatchRpc(
  _ctx: RpcContext,
  logger: Logger,
  nk: Nakama,
  payload: string
): string {
  var matches: MatchListItem[] = [];
  var i: number;
  var matchId: string | null = null;
  var mode = getRequestedMatchMode(payload);
  var labelPrefix = getMatchLabelPrefixForMode(mode);

  try {
    matches = nk.matchList(MATCH_LIST_LIMIT, true, "", 0, 2, "");

    for (i = 0; i < matches.length; i += 1) {
      if (
        matches[i].authoritative &&
        matches[i].size < 2 &&
        hasCompatibleMatchLabel(matches[i].label, mode) &&
        isWaitingMatchLabel(matches[i].label, labelPrefix)
      ) {
        matchId = matches[i].matchId;

        logger.info("Found existing match", {
          matchId: matchId,
          mode: mode
        });

        break;
      }
    }

    if (matchId === null) {
      matchId = nk.matchCreate("tic_tac_toe_match", {
        mode: mode
      });

      logger.info("Created fallback match", {
        matchId: matchId,
        mode: mode
      });
    }
  } catch (error) {
    logger.error("Failed to find or create Tic-Tac-Toe match", {
      mode: mode,
      labelPrefix: labelPrefix,
      error: String(error)
    });
  }

  return JSON.stringify({ matchId: matchId });
}

function listMatchHistoryRpc(
  ctx: RpcContext,
  logger: Logger,
  nk: Nakama,
  payload: string
): string {
  var userId = ctx.userId;
  var request = parseMatchHistoryPayload(payload);
  var limit = clampHistoryLimit(request.limit);
  var offset = clampHistoryOffset(request.offset);
  var indexedEntries: MatchHistoryIndexEntry[] = [];
  var selectedEntries = indexedEntries.slice(offset, offset + limit);
  var readRequests: StorageReadRequest[] = [];
  var i: number;
  var historyObjects: StorageObject[] = [];
  var records: MatchHistoryRecord[] = [];
  var historyObject: StorageObject;

  if (!userId) {
    return JSON.stringify({
      records: [],
      total: 0,
      limit: limit,
      offset: offset,
      hasMore: false
    });
  }

  indexedEntries = readMatchHistoryIndex(nk, userId);
  selectedEntries = indexedEntries.slice(offset, offset + limit);

  for (i = 0; i < selectedEntries.length; i += 1) {
    readRequests.push({
      collection: MATCH_HISTORY_COLLECTION,
      key: selectedEntries[i].historyKey
    });
  }

  try {
    historyObjects = readRequests.length > 0 ? nk.storageRead(readRequests) : [];

    for (i = 0; i < historyObjects.length; i += 1) {
      historyObject = historyObjects[i];
      records.push(normalizeMatchHistoryRecord(historyObject));
    }
  } catch (error) {
    logger.error("Failed to read match history entries.", {
      error: String(error)
    });
  }

  return JSON.stringify({
    records: records,
    total: indexedEntries.length,
    limit: limit,
    offset: offset,
    hasMore: offset + limit < indexedEntries.length
  });
}

function InitModule(
  _ctx: RpcContext,
  logger: Logger,
  nk: Nakama,
  initializer: Initializer
): void {
  logger.info("Initializing Nakama runtime module wiring.");

  try {
    nk.leaderboardCreate(GLOBAL_WINS_LEADERBOARD_ID, true, "desc", "incr", null, {});
    logger.info("Ensured global wins leaderboard exists.", {
      leaderboardId: GLOBAL_WINS_LEADERBOARD_ID
    });
  } catch (error) {
    logger.error("Failed to create global wins leaderboard.", {
      leaderboardId: GLOBAL_WINS_LEADERBOARD_ID,
      error: String(error)
    });
  }

  initializer.registerMatch("tic_tac_toe_match", createMatchHandler);
  initializer.registerRpc("create_match", createMatchRpc);
  initializer.registerRpc("find_match", findMatchRpc);
  initializer.registerRpc("list_match_history", listMatchHistoryRpc);

  logger.info("Nakama runtime module wiring complete.");
}

function getRequestedMatchMode(payload: string): string {
  var parsed = parseMatchmakingPayload(payload);

  if (parsed && parsed.mode === TIMED_MATCH_MODE) {
    return TIMED_MATCH_MODE;
  }

  if (parsed && parsed.timed === true) {
    return TIMED_MATCH_MODE;
  }

  return DEFAULT_MATCH_MODE;
}

function getMatchLabelPrefixForMode(mode: string): string {
  return MATCH_LABEL_PREFIX + ":" + mode;
}

function parseMatchmakingPayload(payload: string): any {
  if (!payload) {
    return null;
  }

  try {
    return JSON.parse(payload);
  } catch (_error) {
    return null;
  }
}

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

function hasCompatibleMatchLabel(label: string | undefined, mode: string): boolean {
  if (!label) {
    return false;
  }

  if (label.indexOf(getMatchLabelPrefixForMode(mode)) === 0) {
    return true;
  }

  if (mode === DEFAULT_MATCH_MODE && label === MATCH_LABEL_PREFIX) {
    return true;
  }

  if (mode === TIMED_MATCH_MODE && label === MATCH_LABEL_PREFIX + "_timed") {
    return true;
  }

  return false;
}

function isWaitingMatchLabel(label: string | undefined, labelPrefix: string): boolean {
  if (!label) {
    return false;
  }

  if (label.indexOf(labelPrefix + ":waiting") === 0) {
    return true;
  }

  return label === MATCH_LABEL_PREFIX || label === MATCH_LABEL_PREFIX + "_timed";
}
