# Nakama Authoritative Tic-Tac-Toe

Server-authoritative multiplayer Tic-Tac-Toe built with Nakama authoritative matches, a Next.js frontend, realtime websocket state sync, per-player match history, leaderboard progression, reconnect recovery, and a timed game mode.

## Project Overview

This project implements a two-player multiplayer Tic-Tac-Toe game where all gameplay rules are enforced on the server.

The frontend does not own the board state. It only sends gameplay intents, such as a requested move, and renders the state broadcast back from Nakama. The authoritative game state lives inside the Nakama match handler, which controls:

- player admission into matches
- symbol assignment
- turn order
- move validation
- win and draw detection
- timed-turn expiry
- reconnect timeout resolution
- leaderboard updates
- match history persistence

This architecture prevents clients from cheating by locally forcing turns, overwriting board state, or claiming invalid wins.

## Live Deployment Links

- Frontend URL: https://nakama-authoritative-tictactoe.vercel.app/
- Nakama server endpoint: https://nakama-authoritative-tictactoe-production.up.railway.app/

## Tech Stack

- Frontend: Next.js App Router, React, Tailwind CSS
- Backend: Nakama TypeScript runtime modules
- Realtime: Nakama WebSocket transport
- Database: PostgreSQL
- Deployment: Railway + Vercel

## Features Implemented

- Automatic matchmaking through `find_match`
- Manual room creation through `create_match`
- Realtime authoritative state sync over Nakama sockets
- Server-side move validation
- Reconnect handling with timeout-based resolution
- Leaderboard tracking wins and streak-related stats
- Match history persistence per player
- Timed mode with turn deadlines and auto-forfeit
- Concurrent authoritative match support

## Architecture Summary

The core gameplay loop is server authoritative:

1. Client joins or creates a match through an RPC.
2. Client sends a move intent with opcode `1`.
3. Server validates the move inside the Nakama match loop.
4. Server updates the authoritative board state.
5. Server checks win, draw, timeout, or reconnect outcomes.
6. Server broadcasts the authoritative state to both players with opcode `2`.
7. Frontend rerenders from that server state.

The browser never becomes the source of truth for the match.

## Matchmaking Flow

The backend exposes two RPCs:

- `create_match`
- `find_match`

### `create_match`

Creates a new authoritative Nakama match immediately for the selected mode.

### `find_match`

Looks for an existing compatible waiting room first, then falls back to creating a new one if none exists.

Compatibility is based on:

- authoritative match type
- room size less than 2
- mode-specific match label
- lifecycle label in `waiting`

Supported modes:

- `classic`
- `timed`

Example RPC payload:

```json
{
  "mode": "timed"
}
```

## Server Authoritative Enforcement

Gameplay validation lives inside the Nakama match handler in the backend runtime.

Each incoming move is processed in `matchLoop` and rejected unless all conditions are true:

- match is active
- player is part of the match
- player is the current turn owner
- payload is valid JSON
- position is between `0` and `8`
- target cell is empty
- player has an assigned symbol
- no reconnect pause is currently blocking move processing

Only after validation succeeds does the server:

- update the board
- append move history
- detect wins or draws
- rotate the turn
- broadcast the next state

This makes illegal client-side moves harmless because invalid messages are ignored.

## Leaderboard and Stats System

The backend creates and updates a global leaderboard:

- leaderboard id: `global_wins`

Per-player stats are stored in Nakama storage:

- collection: `player_stats`
- key: `stats`

Tracked stats:

- wins
- losses
- games played
- current streak
- best streak

Stats are updated when a match ends through:

- normal win
- draw
- timed-mode forfeit
- reconnect-timeout forfeit

The frontend leaderboard page displays:

- top global wins
- current player stats
- streak progress

## Match History Persistence

Completed matches are persisted to Nakama storage and indexed per player.

Stored match history includes:

- match id
- timestamp
- duration
- mode
- winner
- participating players
- player display names
- move history
- end reason
- end reason text

The frontend history page loads this data via the `list_match_history` RPC and renders a paginated archive.

## Timed Mode Logic

Timed mode is implemented on the server.

Rules:

- each active turn gets a 30-second deadline
- the turn clock starts when the second player joins
- after every valid move, the next turn receives a fresh deadline
- if the active player runs out of time, the other player wins automatically

Timed mode is pause-aware:

- if a player disconnects during a timed match, the turn timer pauses
- if the player reconnects in time, the remaining turn time is restored
- if the reconnect window expires, the match is resolved on the server

## Reconnect Handling

Disconnects do not immediately destroy the match.

Behavior:

- disconnected players remain part of the match state
- a reconnect timeout window is tracked on the server
- the current game can resume if the player returns before expiry
- if the timeout expires, the server resolves the match automatically

This allows:

