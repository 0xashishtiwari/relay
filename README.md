<div align="center">

# Relay

**A multi-agent AI orchestration platform built around a single conversation.**

> Relay lets users interact with specialized AI agents for conversation, research, coding, image generation, and presentations through one unified interface.

</div>

<!-- Add product screenshots or a demo GIF here -->

---

## Preview

<!-- Add product screenshots or a demo GIF here -->
> Main workspace: Sidebar · Chat · Artifact panel. See `apps/web` for the implemented UI.

---

## Why Relay?

Modern AI workflows force context switching:

- One tool for chat
- Another for web research
- Another for coding
- Another for image generation
- Another for presentations

Relay collapses these behind one conversational interface. The user describes the task in natural language — Relay determines which specialized agent should handle it and keeps the thread and artifacts together.

---

## Core Concept

```text
User
  │
  ▼
Relay
  │
  ├── Chat Agent
  ├── Search Agent
  ├── Coding Agent
  ├── Image Agent
  └── Presentation Agent
```

One conversation routes to the right capability via an orchestration layer. No model picker, no manual handoff.

```text
One conversation → multiple specialized agents
```

---

## Features

Implemented in this repository:

### Multi-Agent Routing
`apps/agent/graph/router.ts` classifies `prompt` → `chat | search | coding | imageGen | ppt | pdf` (or respects explicit `agent` selection). Invalid → `chat`.

### Conversational AI
`agents/chat.agent.ts` — general reasoning, brainstorming, and writing.

### Search
`agents/search.agent.ts` — research via Tavily (`@langchain/tavily`), synthesized into the chat response. Search result is chained to `chat` (`graph.ts: search → chat`).

### Coding
`agents/coding.agent.ts` — generates code artifacts; preview/code view in `components/chat/Artifact.tsx`.

### Image Generation
`agents/imageGen.agent.ts` — generates images persisted to Azure Blob Storage (`config/storage/*` via `@azure/storage-blob`), surfaced inline in messages.

### Presentations / Documents
`agents/ppt.agent.ts` and `agents/pdf.agent.ts` — produce `ppt`/`pdf` artifacts (e.g., `AI-Trends.pptx`).

### Artifacts
Every agent can return `Artifact { id, type, title, files: {name, content}[] }`. UI shows: `LandingPage.tsx`, `AI-Trends.pptx`, `research.md`, `generated-images/*`. Features: file tabs, Preview/Code toggle, live `iframe` for `index.html`, copy/download.

### Conversation History
`apps/chat` persists `Conversation` and `Message` via Mongoose/MongoDB. Frontend `store/conversation.store.ts` persists `conversations` and `selectedConversation` with `zustand/persist` (`relay-conversations`).

### Authentication
Google Sign-In via `firebase` (web) + `firebase-admin` (auth service). Auth service verifies `idToken`, creates/finds `User`, issues 7-day `session` cookie.

### Session Management
Gateway `middleware/auth.middleware.ts` validates `session` cookie against Redis (`session:{id}` → `userId/name/email/avatar`). Used by `/me`, `/chat/*`, `/agent/*`.

---

## Architecture

Monorepo with Turborepo + Bun workspaces, service-oriented apps proxied through a gateway.

```text
relay/
├── apps/
│   ├── web/        # Next.js 16 frontend
│   ├── gateway/    # Express gateway + auth middleware + proxy
│   ├── auth/       # Express + Firebase Admin + Mongoose + Redis session
│   ├── chat/       # Express + Mongoose (conversations/messages)
│   └── agent/      # Express + LangGraph/LangChain + storage
├── packages/
│   ├── redis/              # shared Redis client
│   ├── ui/                 # shared @repo/ui components
│   ├── eslint-config/
│   └── typescript-config/
├── docker-compose.yml
├── turbo.json
├── package.json
└── README.md
```

### Web (`apps/web`)
Next.js 16 + React 19, Tailwind 4.3, Zustand, `zustand/persist`, Framer Motion, `react-markdown`, `sonner`. Responsible for auth UI (`app/auth`), workspace (`app/chat` + `components/chat/*`), theme, artifact panel, routing to gateway via `NEXT_PUBLIC_SERVER_URL`.

