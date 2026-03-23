const fs = require("fs");
const path = require("path");
const vm = require("vm");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function createLogger() {
  return {
    info() {},
    error() {}
  };
}

function createDispatcher() {
  return {
    labels: [],
    messages: [],
    broadcastMessage(opCode, data) {
      this.messages.push({ opCode, data: JSON.parse(data) });
    },
    matchLabelUpdate(label) {
      this.labels.push(label);
    }
  };
}

function createStorageBackedNk() {
  const matchListItems = [];
  const storage = new Map();
  const leaderboardWrites = [];
  const createdMatches = [];

  return {
    matchListItems,
    leaderboardWrites,
    createdMatches,
    matchCreate(moduleName, params) {
      const matchId = `${moduleName}:${createdMatches.length + 1}`;
      createdMatches.push({ moduleName, params, matchId });
      return matchId;
    },
    matchList(limit) {
      return matchListItems.slice(0, limit);
    },
    leaderboardCreate() {},
    leaderboardRecordWrite(leaderboardId, ownerId, username, score, subscore, metadata, overrideOperator) {
      leaderboardWrites.push({
        leaderboardId,
        ownerId,
        username,
        score,
        subscore,
        metadata,
        overrideOperator
      });
    },
    storageRead(objects) {
      return objects
        .map((request) => {
          const key = `${request.collection}|${request.key}|${request.userId || ""}`;
          const value = storage.get(key);
          if (value === undefined) {
            return null;
          }

          return {
            collection: request.collection,
            key: request.key,
            userId: request.userId,
            value
          };
        })
        .filter(Boolean);
    },
    storageWrite(objects) {
      objects.forEach((request) => {
        const key = `${request.collection}|${request.key}|${request.userId || ""}`;
        storage.set(key, request.value);
      });
    }
  };
}

function loadRuntime() {
  const runtimePath = path.join(__dirname, "..", "build", "main.js");
  const runtimeCode = fs.readFileSync(runtimePath, "utf8");
  const sandbox = {
    console,
    JSON,
    Math,
    Date
  };

  vm.createContext(sandbox);
  vm.runInContext(runtimeCode, sandbox);

  return sandbox;
}

function bootstrapRuntime() {
  const runtime = loadRuntime();
  const nk = createStorageBackedNk();
  const logger = createLogger();
  const initializer = {
    matches: {},
    rpcs: {},
    registerMatch(name, handler) {
      this.matches[name] = handler;
    },
    registerRpc(name, fn) {
      this.rpcs[name] = fn;
    }
  };

  runtime.InitModule({}, logger, nk, initializer);

  return {
    runtime,
    nk,
    logger,
    initializer
  };
}

function createPresence(userId) {
  return {
    userId,
    sessionId: `session-${userId}`
  };
}

function testFindMatchUsesModeAwareWaitingLabels() {
  const { initializer, nk, logger } = bootstrapRuntime();
  nk.matchListItems.push(
    { matchId: "old-full", authoritative: true, label: "tic_tac_toe_match:timed:waiting", size: 2 },
    { matchId: "timed-1", authoritative: true, label: "tic_tac_toe_match:timed:waiting", size: 1 },
    { matchId: "timed-active", authoritative: true, label: "tic_tac_toe_match:timed:active", size: 1 }
  );

  const result = JSON.parse(initializer.rpcs.find_match({}, logger, nk, JSON.stringify({ mode: "timed" })));
  assert(result.matchId === "timed-1", "find_match should reuse a timed waiting match");
}

function testReconnectRestoresTimedTurnWindow() {
  const { initializer, nk, logger } = bootstrapRuntime();
  const handler = initializer.matches.tic_tac_toe_match;
  const dispatcher = createDispatcher();
  let state = handler.matchInit({}, logger, nk, { mode: "timed", matchId: "match-1" }).state;

  state = handler.matchJoin({}, logger, nk, dispatcher, 1, state, [createPresence("p1")]).state;
  state = handler.matchJoin({}, logger, nk, dispatcher, 2, state, [createPresence("p2")]).state;

  assert(state.status === "active", "match should activate on second join");
  assert(state.turnDeadlineTick === 32, "timed mode should set initial deadline");

  state = handler.matchLeave({}, logger, nk, dispatcher, 10, state, [createPresence("p2")]).state;
  assert(state.disconnectedPlayers.p2 !== undefined, "disconnect should be tracked");
  assert(state.turnDeadlineTick === null, "turn deadline should pause during disconnect");
  assert(state.pausedTurnRemainingSeconds === 22, "remaining turn window should be preserved");

  state = handler.matchJoin({}, logger, nk, dispatcher, 15, state, [createPresence("p2")]).state;
  assert(state.disconnectedPlayers.p2 === undefined, "reconnect should clear disconnect tracking");
  assert(state.turnDeadlineTick === 37, "reconnect should restore the paused deadline");
}

