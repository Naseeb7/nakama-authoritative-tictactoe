var GLOBAL_WINS_LEADERBOARD_ID = "global_wins";
var DEFAULT_MATCH_MODE = "classic";
var TIMED_MATCH_MODE = "timed";
var MATCH_LABEL_PREFIX = "tic_tac_toe_match";
var MATCH_LIST_LIMIT = 1000;

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