### Gateway (`apps/gateway`)
Express. `cors({ origin: FRONTEND_URL, credentials: true })`, `cookie-parser`, `morgan`. Proxies:
- `/auth` → `AUTH_SERVICE_URL`
- `/chat` (protected) → `CHAT_SERVICE_URL` via `proxyWithHeader` (forwards user context)
- `/agent` (protected) → `AGENT_SERVICE_URL`
- `GET /me` (protected) → returns Redis session user

### Auth Service (`apps/auth`)
Express + `firebase-admin/auth` `verifyIdToken`, Mongoose `User { firebaseUID, email, name, avatar }`, Redis `SETEX session:{id} 7d`. `POST /login` → `Set-Cookie session` (`httpOnly, secure=production, sameSite=strict, maxAge 7d`), `GET /logout` → `DEL` + `clearCookie`.

### Chat Service (`apps/chat`)
Express + Mongoose. `POST /chat/conversation`, `GET /chat/conversations`, `GET /chat/messages?conversationId`, `POST /chat/message`. Used by web and by agent service (`getMessages.ts` fetching via `CHAT_SERVICE_URL`).

### Agent Service (`apps/agent`)
Express + LangGraph `StateGraph`. Flow: `START → router → (chat|search|coding|pdf|ppt|imageGen) → END` with `search → chat` edge. Models via `config/llmModels.ts` (`@langchain/google-genai`, `@langchain/groq`, `@langchain/openrouter`), Tavily for search, `@azure/storage-blob` for image persistence, `mongoose` for optional persistence, `config/memory.ts` for conversation memory.

---

## Agent Architecture

```text
                    ┌──────────────┐
                    │     User     │
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │    Relay     │
                    │   Router     │
                    │ router.ts    │
                    └──────┬───────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
       Search            Coding            Chat
       search.agent      coding.agent      chat.agent
          │                │                │
          │          ┌─────┴─────┐          │
          │          ▼           ▼          │
          │        PDF          PPT      ImageGen
          │     pdf.agent   ppt.agent  imageGen.agent
          │          │           │          │
          └──────────┼───────────┼──────────┘
                     ▼
              Final Response + Artifacts
```

`graph/state.ts` holds `{ prompt, agent, messages, artifacts }`. `router` (`graph/router.ts`) respects explicit `agent !== "auto"` else calls LLM `router` model with `routerSystemPrompt` to return `AgentName`. `graph.ts` compiles with `@langchain/langgraph`.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16.3.4, React 19.2, TypeScript 7 |
| Styling | Tailwind CSS 4.3.3, `@tailwindcss/postcss` 4.3.3 |
| UI | `@repo/ui` (shadcn/ui pattern), `sonner` 2.0.8 |
| Motion | `framer-motion` 13.4.3 |
| State | `zustand` 5.0.15 + `persist` |
| Markdown | `react-markdown` 10.1.0, `remark-gfm` 4.0.1 |
| Backend | Node.js ≥24, Express 5.2.1 |
| Auth | `firebase` 12.19.0 (web), `firebase-admin` 14.4.0 (auth service) |
| Orchestration | `@langchain/core` 1.2.x, `@langchain/langgraph` 1.4.x, `@langchain/google-genai`, `@langchain/groq`, `@langchain/openrouter`, `@langchain/tavily` |
| Storage | `@azure/storage-blob` 12.33.0 |
| Database | Mongoose 9.10.x, MongoDB |
| Session | Redis (`@repo/redis`, `redis://localhost:6380`) |
| Monorepo | Turborepo 2.11.2, Bun 1.4.2 workspaces `apps/*, packages/*` |
| Tooling | `prettier` 3.9.6, `eslint` 10.9.1 |

---

## Project Structure