function testReconnectTimeoutPersistsHistoryOnce() {
  const { initializer, nk, logger } = bootstrapRuntime();
  const handler = initializer.matches.tic_tac_toe_match;
  const dispatcher = createDispatcher();
  let state = handler.matchInit({}, logger, nk, { mode: "classic", matchId: "match-2" }).state;

  state = handler.matchJoin({}, logger, nk, dispatcher, 1, state, [createPresence("p1"), createPresence("p2")]).state;
  state = handler.matchLeave({}, logger, nk, dispatcher, 5, state, [createPresence("p2")]).state;
  state = handler.matchLoop({}, logger, nk, dispatcher, 6, state, []).state;
  assert(state.status === "active", "match should remain active during reconnect window");
  state.disconnectedPlayers.p2 = state.disconnectedPlayers.p2 - (state.disconnectTimeoutSeconds + 1);
  state = handler.matchLoop({}, logger, nk, dispatcher, 40, state, []).state;

  assert(state.status === "finished", "match should finish after reconnect timeout");
  assert(state.winner === "p1", "connected player should win after reconnect timeout");
  assert(state.historyPersisted === true, "completed match should persist history");
  assert(dispatcher.labels.includes("tic_tac_toe_match:classic:finished"), "finished label should be published");

  const historyWrites = nk.storageRead([{ collection: "match_history", key: state.historyKey }]);
  assert(historyWrites.length === 1, "match history should be written once");
}

function testMovePayloadSupportsSocketBase64Encoding() {
  const { initializer, nk, logger } = bootstrapRuntime();
  const handler = initializer.matches.tic_tac_toe_match;
  const dispatcher = createDispatcher();
  let state = handler.matchInit({}, logger, nk, { mode: "classic", matchId: "match-3" }).state;

  state = handler.matchJoin({}, logger, nk, dispatcher, 1, state, [createPresence("p1"), createPresence("p2")]).state;
  state = handler.matchLoop(
    {},
    logger,
    nk,
    dispatcher,
    2,
    state,
    [
      {
        opCode: 1,
        data: Buffer.from(JSON.stringify({ position: 0 }), "utf8").toString("base64"),
        sender: createPresence("p1")
      }
    ]
  ).state;

  assert(state.board[0] === "X", "base64 move payload should be decoded before validation");
  assert(state.moveHistory.length === 1, "decoded move should update history");
}

function testMovePayloadSupportsByteArrayEncoding() {
  const { initializer, nk, logger } = bootstrapRuntime();
  const handler = initializer.matches.tic_tac_toe_match;
  const dispatcher = createDispatcher();
  let state = handler.matchInit({}, logger, nk, { mode: "classic", matchId: "match-4" }).state;

  state = handler.matchJoin({}, logger, nk, dispatcher, 1, state, [createPresence("p1"), createPresence("p2")]).state;
  state = handler.matchLoop(
    {},
    logger,
    nk,
    dispatcher,
    2,
    state,
    [
      {
        opCode: 1,
        data: Array.from(Buffer.from(JSON.stringify({ position: 4 }), "utf8")),
        sender: createPresence("p1")
      }
    ]
  ).state;

  assert(state.board[4] === "X", "byte-array move payload should be normalized before validation");
  assert(state.moveHistory.length === 1, "normalized move should update history");
}

function run() {
  testFindMatchUsesModeAwareWaitingLabels();
  testReconnectRestoresTimedTurnWindow();
  testReconnectTimeoutPersistsHistoryOnce();
  testMovePayloadSupportsSocketBase64Encoding();
  testMovePayloadSupportsByteArrayEncoding();
  process.stdout.write("runtime smoke tests passed\n");
}

run();
