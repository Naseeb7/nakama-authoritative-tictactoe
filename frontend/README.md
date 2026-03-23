# Frontend

Next.js frontend for the Nakama authoritative Tic-Tac-Toe project.

## What It Covers

- guest authentication with Nakama device auth
- local session restore
- realtime socket connection
- matchmaking entry for `create_match` and `find_match`
- authoritative match room UI
- timed-mode countdown and reconnect UX
- leaderboard and player stats views

## Environment

Copy `.env.example` into `.env.local` and adjust values if your Nakama server is not running on the local defaults.

```env
NEXT_PUBLIC_NAKAMA_HOST=127.0.0.1
NEXT_PUBLIC_NAKAMA_PORT=7350
NEXT_PUBLIC_NAKAMA_SERVER_KEY=defaultkey
NEXT_PUBLIC_NAKAMA_USE_SSL=false
```

## Local Development

Install dependencies and start the app:

```bash
npm install
npm run dev
```

The frontend runs on `http://localhost:3000` by default.

## Available Scripts

- `npm run dev`: start the Next.js development server
- `npm run build`: create a production build
- `npm run start`: run the production server
- `npm run lint`: run ESLint

## Main Routes

- `/`: landing page and frontend foundation summary
- `/play`: matchmaking and mode selection
- `/match/[matchId]`: authoritative room UI for an active match
- `/leaderboard`: global wins leaderboard and player stats

## Backend Expectations

The frontend expects the Nakama backend to expose:

- `create_match` RPC
- `find_match` RPC
- authoritative match state updates on opcode `2`
- move submission on opcode `1`
- leaderboard id `global_wins`
- player stats storage in collection `player_stats`, key `stats`

## Notes

- Sessions are stored in browser local storage.
- The active match id is stored in session storage for route restore.
- The frontend assumes the backend is the source of truth for board state, turn order, timers, and match completion.
