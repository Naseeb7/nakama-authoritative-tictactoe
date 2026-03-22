var GLOBAL_WINS_LEADERBOARD_ID = "global_wins";

function createMatchRpc(
  _ctx: RpcContext,
  logger: Logger,
  nk: Nakama,
  _payload: string
): string {
  var matchId: string | null = null;

  try {
    matchId = nk.matchCreate("tic_tac_toe_match");

    logger.info("Created new Tic-Tac-Toe match", {
      matchId: matchId
    });
  } catch (error) {
    logger.error("Failed to create Tic-Tac-Toe match", {
      error: String(error)
    });
  }

  return JSON.stringify({ matchId: matchId });
}

function findMatchRpc(
  _ctx: RpcContext,
  logger: Logger,
  nk: Nakama,
  _payload: string
): string {
  var matches: MatchListItem[] = [];
  var i: number;
  var matchId: string | null = null;

  try {
    matches = nk.matchList(10, true, "tic_tac_toe_match", 0, 1, "");

    for (i = 0; i < matches.length; i += 1) {
      if (matches[i].authoritative && matches[i].label === "tic_tac_toe_match" && matches[i].size < 2) {
        matchId = matches[i].matchId;

        logger.info("Found existing match", {
          matchId: matchId
        });

        break;
      }
    }

    if (matchId === null) {
      matchId = nk.matchCreate("tic_tac_toe_match");

      logger.info("Created fallback match", {
        matchId: matchId
      });
    }
  } catch (error) {
    logger.error("Failed to find or create Tic-Tac-Toe match", {
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