```text
relay/
├── apps/
│   ├── web/
│   │   ├── app/
│   │   │   ├── page.tsx          # landing
│   │   │   ├── auth/page.tsx     # Google auth
│   │   │   ├── chat/page.tsx     # workspace (Sidebar + ChatArea + Artifact)
│   │   │   ├── layout.tsx
│   │   │   └── globals.css
│   │   ├── components/chat/
│   │   │   ├── sidebar.tsx
│   │   │   ├── chatArea.tsx
│   │   │   └── Artifact.tsx
│   │   ├── lib/
│   │   │   ├── axios.ts          # baseURL NEXT_PUBLIC_SERVER_URL, withCredentials
│   │   │   ├── auth.ts           # getCurrentUser / logout
│   │   │   ├── conversation.ts   # create/get/send
│   │   │   └── firebase.ts
│   │   ├── store/
│   │   │   ├── user.store.ts
│   │   │   └── conversation.store.ts
│   │   └── package.json
│   ├── gateway/
│   │   ├── src/index.ts          # cors + cookieParser + proxy /auth /chat /agent /me
│   │   ├── middleware/auth.middleware.ts
│   │   ├── controllers/user.controller.ts
│   │   └── utils/proxyWithHeader.ts
│   ├── auth/
│   │   ├── src/index.ts
│   │   ├── controllers/auth.controller.ts  # login/logout + Redis session
│   │   ├── routes/auth.route.ts
│   │   ├── models/user.model.ts
│   │   └── config/database.ts
│   ├── chat/
│   │   ├── src/index.ts
│   │   ├── routes/chat.routes.ts
│   │   ├── controllers/chat.controller.ts
│   │   └── models/{conversation,message}.ts
│   └── agent/
│       ├── src/index.ts
│       ├── graph/{state,router,graph}.ts
│       ├── agents/{chat,search,coding,ppt,pdf,imageGen,specialist}.ts
│       ├── prompts/{router,chat}.prompt.ts
│       ├── config/{llmModels,memory,tavily,database}
│       └── config/storage/{upload,download,delete,storage}
├── packages/
│   ├── redis/
│   ├── ui/
│   ├── eslint-config/
│   └── typescript-config/
├── docker-compose.yml  # redis 7-alpine 6380:6379
├── turbo.json
├── package.json
└── tsconfig.json
```

---

## Getting Started

Prerequisites: Git, Node ≥24, Bun 1.4.2, Docker, MongoDB, Firebase project, Redis.

```bash
git clone https://github.com/0xashishtiwari/relay.git
cd relay
bun install
docker compose up -d
```

---

## Environment Variables

Copy `.env.example` to `.env` at repo root. No secrets are committed.

```env
# Shared
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Gateway
PORT=4000
AUTH_SERVICE_URL=http://localhost:4001
CHAT_SERVICE_URL=http://localhost:4002
AGENT_SERVICE_URL=http://localhost:4003

# Auth
AUTH_PORT=4001
MONGODB_URI=mongodb://localhost:27017/relay
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_APPLICATION_CREDENTIALS=./apps/auth/serviceAccountkey.json

# Chat
CHAT_PORT=4002
CHAT_MONGODB_URI=mongodb://localhost:27017/relay

# Agent
AGENT_PORT=4003

# Redis
REDIS_URL=redis://localhost:6380

# Frontend
NEXT_PUBLIC_SERVER_URL=http://localhost:4000
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
```

Never commit `apps/auth/serviceAccountkey.json` (ignored via `.gitignore`).

---

## Running the Project

Single command (Turborepo, no cache for `dev`):

```bash
bun run dev
```

Or per-app:

```bash
bun --cwd apps/web run dev        # http://localhost:3000
bun --cwd apps/gateway run dev    # http://localhost:4000
bun --cwd apps/auth run dev       # http://localhost:4001
bun --cwd apps/chat run dev       # http://localhost:4002
bun --cwd apps/agent run dev      # http://localhost:4003
```

Other scripts: `bun run build`, `bun run lint`, `bun run check-types`, `bun --cwd apps/web run check-types`.

---

## Authentication Flow

