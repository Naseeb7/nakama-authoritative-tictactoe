# nakama-authoritative-tictactoe

Server-authoritative multiplayer Tic-Tac-Toe built with Nakama runtime modules and real-time matchmaking.

## Overview

This project provides the backend foundation for a real-time multiplayer Tic-Tac-Toe game using Nakama's authoritative runtime model. Game rules, turn validation, and state transitions are enforced on the server to keep all clients synchronized around a single trusted game state.

## Tech Stack

- Nakama 3.22.0
- TypeScript runtime modules
- Node.js for module compilation
- Docker and Docker Compose
- PostgreSQL 13

## Architecture Summary

The backend uses Nakama authoritative matches to host server-owned game sessions. Clients connect over Nakama's real-time transport, submit gameplay intents, and receive authoritative state updates broadcast from the match loop. Matchmaking is designed to route compatible players into isolated match instances managed entirely by the server runtime.

## Setup Instructions

Setup steps will be documented here as the local development workflow is finalized.

## Deployment Plan

Deployment steps for container build, registry publishing, and environment-specific Nakama configuration will be documented here.

## Architecture Overview

The backend is organized as a Nakama JavaScript runtime module compiled from TypeScript into a single ES5-compatible bundle at `backend/build/main.js`. Runtime registration happens in `backend/src/main.ts`, and authoritative gameplay rules live in `backend/src/modules/match_handler.ts`.

The match handler owns:

- authoritative board state
- turn order and symbol assignment
- mode-aware matchmaking labels
- reconnect tracking
- leaderboard and per-player stats persistence
- completed match history persistence

## Authoritative Match Lifecycle

Each match follows the same server-owned lifecycle:

1. `create_match` or `find_match` creates an authoritative match with mode params.
2. `matchInit` creates the initial board, timestamps, lifecycle label, and reconnect settings.
3. Players join and are assigned `X` then `O`.
4. Once two players are present, the match transitions from `waiting` to `active`.
5. Players send move messages with opcode `1`, and the server validates and applies them.
6. The server broadcasts authoritative state updates with opcode `2`.
7. The match finishes on win, draw, timed-mode turn timeout, or reconnect timeout expiry.
8. On completion, leaderboard/stats updates are persisted and match history is written to storage.

## Matchmaking Flow

Both RPCs accept an optional mode payload:

```json
{
  "mode": "classic"
}
```

Supported modes are `classic` and `timed`. If no payload is provided, the backend defaults to `classic`.

`create_match` always creates a new authoritative match using the requested mode.

`find_match` lists authoritative matches and reuses one only when all of the following are true:

- label starts with `tic_tac_toe_match:<mode>`
- lifecycle label is still `:waiting`
- size is less than `2`

If no compatible waiting match exists, `find_match` creates a new one with the requested mode.

## Reconnect Handling Strategy

Disconnects do not immediately end the match anymore.

When a player leaves:

- the player stays in `state.players`
- `state.disconnectedPlayers[userId]` is set to the disconnect timestamp
- the match keeps the current board, symbols, move history, and turn order

The reconnect timeout is `30` seconds and is exposed in match state as `disconnectTimeoutSeconds`.

If the disconnected player rejoins within the timeout:

- the player is removed from `disconnectedPlayers`
- the match resumes using the same authoritative board and turn data

If the timeout expires:

- the connected remaining player wins automatically
- if every player is disconnected and all reconnect windows expire, the match is closed without a winner

## Timed Mode Logic

Timed mode uses a `30` second turn timer.

Behavior:

- mode is set with `{"mode":"timed"}`
- when the second player joins, the first active turn gets a 30-second deadline
- after each valid move, the next turn receives a fresh 30-second deadline
- if the active player does not move before the deadline, the other player wins automatically

Disconnects pause the timed-mode turn deadline. If the disconnected player reconnects in time, the paused turn window is restored and the match continues without resetting board state or turn ownership.

## Leaderboard Persistence

The runtime ensures a global leaderboard named `global_wins` exists during module initialization.

On match completion:

- wins are written to `global_wins`
- per-player stats are written to Nakama storage under collection `player_stats`, key `stats`

Tracked stats include:

- wins
- losses
- games played
- current streak
- best streak

## Match History Storage

Every completed match is written once to Nakama storage in collection `match_history`.

Stored object shape:

```json
{
  "players": ["user-id-1", "user-id-2"],
  "winner": "user-id-1",
  "mode": "classic",
  "moveHistory": [
    { "playerId": "user-id-1", "position": 0 }
  ],
  "durationSeconds": 18,
  "timestamp": 1710000000
}
```

The storage key is the Nakama `matchId` when available, with a timestamp fallback if the runtime does not provide one.

## Deployment Instructions

The local runtime flow expects the TypeScript backend to be compiled before Nakama starts.

Typical local steps:

1. Build the runtime bundle from `backend/`.
2. Start PostgreSQL and Nakama with Docker Compose.
3. Connect a Nakama client to `127.0.0.1:7350`.

The Docker Compose setup does not change the runtime wiring. Nakama still loads the compiled module bundle from `/nakama/data/modules/build/`.

## Docker Setup

`docker-compose.yml` starts:

- PostgreSQL 13
- Nakama 3.22.0

Exposed ports:

- `7349` for gRPC
- `7350` for the client API
- `7351` for the Nakama console

Mounted runtime paths:

- `./backend/build` -> `/nakama/data/modules/build`
- `./backend/local.yml` -> `/nakama/data/local.yml`

The TypeScript compiler configuration remains aligned with Nakama JS runtime requirements:

- `"module": "none"`
- `"target": "ES5"`

## Testing Multiplayer Locally

For a local multiplayer sanity check:

1. Build the backend bundle.
2. Run `docker compose up`.
3. Open two clients and authenticate two different users.
4. Call `find_match` or `create_match` with the same mode.
5. Join the returned match id over Nakama realtime.
6. Send move messages with opcode `1`.
7. Confirm both clients receive opcode `2` state broadcasts.
8. Disconnect one client and reconnect within 30 seconds to verify restoration.
9. Repeat with a disconnect longer than 30 seconds to verify reconnect-timeout forfeits.

## RPC Usage Examples

Create a classic match:

```json
{}
```

Create a timed match:

```json
{
  "mode": "timed"
}
```

Find or create a classic match:

```json
{
  "mode": "classic"
}
```

Find or create a timed match:

```json
{
  "mode": "timed"
}
```

Valid move message payload sent with opcode `1`:

```json
{
  "position": 4
}
```
