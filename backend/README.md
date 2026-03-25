# Backend

## Overview

This directory contains the Nakama authoritative runtime implementation for the project.

The backend is responsible for all gameplay decisions. It owns the match state, validates moves, resolves wins and timeouts, persists player progress, and broadcasts the authoritative board state to connected clients.

Key backend files:

- `src/main.ts`
- `src/modules/match_handler.ts`
- `local.yml`
- `Dockerfile`

The runtime is written in TypeScript and compiled into a JavaScript bundle loaded by Nakama.

## Match Lifecycle Implementation

The authoritative handler is implemented in:

- `src/modules/match_handler.ts`

It registers the standard Nakama match lifecycle hooks:

- `matchInit`
- `matchJoinAttempt`
- `matchJoin`
- `matchLoop`
- `matchLeave`
- `matchTerminate`
- `matchSignal`

### `matchInit`

Used to create the initial state for a new authoritative room.

Responsibilities:

- initialize the empty board
- initialize player list and symbols
- set `waiting` lifecycle state
- store mode
- initialize reconnect and timer tracking
- assign the initial match label
- set `tickRate: 1`

### `matchJoinAttempt`

Used to decide whether a player is allowed to enter a room.

Responsibilities:

- reject new joins if the match is already finished
- reject joins if the room is already full
- allow returning players back into an existing unfinished room

### `matchJoin`

Used after a join attempt succeeds.

Responsibilities:

- add players to the match
- assign `X` to the first player and `O` to the second
- capture username or guest-friendly display name
- clear disconnect markers for returning players
- transition the room from `waiting` to `active` when two players are present
- start or restore the turn timer in timed mode
- update the lifecycle label
- broadcast the current authoritative state

### `matchLoop`

This is the core gameplay loop.

Responsibilities:

- process incoming match messages
- validate moves
- update board state
- detect wins and draws
- rotate turns
- resolve timed turn expiry
- resolve reconnect timeout expiry
- persist leaderboard, stats, and match history
- broadcast authoritative state updates
- terminate finished rooms after a short grace period

### `matchLeave`

Used when one or more players disconnect.

Responsibilities:

- mark the player as disconnected rather than removing them from the logical match state
- pause the timed turn clock when required
- keep the match recoverable during the reconnect window
- end a finished match immediately if all players have already left
- broadcast updated reconnect state

### `matchTerminate`

Currently minimal.

Responsibilities:

- log termination metadata
- return the current state

In this repository, actual room shutdown is driven mainly by returning `null` from:

- `matchLoop`
- `matchLeave`

### `matchSignal`

Currently not used for gameplay.

Responsibilities:

- log signal activity
- echo the provided signal data back through the result

## Game State Structure

Each authoritative match owns its own state object.

Key fields:

- `board`
  9-cell Tic-Tac-Toe board
- `players`
  ordered player id list
- `symbols`
  mapping of player id to `X` or `O`
- `currentTurn`
  player id whose move is currently allowed
- `winner`
  winning player id or `null`
- `status`
  `waiting`, `active`, or `finished`
- `label`
  lifecycle-aware Nakama room label
- `startTime`
  match creation timestamp
- `endTime`
  match completion timestamp
- `moveHistory`
  ordered move log
- `mode`
  `classic` or `timed`
- `disconnectedPlayers`
  map of player id to disconnect timestamp
- `playerNames`
  map of player id to user-facing display name
- `disconnectTimeoutSeconds`
  reconnect grace window
- `turnDeadlineTick`
  active timed-turn deadline
- `pausedTurnRemainingSeconds`
  preserved turn time during disconnect pause
- `endReason`
  final resolution type
- `endReasonText`
  player-facing result explanation
- `historyPersisted`
  prevents duplicate match-history writes
- `finishedTick`
  used for finished-room TTL cleanup

## Move Validation Logic

Moves are sent from the client with opcode `1`.

Expected payload:

```json
{
  "position": 4
}
```

Validation is performed in `matchLoop`.

The move is rejected if any of the following is true:

- opcode is not `1`
- match is not `active`
- match is already `finished`
- reconnect pause is in effect
- sender is not the current-turn player
- payload cannot be parsed
- position is not an integer from `0` to `8`
- target board cell is already occupied
- player has no assigned symbol

Rejected moves do not mutate state.

## Win Detection Logic

Win detection uses the standard Tic-Tac-Toe winning combinations:

- 3 horizontal lines
- 3 vertical lines
- 2 diagonal lines

After every valid move:

1. server writes the player symbol to the board
2. server appends the move to `moveHistory`
3. server checks for a winning line
4. if no win exists, server checks whether the board is full

Possible outcomes:

- normal win
- draw
- match continues to next turn

## Reconnect Handling

