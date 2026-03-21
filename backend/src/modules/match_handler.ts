const TICK_RATE = 1;
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 2;

type Mark = "X" | "O";
type MatchLabel = "waiting" | "in_progress" | "completed";

interface PresenceState {
  userId: string;
  sessionId: string;
  username: string;
}

interface MatchJoinAttemptResult {
  state: MatchState;
  accept: boolean;
  rejectMessage?: string;
}

interface MatchLoopResult {
  state: MatchState | null;
}

interface PlayerMoveMessage {
  position: number;
}

interface MatchState {
  board: Array<Mark | null>;
  presences: Record<string, PresenceState>;
  turnOrder: string[];
  marks: Record<string, Mark>;
  currentTurn: string | null;
  winner: string | null;
  winnerMark: Mark | null;
  label: MatchLabel;
  moveCount: number;
}

export function createTicTacToeMatchHandler(logger: nkruntime.Logger): nkruntime.MatchHandler {
  return {
    matchInit(_ctx, params): { state: MatchState; tickRate: number; label: string } {
      const requestedLabel = typeof params?.label === "string" ? params.label : "waiting";
      const state: MatchState = {
        board: Array(9).fill(null),
        presences: {},
        turnOrder: [],
        marks: {},
        currentTurn: null,
        winner: null,
        winnerMark: null,
        label: requestedLabel === "in_progress" ? "waiting" : "waiting",
        moveCount: 0
      };

      logger.debug("Match initialized.", { label: state.label });

      return {
        state,
        tickRate: TICK_RATE,
        label: buildMatchLabel(state)
      };
    },

    matchJoinAttempt(
      _ctx,
      _dispatcher,
      _tick,
      state,
      presence
    ): MatchJoinAttemptResult {
      if (Object.keys(state.presences).length >= MAX_PLAYERS) {
        return {
          state,
          accept: false,
          rejectMessage: "Match is already full."
        };
      }

      logger.debug("Player join attempt accepted.", {
        userId: presence.userId,
        username: presence.username
      });

      return { state, accept: true };
    },

    matchJoin(_ctx, dispatcher, _tick, state, presences): MatchState {
      for (const presence of presences) {
        state.presences[presence.sessionId] = {
          userId: presence.userId,
          sessionId: presence.sessionId,
          username: presence.username
        };

        state.turnOrder.push(presence.sessionId);
      }

      assignMarks(state);
      updateLifecycleState(state);
      broadcastState(dispatcher, state, 0);

      logger.info("Players joined match.", {
        connectedPlayers: Object.keys(state.presences).length,
        label: state.label
      });

      return state;
    },

    matchLeave(_ctx, dispatcher, _tick, state, presences): MatchState | null {
      for (const presence of presences) {
        delete state.presences[presence.sessionId];
        delete state.marks[presence.sessionId];
        state.turnOrder = state.turnOrder.filter((sessionId) => sessionId !== presence.sessionId);

        if (state.currentTurn === presence.sessionId) {
          state.currentTurn = state.turnOrder[0] ?? null;
        }
      }

      if (Object.keys(state.presences).length === 0) {
        logger.info("Terminating empty match.");
        return null;
      }

      updateLifecycleState(state);
      broadcastState(dispatcher, state, 0);

      return state;
    },

    matchLoop(_ctx, dispatcher, _tick, state, messages): MatchLoopResult {
      for (const message of messages) {
        if (message.opCode !== 1) {
          continue;
        }

        const sender = state.presences[message.sender.sessionId];
        if (!sender) {
          continue;
        }

        const payload = decodePayload<PlayerMoveMessage>(message.data);
        const rejection = validateMove(state, message.sender.sessionId, payload);

        if (rejection) {
          dispatcher.broadcastMessage(2, JSON.stringify({ error: rejection }), [message.sender], message.sender);
          continue;
        }

        const playerMark = state.marks[message.sender.sessionId];
        const position = payload.position;

        state.board[position] = playerMark;
        state.moveCount += 1;

        const winningMark = getWinningMark(state.board);
        if (winningMark) {
          state.winner = message.sender.sessionId;
          state.winnerMark = winningMark;
          state.currentTurn = null;
          state.label = "completed";
        } else if (state.moveCount === state.board.length) {
          state.currentTurn = null;
          state.label = "completed";
        } else {
          state.currentTurn = getNextTurn(state, message.sender.sessionId);
          state.label = "in_progress";
        }

        broadcastState(dispatcher, state, 1, message.sender);
      }

      return { state };
    },

    matchTerminate(_ctx, dispatcher, _tick, state, graceSeconds): MatchState {
      dispatcher.broadcastMessage(3, JSON.stringify({ message: "match_terminating", graceSeconds }));
      logger.info("Match terminating.", { graceSeconds });
      return state;
    },

    matchSignal(_ctx, _dispatcher, _tick, state, data): { state: MatchState; data?: string } {
      logger.debug("Received match signal.", { data });
      return {
        state,
        data: JSON.stringify({
          received: true,
          label: buildMatchLabel(state)
        })
      };
    }
  };
}

