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