Disconnects are handled explicitly on the server.

Behavior:

- disconnecting players remain in `state.players`
- their disconnect time is stored in `state.disconnectedPlayers`
- the reconnect timeout is 30 seconds

If a disconnected player returns before timeout:

- disconnect marker is removed
- the match resumes
- paused timed-turn clock can be restored

If the timeout expires:

- the server finalizes the match
- the connected player wins if one remains
- if both players are gone long enough, the room can end without a winner

This logic prevents a temporary refresh or short network interruption from immediately destroying the match.

## Timer Mode Implementation

Timed mode uses:

- `TURN_TIMEOUT_SECONDS = 30`

Timer control is tick-based.

### Turn tracking

- when the second player joins, the first turn gets `turnDeadlineTick = tick + 30`
- after every valid move, the next player gets a fresh deadline

### Disconnect pause behavior

When a disconnect happens during a timed active match:

- remaining time is captured in `pausedTurnRemainingSeconds`
- `turnDeadlineTick` is cleared
- timer remains paused until reconnect resolution

### Timeout forfeits

If the current player does not move before `turnDeadlineTick`:

- match ends immediately
- the other player is declared winner
- `endReason = "turn-timeout"`
- stats, leaderboard, and match history are persisted

## Leaderboard Persistence

The backend creates and updates a global wins leaderboard:

- leaderboard id: `global_wins`

This leaderboard is ensured during module initialization in `src/main.ts`.

On match completion, the backend may update:

- Nakama leaderboard record for wins
- per-player stats in storage

Player stats storage:

- collection: `player_stats`
- key: `stats`

Tracked stats:

- wins
- losses
- games played
- current streak
- best streak

Update paths include:

- normal win
- draw
- timed timeout win
- reconnect-timeout win

## Match History Persistence

Every completed match is persisted once to Nakama storage.

Storage collection:

- `match_history`

Additional per-user index collection:

- `match_history_index`

Stored history data includes:

- match id
- timestamp
- duration
- mode
- winner
- players
- player names
- move history
- end reason
- end reason text

The per-user index allows the `list_match_history` RPC to return only the current user’s completed matches.

## Match Label Strategy

Room labels are lifecycle-aware and mode-aware.

Examples:

- `tic_tac_toe_match:classic:waiting`
- `tic_tac_toe_match:classic:active`
- `tic_tac_toe_match:classic:finished`
- `tic_tac_toe_match:timed:waiting`
- `tic_tac_toe_match:timed:active`
- `tic_tac_toe_match:timed:finished`

Labels are used for:

- matchmaking compatibility checks
- waiting-room discovery
- room lifecycle tracking

The frontend never depends directly on labels for gameplay enforcement. They are mainly used by backend matchmaking and observability.

## Concurrency Model

Concurrency is handled by Nakama’s authoritative match system.

Each created match is an isolated runtime instance with:

- its own state object
- its own tick loop
- its own players
- its own timers
- its own disconnect tracking
- its own persistence events

This means multiple matches can run simultaneously without sharing board state or interfering with one another.

The backend does not implement any custom cross-match scheduler. It relies on Nakama’s native per-match isolation model.

## Deployment

### Dockerfile

The backend Docker image is defined in:

- `Dockerfile`

Build flow:

1. Use Node to install dependencies and compile TypeScript
2. Copy compiled `build/` output into Nakama runtime modules directory
3. Copy `local.yml` into the Nakama data directory
4. Run database migrations on startup
5. Start Nakama using the copied config

### Railway deployment

Recommended deployment model:

1. Create a Railway service for the backend
2. Use `backend/` as the root directory
3. Build using the provided Dockerfile
4. Provide a PostgreSQL service in the same Railway project
5. Set `DATABASE_ADDRESS`
6. Start Nakama via the Docker command already defined in the image

The runtime entrypoint expected by Nakama is:

- `/nakama/data/modules/build/main.js`

Configured by:

- `runtime.path: /nakama/data/modules`
- `runtime.js_entrypoint: build/main.js`

## Environment Variables

### `DATABASE_ADDRESS`

Required by the deployed Nakama container.

Expected format:

```env
DATABASE_ADDRESS=username:password@host:port/database
```

This value is passed to:

- `nakama migrate up`
- Nakama server startup command

The backend does not require a large application-level env surface beyond database connectivity because most runtime behavior is encoded directly in the match handler and Nakama config.

## Summary

This backend implements a full authoritative multiplayer game loop using Nakama runtime matches.

It handles:

- match creation and discovery
- admission control
- turn enforcement
- move validation
- win and draw resolution
- reconnect recovery
- timed mode
- leaderboard updates
- stats persistence
- match history persistence

The frontend acts only as a realtime client. The backend remains the source of truth for the entire multiplayer experience.