function assignMarks(state: MatchState): void {
  const orderedPresences = state.turnOrder.filter((sessionId) => Boolean(state.presences[sessionId]));
  if (orderedPresences.length > 0) {
    state.marks[orderedPresences[0]] = "X";
  }
  if (orderedPresences.length > 1) {
    state.marks[orderedPresences[1]] = "O";
  }
}

function updateLifecycleState(state: MatchState): void {
  const playerCount = Object.keys(state.presences).length;

  if (playerCount < MIN_PLAYERS) {
    state.label = "waiting";
    state.currentTurn = state.turnOrder[0] ?? null;
    return;
  }

  if (!state.winner && state.moveCount < state.board.length) {
    state.label = "in_progress";
    state.currentTurn = state.currentTurn ?? state.turnOrder[0] ?? null;
  }
}

function validateMove(
  state: MatchState,
  sessionId: string,
  payload: PlayerMoveMessage
): string | null {
  if (state.label !== "in_progress") {
    return "Match is not accepting moves.";
  }

  if (state.currentTurn !== sessionId) {
    return "It is not your turn.";
  }

  if (!Number.isInteger(payload.position) || payload.position < 0 || payload.position >= state.board.length) {
    return "Move position is invalid.";
  }

  if (state.board[payload.position] !== null) {
    return "Cell is already occupied.";
  }

  return null;
}

function getNextTurn(state: MatchState, sessionId: string): string | null {
  if (state.turnOrder.length < 2) {
    return sessionId;
  }

  const currentIndex = state.turnOrder.indexOf(sessionId);
  if (currentIndex === -1) {
    return state.turnOrder[0] ?? null;
  }

  for (let offset = 1; offset <= state.turnOrder.length; offset += 1) {
    const candidate = state.turnOrder[(currentIndex + offset) % state.turnOrder.length];
    if (state.presences[candidate]) {
      return candidate;
    }
  }

  return null;
}

function getWinningMark(board: Array<Mark | null>): Mark | null {
  const winningLines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6]
  ];

  for (const [a, b, c] of winningLines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }

  return null;
}

function decodePayload<T>(data: string): T {
  return JSON.parse(data) as T;
}

function buildMatchLabel(state: MatchState): string {
  return JSON.stringify({
    game: "tic_tac_toe",
    status: state.label,
    players: Object.keys(state.presences).length,
    open: Math.max(0, MAX_PLAYERS - Object.keys(state.presences).length)
  });
}

function serializeState(state: MatchState): Record<string, unknown> {
  return {
    board: state.board,
    players: state.turnOrder
      .filter((sessionId) => Boolean(state.presences[sessionId]))
      .map((sessionId) => ({
        sessionId,
        userId: state.presences[sessionId].userId,
        username: state.presences[sessionId].username,
        mark: state.marks[sessionId] ?? null
      })),
    currentTurn: state.currentTurn,
    winner: state.winner,
    winnerMark: state.winnerMark,
    status: state.label,
    moveCount: state.moveCount
  };
}

function broadcastState(
  dispatcher: nkruntime.MatchDispatcher,
  state: MatchState,
  opCode: number,
  sender?: nkruntime.Presence
): void {
  dispatcher.broadcastMessage(opCode, JSON.stringify(serializeState(state)), null, sender);
}