```text
Google
  ↓
Firebase (web) signInWithPopup → idToken
  ↓
POST /auth/login { token } → Auth service verifyIdToken → Redis SETEX session:xxx 7d → Set-Cookie session strict httpOnly
  ↓
Gateway GET /me (protect) → Redis GET → req.user → { user }
  ↓
Web Zustand relay-user (persist) + Sidebar/Chat hydrate
  ↓
Logout GET /auth/logout → Redis DEL + clearCookie
```

Cookies are forwarded with `withCredentials: true` (`apps/web/lib/axios.ts`) and `cors { credentials: true }` (`apps/gateway/src/index.ts`). Sessions are httpOnly, strict, 7-day.

---

## Request Flow

```text
User → Web (Next.js, ChatArea sendMessage)
  ↓ withCredentials
Gateway /agent (protect)
  ↓ proxy
Agent POST /agent/chat { conversationId, prompt, agent=auto }
  ↓ getMessages(CHAT_SERVICE_URL)
  ↓ router → chat|search|coding|ppt|pdf|imageGen
  ↓ specialist agent (LangChain) → LLM / Tavily / Azure Blob / Mongoose
  ↓ response { response, images, artifacts } + addMessageToMemory
  ↓ saveMessage(CHAT_SERVICE_URL)
  ↓ Gateway → Web → ReactMarkdown + Artifact + generated-images
```

Chat history: `GET /chat/messages?conversationId` (gateway → chat service, protected).

---

## Artifacts

Generated per conversation, surfaced in the right panel (`Artifact.tsx`):

- `Research.md`, `LandingPage.tsx`, `AI-Trends.pptx`, `cover.png`, `generated-images/*.png`
- Tabs `All / Code / Images / Files / Presentations` (derived from `artifact.type`/`files`)
- Preview for `index.html` (injects `*.css`/`*.js` into `srcDoc` iframe), Code view with copy/download
- List shows `name · type · files · timestamp`

Storage: images via `config/storage/upload.ts` → Azure Blob (`@azure/storage-blob`); reinitialized on agent start (`initializeStorage`).

---

## Development

```bash
bun run lint          # turbo lint
bun run check-types   # turbo check-types + next typegen
bun run build         # turbo build
bun run format        # prettier --write "**/*.{ts,tsx,md}"
```

Conventions: keep `Geist` typography, minimal borders over shadows, `framer-motion` 150–250 ms, `zustand/persist` for `relay-user`/`relay-conversations`.

---

## Adding a New Agent

1. Create `apps/agent/agents/<name>.agent.ts` with LangChain prompt + tools.
2. Add `AgentName` variant in `graph/router.ts` (`validAgents`) and `prompts/router.prompt.ts`.
3. Register node in `graph/graph.ts` (`addNode` + `addConditionalEdges` + `addEdge` to `END`).
4. Define `type` and `files` shape for artifacts if the agent produces them.
5. Optionally handle storage in `config/storage` and memory in `config/memory.ts`.
6. Frontend: extend `AgentName` in `apps/web/lib/conversation.ts` and agent selector in `chatArea.tsx` if manual selection desired (default `auto` delegates to router).

---

## Roadmap

Planned / future work — not yet implemented as shipped features:

- More specialized agents and richer tool execution
- Improved planning / multi-step orchestration
- Persistent agent memory across conversations
- Additional artifact types and export
- Streaming improvements and observability / tracing
- Real-time collaboration

---

## Security

- Secrets via environment variables; never commit `serviceAccountkey.json` or `.env`
- Firebase ID token verification server-side (`firebase-admin`)
- httpOnly, `secure=production`, `sameSite=strict` cookies, `maxAge 7d`
- Gateway `protect` validates Redis session for `/me`, `/chat`, `/agent`
- CORS restricted to `FRONTEND_URL` with `credentials: true`
- Redis session invalidation on logout

> Never commit secrets or service-account credentials.

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/<name>`)
3. Make changes, run `bun run lint` and `bun run check-types`
4. Open a pull request

---

## License

License has not been specified yet.

---

> Relay is an experiment in building a unified interface for multiple AI agents.

**Built with TypeScript, modern web technologies, and AI orchestration.**