- page refresh recovery
- temporary network loss recovery
- fair timeout-based match closure

## Deployment Instructions

### Backend on Railway

The backend is deployed as a Dockerized Nakama service.

Key backend files:

- `backend/Dockerfile`
- `backend/local.yml`

Deployment behavior:

1. TypeScript runtime is compiled to `backend/build/main.js`
2. Docker image copies compiled JS into Nakama runtime path
3. Docker entry command runs database migrations
4. Nakama starts using `local.yml`

Required backend environment variable:

```env
DATABASE_ADDRESS=username:password@host:port/database
```

Nakama loads the runtime from:

- `runtime.path: /nakama/data/modules`
- `runtime.js_entrypoint: build/main.js`

### Frontend on Vercel

The frontend is deployed as a separate Vercel project with `frontend/` as the project root.

Recommended frontend environment variables:

```env
NEXT_PUBLIC_NAKAMA_URL=https://your-nakama-host
NEXT_PUBLIC_NAKAMA_SERVER_KEY=defaultkey
```

Alternative split env format:

```env
NEXT_PUBLIC_NAKAMA_HOST=your-host
NEXT_PUBLIC_NAKAMA_PORT=443
NEXT_PUBLIC_NAKAMA_USE_SSL=true
NEXT_PUBLIC_NAKAMA_SERVER_KEY=defaultkey
```

## Local Setup Instructions

### 1. Build the backend runtime

From `backend/`:

```bash
npm install
npm run build
```

### 2. Start Nakama and PostgreSQL

From the repository root:

```bash
docker compose up --build
```

This starts:

- PostgreSQL 13
- Nakama 3.22.0

Exposed ports:

- `5432` PostgreSQL
- `7349` Nakama gRPC
- `7350` Nakama HTTP and websocket API
- `7351` Nakama console

### 3. Start the frontend

From `frontend/`:

```bash
npm install
npm run dev
```

Default local frontend URL:

- `http://localhost:3000`

Default local Nakama configuration:

```env
NEXT_PUBLIC_NAKAMA_HOST=127.0.0.1
NEXT_PUBLIC_NAKAMA_PORT=7350
NEXT_PUBLIC_NAKAMA_SERVER_KEY=defaultkey
NEXT_PUBLIC_NAKAMA_USE_SSL=false
```

## Multiplayer Testing Instructions

Recommended local multiplayer testing options:

1. one normal browser window plus one incognito window
2. two separate browsers
3. two devices on the same deployed environment

Suggested test plan:

1. Open two clients
2. Let both authenticate as different device users
3. Use `find_match` in the same mode
4. Confirm both clients join the same room
5. Submit alternating moves
6. Confirm invalid out-of-turn moves are ignored
7. Test win and draw flows
8. Test timed mode timeout resolution
9. Refresh one client and verify reconnect recovery
10. Leave one client disconnected longer than 30 seconds and verify reconnect-timeout resolution

## Repository Structure Overview

```text
.
├── backend/
│   ├── build/              # Compiled Nakama runtime bundle
│   ├── src/
│   │   ├── main.ts         # RPC and match registration
│   │   └── modules/
│   │       └── match_handler.ts
│   ├── Dockerfile
│   ├── local.yml
│   └── package.json
├── frontend/
│   ├── app/                # Next.js App Router pages
│   ├── components/         # Layout, board, provider, UI components
│   ├── lib/                # Nakama client setup, env parsing, storage helpers
│   ├── public/
│   └── package.json
├── docker-compose.yml      # Local Nakama + Postgres stack
└── README.md
```

## Design Decisions

### 1. Server authoritative gameplay

The main design goal is fairness and consistency. The frontend is intentionally thin and reactive, while the backend owns rules and state transitions.

### 2. RPC-driven matchmaking

Instead of exposing raw room management to the client, the frontend requests matchmaking through controlled backend RPCs.

### 3. Per-match isolated state

Each authoritative Nakama match owns its own state object, which allows many matches to run concurrently without sharing gameplay state.

### 4. Persistence beyond the live room

The project persists:

- wins leaderboard
- per-player stats
- completed match history

This allows the app to continue providing value after a match ends.

### 5. Disconnect-aware gameplay

Instead of immediately ending a match on disconnect, the backend gives players a reconnect window and resolves the outcome only when needed.

## Future Improvements

- friend invites or private room codes
- spectating support
- rematch handshake between both players
- richer player profiles and account management
- richer analytics for match history
- leaderboard filtering by mode
- observability and match telemetry
- automated integration tests around match state transitions

## Submission Notes

This repository is structured as a monorepo:

- `frontend/` is deployed on Vercel
- `backend/` is deployed on Railway using Docker
- PostgreSQL is used by Nakama as the persistent storage layer

The project demonstrates a complete server-authoritative multiplayer flow rather than a client-simulated board with server relay.
