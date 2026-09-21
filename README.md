# Relay

Relay is a multi-agent AI platform built as a modular TypeScript monorepo. It combines a Next.js frontend, a central API gateway, authentication services, and chat services to create a scalable foundation for AI-powered product experiences.

## Overview

This project is designed to evolve into a platform where users can interact with multiple AI-driven services through a unified, secure, and extensible architecture.

## Architecture

```text
Browser
  |
  v
web (Next.js)
  |
  v
gateway (Express)
  |   |   |
  |   |   +--> auth service
  |   |   +--> chat service
  |   +--> agent service (planned / future extension)
  |
  +--> Redis
  +--> authenticated user context
```

## Services

- `apps/web`: Next.js frontend
- `apps/gateway`: request routing, auth middleware, request proxying
- `apps/auth`: user and auth logic
- `apps/chat`: conversation and message APIs
- `packages/redis`: shared Redis helper package
- `packages/ui`: shared UI components

## Tech Stack

- TypeScript
- Bun
- TurboRepo
- Next.js
- Express.js
- MongoDB + Mongoose
- Redis
- Firebase Admin
- Docker Compose

## Current Features

- Protected gateway routing
- Header-based user propagation to downstream services
- Firebase-enabled auth service
- MongoDB-backed chat conversations
- Redis containerized local setup
- Shared monorepo package structure for future expansion

## Project Structure

```text
relay/
├── apps/
│   ├── auth/
│   ├── chat/
│   ├── gateway/
│   └── web/
├── packages/
│   ├── redis/
│   ├── ui/
│   ├── eslint-config/
│   └── typescript-config/
├── docker-compose.yml
├── package.json
├── turbo.json
├── tsconfig.json
├── README.md
└── index.ts
```

## Prerequisites

- Node.js 24+
- Bun
- Docker
- MongoDB access
- Firebase credentials for auth flow

## Getting Started

### Install dependencies

```bash
bun install
```

### Start Redis

```bash
docker compose up -d
```

### Run all apps in development mode

```bash
bun run dev
```

### Run a specific app

```bash
bun --cwd apps/web run dev
bun --cwd apps/auth run dev
bun --cwd apps/chat run dev
bun --cwd apps/gateway run dev
```

## Environment Variables

You will likely need local env values such as:

```env
PORT=4000
FRONTEND_URL=http://localhost:3000
AUTH_SERVICE_URL=http://localhost:4001
CHAT_SERVICE_URL=http://localhost:4002
AGENT_SERVICE_URL=http://localhost:4003
```

## Roadmap

The project is intended to support:

- multi-agent orchestration
- AI tool integration
- real-time chat and messaging
- role-based user access
- scalable service decomposition
- observability and monitoring
- background job processing

## Status

This repo is an early-stage multi-agent platform foundation. The scaffolding is in place, and the service-based architecture is ready for further feature development.

## License

This project currently does not include a license file. Add one if you plan to distribute or commercialize it.
