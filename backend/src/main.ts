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
