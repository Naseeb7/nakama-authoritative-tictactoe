# Architecture

## Server-authoritative architecture

The backend is designed around Nakama authoritative matches, where the server owns the game state and validates every move. Clients send intents instead of direct state mutations, and the runtime module decides whether each action is valid before updating the match.

This model prevents client-side cheating, keeps turn order deterministic, and ensures the canonical board state always lives on the server.

## Match lifecycle overview

Each match progresses through a predictable lifecycle:

1. Match creation initializes an empty Tic-Tac-Toe board and runtime state.
2. Players join and are assigned identities, turn order, and marks.
3. The active match loop processes move messages in real time.
4. The server validates moves, applies state changes, and checks for win or draw conditions.
5. The match ends when a player disconnects irrecoverably, wins, or the board is exhausted.

This lifecycle keeps game progression centralized and makes session recovery, observability, and rule enforcement easier to manage.

## Real-time state synchronization flow

State synchronization is event-driven through Nakama's real-time socket layer:

1. Clients join an authoritative match channel.
2. Clients send gameplay actions such as tile selection.
3. The runtime module validates and applies the action.
4. The server broadcasts the updated authoritative state to all match participants.

Because all clients consume the same server-generated state updates, the frontend can remain thin and reactive while the backend handles consistency.

## Matchmaking system design

The matchmaking layer is intended to pair two compatible players and route them into a dedicated authoritative match instance. Nakama's built-in matchmaker or a custom orchestrated flow can be used depending on product needs.

The matchmaking system should eventually support:

- two-player queueing
- skill or rank-based pairing
- private room or invite flows
- region-aware placement if latency becomes important

This keeps player discovery separate from gameplay execution while preserving a clean server-authoritative boundary.
