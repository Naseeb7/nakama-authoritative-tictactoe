# Frontend

## Overview

This frontend is a thin realtime client built with Next.js. It does not own gameplay rules or the authoritative board state.

Its responsibility is to:

- bootstrap a Nakama session
- open the realtime socket connection
- request matchmaking through backend RPCs
- join authoritative matches
- send move intents
- render the authoritative state broadcast from the server
- display leaderboard and match history data

The Nakama match handler is the source of truth for gameplay. The frontend reacts to server broadcasts rather than simulating the board locally.

## Stack

- Next.js App Router
- React
- Tailwind CSS
- `@heroiclabs/nakama-js`

Key frontend areas:

- `app/`
- `components/`
- `lib/`

## Session Bootstrap Flow

Session and socket lifecycle are managed in:

- `components/providers/app-provider.tsx`

### Session restore

The provider bootstraps the app through `restoreOrCreateSession()`.

Flow:

1. Read any previously stored Nakama session from browser storage
2. Refresh the session if it is close to expiry
3. If no valid session exists, authenticate a device guest account
4. Persist the resulting session back to storage

The frontend uses device auth so users can get into the game without a manual sign-up flow.

### Socket connection lifecycle

After session bootstrap:

1. `createNakamaClient()` builds the Nakama client
2. `client.createSocket(...)` creates the realtime socket
3. `socket.connect(session, true)` opens the realtime connection
4. The provider subscribes to:
   - `ondisconnect`
   - `onerror`
   - `onmatchdata`
   - `onmatchpresence`

The provider stores socket status as:

- `disconnected`
- `connecting`
- `connected`

## Match Join Flow

The match join flow begins on:

- `app/play/page.tsx`

### Requesting a match

The page calls:

- `requestMatch("find_match", mode)`
- or `requestMatch("create_match", mode)`

Inside the provider:

1. frontend calls the Nakama RPC
2. backend returns a `matchId`
3. frontend joins the authoritative match using the socket
4. active match metadata is stored for session restore
5. route navigation moves the user to `/match/[matchId]`

### Route recovery

If a user lands directly on `/match/[matchId]` or refreshes the page:

1. the match page calls `joinExistingMatch(matchId, mode)`
2. the provider attempts `socket.joinMatch(matchId)`
3. if the room is gone or already ended, the page shows a friendly unavailable-state UI

## Move Submission Logic

Moves are sent from the frontend as realtime match messages.

Implementation:

- provider method: `sendMove(position)`

Opcode:

- `1`

Payload:

```json
{
  "position": 4
}
```

The frontend does not mutate the board directly after sending a move. It waits for the authoritative broadcast from the backend.

## State Sync Logic

Authoritative state updates come from Nakama match broadcasts.

Opcode:

- `2`

The provider:

1. receives `onmatchdata`
2. filters for opcode `2`
3. parses the JSON broadcast
4. stores the result in `latestMatchState`

The match page renders from `latestMatchState`, including:

- board
- current turn
- winner
- players and symbols
- disconnected players
- timer state
- end reason and end text

This means the UI is always driven by the server state.

## Leaderboard UI Logic

Leaderboard UI lives in:

- `app/leaderboard/page.tsx`

It loads two backend data sources:

1. `listLeaderboardRecords(...)`
   - reads the `global_wins` leaderboard
2. `readStorageObjects(...)`
   - reads the current player’s `player_stats/stats` object

Displayed data includes:

- top win leaderboard
- wins
- losses
- games played
- current streak
- best streak

The page also normalizes legacy or anonymous display values so raw user IDs are not shown to the player.

## Timer Rendering Logic

Timed-mode rendering lives in:

- `app/match/[matchId]/page.tsx`

The backend broadcasts timer-related fields such as:

- `turnExpiresAt`
- `turnSecondsRemaining`
- `serverTime`
- `turnDeadlineTick`

### `TurnTimer` component

The `TurnTimer` component:

1. synchronizes local clock offset against `serverTime`
2. uses `turnExpiresAt` as the authoritative deadline
3. updates every second
4. shows paused remaining time when reconnect handling pauses the clock

This avoids trusting the browser clock alone and keeps the countdown aligned with the backend.

## Reconnect Handling UX

Reconnect-aware UI exists on the match page and in the provider.

Frontend behavior:

- preserves active match session in browser storage
- attempts route-based rejoin when returning to a match page
- shows reconnect countdowns for disconnected players
- pauses timed-mode countdown display when the backend reports paused state
- surfaces ended or unavailable rooms with a friendly fallback panel

When a finished or expired room is no longer joinable, the UI directs the player back to the lobby or history instead of leaving the screen in a broken waiting state.

## Environment Variables

Recommended production configuration:

```env
NEXT_PUBLIC_NAKAMA_URL=https://your-nakama-host
NEXT_PUBLIC_NAKAMA_SERVER_KEY=defaultkey
```

Supported split configuration:

```env
NEXT_PUBLIC_NAKAMA_HOST=your-host
NEXT_PUBLIC_NAKAMA_PORT=443
NEXT_PUBLIC_NAKAMA_USE_SSL=true
NEXT_PUBLIC_NAKAMA_SERVER_KEY=defaultkey
```

The frontend derives:

- host
- port
- HTTP protocol
- websocket SSL mode

from these values.

## Deployment

The frontend is intended to be deployed to Vercel as a separate project with `frontend/` as the root directory.

### Vercel setup

1. Import the repository into Vercel
2. Set project root to `frontend`
3. Configure environment variables:

```env
NEXT_PUBLIC_NAKAMA_URL=https://your-nakama-host
NEXT_PUBLIC_NAKAMA_SERVER_KEY=defaultkey
```

4. Deploy

### Build commands

Available scripts:

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run lint`

### Local development

Example local env:

```env
NEXT_PUBLIC_NAKAMA_HOST=127.0.0.1
NEXT_PUBLIC_NAKAMA_PORT=7350
NEXT_PUBLIC_NAKAMA_SERVER_KEY=defaultkey
NEXT_PUBLIC_NAKAMA_USE_SSL=false
```

Run locally:

```bash
npm install
npm run dev
```

## Summary

This frontend is intentionally thin:

- it authenticates and connects users
- it requests and joins matches
- it sends move intents
- it renders authoritative state

Game rules, fairness, and match outcomes are enforced by the backend runtime, while the frontend focuses on realtime presentation and player UX.
