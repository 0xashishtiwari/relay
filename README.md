<div align="center">

# Relay

**One chat. Every agent you need.**

> Relay is a multi-agent AI workspace: a single conversation that routes to specialized agents for reasoning, research, coding, document Q&A, image Q&A, image generation, and presentations — with credits, billing, and persistent history built in.

</div>

---

## Vision

AI work today is fragmented: one tab for chat, another for research, a separate tool for code, another for images, another for slide decks. Every switch drops context, and the user becomes the integration layer.

Relay's vision is the opposite — **the conversation is the workspace**:

- **Describe, don't operate.** The user states intent in natural language (and attaches files). Relay figures out which specialist should act — no model picker, no manual handoffs, no context switching.
- **Agents, not features.** Each capability (chat, search, coding, PDF Q&A, image Q&A, image generation, presentations) is an independent LangGraph node with its own model, tools, and credit cost. New capabilities plug in as new nodes.
- **Everything persists.** Conversations, messages, uploaded files, generated artifacts, credits, and plans all survive reloads — history is a source of truth, not a cache.
- **Usage has a price.** Credits meter every agent call and Razorpay billing tops them up, so the platform economics work from day one.
- **Boring reliability.** Standardized errors, per-user rate limits, idempotent payments, and a frontend that degrades gracefully (retry, offline tolerance, route-level error boundaries) — the unglamorous half of a product users trust.

---

## Preview

> Main workspace: Sidebar · Chat · Artifact panel. Landing page at `/`, auth at `/auth`, workspace at `/chat`. See `apps/web` for the implemented UI.

---

## Features

### Multi-Agent Routing

`apps/agent/graph/router.ts` — explicit `agent` selection is respected; with `auto`, an attached file routes deterministically (`pdf` → `pdfRag`, image → `imageRag`); otherwise an LLM router classifies the prompt into `chat | search | coding | pdf | ppt | imageGen`. Unknown output falls back to `chat`, and router model failures degrade to `chat` instead of erroring.

### Conversational AI

`agents/chat.agent.ts` — general reasoning, brainstorming, and writing (Groq). Returns a graceful fallback message on failure but rethrows credit errors so they surface as `402`.

### Search

`agents/search.agent.ts` — research via Tavily (`@langchain/tavily`), chained `search → chat` in `graph.ts` so results are synthesized into a final answer.

### Coding

`agents/coding.agent.ts` — generates runnable projects as `Artifact { id, type, files[] }`; preview/code views in `components/chat/Artifact.tsx`. Only the coding agent auto-opens the artifact panel.

### Image Generation

`agents/imageGen.agent.ts` — generates images persisted to Azure Blob Storage, surfaced inline in messages.

### PDF Q&A (`pdfRag`) and Image Q&A (`imageRag`)

Upload-first RAG agents over Gemini 2.5 Flash multimodal:

- Frontend `+` menu uploads PNG/JPEG/WebP/PDF (10 MB cap) via `POST /agent/upload` → Azure Blob → 24 h SAS URL.
- `agents/pdfRag.agent.ts` fetches the PDF bytes server-side and passes them inline (`{ type: "application/pdf", data }`); answers are grounded in the document with quoted excerpts.
- `agents/imageRag.agent.ts` passes the image as a base64 data URL (required by `@langchain/google-genai@2.3.2`) and echoes it on the assistant message.
- Attachments ride along on the persisted user message (images array / PDF download link) so history reloads render them.

### Presentations / Documents

`agents/ppt.agent.ts` and `agents/pdf.agent.ts` — generate `.pptx` / `.pdf` files, inline download cards, no artifact panel.

### Credits & Billing

- Every agent call deducts credits server-side (`deductCredits` → auth `/deductCredits`; costs: chat 1, imageRag 5, search 5, coding/pdf/ppt/imageGen/pdfRag 10). Insufficient credits propagate as `402` end to end, and the UI nudges an upgrade.
- Razorpay checkout in `components/BillingDrawer.tsx`: `createOrder` → hosted checkout → `verifyPayment` (HMAC `timingSafeEqual`, failed signatures persisted, idempotent replays, `502` with same-payload retry when credit sync fails so users are never double-charged).

### Conversation History

`apps/chat` persists `Conversation` and `Message` (Mongoose/MongoDB) with ownership checks on every operation and cascade delete. Frontend `store/conversation.store.ts` mirrors with `zustand/persist`.

### Authentication & Sessions

Google Sign-In via `firebase` (web) + `firebase-admin` (auth service). Auth verifies the `idToken`, creates/finds the `User`, and issues a 7-day httpOnly `session` cookie backed by Redis (`session:{id}`). Server-to-server payment/credit sync refreshes all of a user's sessions so `/me` never goes stale.

### Rate Limiting

Shared Redis fixed-window limiter in `packages/redis/src/rate-limit.ts` (atomic Lua `INCR`+`PEXPIRE`, `user → x-user-id → ip` buckets, `429 { code: "RATE_LIMITED" }` with `Retry-After`, fail-open on Redis outage). Enforced at the gateway (global 300/15 min, auth 30/15 min, agent 60/min) and per service (login 10/10 min, agent chat 30/min, billing 30/min, uploads 20/min, …).

### Error Handling

- Backend: per-service `AppError` + `asyncHandler` + `404` + global `errorHandler` middleware (`middleware/error.middleware.ts`) with one envelope `{ success: false, message, code, details? }`; Mongoose/Cast/dup-key/bad-JSON/413 mapped; startup env validated; `unhandledRejection`/`uncaughtException` logged.
- Agent service forwards `x-user-id` on all server-to-server chat calls; proxy 502s distinguish downstream-down from model timeouts (504).
- Frontend: `lib/errors.ts` (`ApiError`, `toApiError`, `getErrorMessage`) + axios interceptor normalization; route boundaries (`error.tsx`, `global-error.tsx`, `not-found.tsx`, per-segment errors) plus `ErrorBoundary`/`ErrorState`; failed sends roll back optimistically, restore drafts/attachments, and offer Retry.

---

## Architecture

Turborepo + Bun workspaces; Express microservices behind a gateway; Next.js frontend.

```text
relay/
├── apps/
│   ├── web/        # Next.js 16 frontend (landing, auth, chat workspace)
│   ├── gateway/    # Express gateway: auth guard, rate limits, reverse proxy
│   ├── auth/       # Express + Firebase Admin + Mongoose + Redis sessions + credits
│   ├── chat/       # Express + Mongoose (conversations/messages, ownership-checked)
│   ├── billing/    # Express + Razorpay orders/verification + Mongoose payments
│   └── agent/      # Express + LangGraph/LangChain + Azure Blob + RAG agents
├── packages/
│   ├── redis/              # shared Redis client + rate limiter
│   ├── ui/                 # shared @repo/ui components
│   ├── eslint-config/
│   └── typescript-config/
├── docker-compose.yml
├── turbo.json
├── package.json
└── README.md
```

### Request flow (chat + RAG)

```text
User → Web ChatArea sendMessage (+ optional file upload first)
  ↓ withCredentials, 180 s timeout for agent calls
Gateway /agent (protect → agentLimiter → proxy, 180 s upstream timeout)
  ↓ x-user-id header injected
Agent POST /agent/chat { conversationId, prompt, agent=auto, file? }
  ↓ persist user turn to chat service (with x-user-id)
  ↓ agentGraph.invoke({ prompt, agent, userId, fileUrl?, fileType? })
  ↓ router → chat|search|coding|pdf|ppt|imageGen|pdfRag|imageRag
  ↓ specialist agent → LLM / Tavily / Azure Blob (+ deductCredits)
  ↓ persist assistant turn (images/artifacts) → { response, images, artifacts }
  ↓ Gateway → Web → ReactMarkdown + thumbnails + download cards + artifact panel
```

Upload flow: `POST /agent/upload { fileName, mimeType, base64 }` → validate (type/size) → Azure Blob `uploads/<userId>/…` → 24 h SAS URL → returned to the composer, then attached to the next `/agent/chat` call.

Payment flow: `BillingDrawer` → `POST /billing/createOrder` → Razorpay checkout → `POST /billing/verifyPayment` (signature check → mark completed → `POST auth/updatePayment`) → store update. Sync failure returns `502 CREDIT_SYNC_FAILED`; the client retries the *same* verify payload idempotently.

### Agent graph

```text
START → router → chat | search → chat | coding | pdf | ppt | imageGen | pdfRag | imageRag → END
```

`graph/state.ts` holds `{ prompt, aiResponse, agent, conversationId, userId, searchResults, searchAnswer, images, artifacts, fileUrl?, fileType?, fileName?, mimeType? }`. Compiled with `@langchain/langgraph`.

### Web (`apps/web`)

Next.js 16 + React 19, Tailwind 4.3, Zustand (+persist `relay-user` / `relay-conversations`), Framer Motion, `react-markdown`, `sonner`. Routes: `/` (landing), `/auth` (Google sign-in), `/chat` (Sidebar + ChatArea + Artifact). Data layer in `lib/` (`axios` with `ApiError` normalization, `auth`, `conversation` incl. uploads, `billing`, `errors`), UI copy in `types/` + `store/`.

### Gateway (`apps/gateway`)

Express. `trust proxy`, 15 MB JSON limit (base64 uploads), `cors({ origin: FRONTEND_URL, credentials: true })`, global/auth/agent rate limiters. Proxies `/auth` (30 s), `/chat`, `/agent` (180 s, `x-user-id` injection, 502/504 distinction), `/billing`; `GET /me` returns the Redis session user. Env-validated boot, 404 + error middleware.

### Auth Service (`apps/auth`)

`POST /login` (IP rate-limited, Firebase error mapping) → `Set-Cookie session`; `GET /logout`; `DELETE /account` (Mongo + sessions + Firebase user); server-to-server `POST /updatePayment` and `POST /deductCredits` (body-`userId`-keyed rate limits, plan/credit validation). Awaits Mongo before listening.

### Chat Service (`apps/chat`)

`POST /chat/conversation`, `GET /chat/conversations` (200, capped), `PUT/DELETE /chat/conversation` (ownership-checked, cascade message delete), `POST /chat/message` (role/content validation), `GET /chat/messages` (ownership-checked, capped). Invalid ObjectIds are `400`, never `500`.

### Billing Service (`apps/billing`)

`POST /createOrder` (plan validation, free plan rejected, Razorpay failure → 502) and `POST /verifyPayment` as described above. Boot-validates Razorpay keys and `AUTH_SERVICE_URL`.

### Agent Service (`apps/agent`)

Described above, plus `POST /upload` (20/min, `x-user-id` required). Memory (`config/memory.ts`) is Redis-backed with corrupt-entry tolerance; per-agent credit errors propagate as `402`.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16.3.4, React 19.2, TypeScript 7 |
| Styling | Tailwind CSS 4.3.3, `@tailwindcss/postcss` 4.3.3 |
| UI/Motion/State | `@repo/ui`, `framer-motion` 13.4.3, `zustand` 5.0.15 + `persist`, `sonner` 2.0.8 |
| Markdown | `react-markdown` 10.1.0, `remark-gfm` 4.0.1 |
| Backend | Node.js ≥24, Express 5.2.1 |
| Auth | `firebase` 12.19.0 (web), `firebase-admin` 14.4.0 (auth service) |
| Orchestration | `@langchain/core` 1.2.x, `@langchain/langgraph` 1.4.x, `@langchain/google-genai` 2.3.2, `@langchain/groq`, `@langchain/openrouter`, `@langchain/tavily` |
| Payments | `razorpay` 2.9.8 |
| Storage | `@azure/storage-blob` 12.33.0 |
| Database | Mongoose 9.10.x, MongoDB |
| Sessions/Rate limits | Redis via `@repo/redis` (`ioredis`), `redis://localhost:6380` |
| Monorepo | Turborepo 2.11.2, Bun 1.4.2 workspaces `apps/*, packages/*` |
| Tooling | `prettier` 3.9.6, `eslint` 10.9.1 |

---

## Getting Started

Prerequisites: Git, Node ≥24, Bun 1.4.2, Docker, MongoDB, Firebase project, Redis, Azure Storage account, Razorpay keys.

```bash
git clone https://github.com/0xashishtiwari/relay.git
cd relay
bun install
docker compose up -d
```

---

## Environment Variables

Copy `.env.example` to `.env` at repo root (each service also reads its own `apps/*/.env`, which override per-service values such as `PORT`). No secrets are committed.

```env
# Shared
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Gateway
PORT=4000
AUTH_SERVICE_URL=http://localhost:4001
CHAT_SERVICE_URL=http://localhost:4002
AGENT_SERVICE_URL=http://localhost:4003
BILLING_SERVICE_URL=http://localhost:4004

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
CHAT_SERVICE_URL=http://localhost:4002
AUTH_SERVICE_URL=http://localhost:4001
AZURE_STORAGE_CONNECTION_STRING=
AZURE_STORAGE_CONTAINER_NAME=

# Billing
BILLING_PORT=4004
MONGODB_URI=mongodb://localhost:27017/relay
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
AUTH_SERVICE_URL=http://localhost:4001

# Redis
REDIS_URL=redis://localhost:6380

# Frontend (Next.js)
NEXT_PUBLIC_SERVER_URL=http://localhost:4000
NEXT_PUBLIC_RAZORPAY_KEY_ID=
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

Or per-app (ports come from each app's `.env`):

```bash
bun --cwd apps/web run dev        # http://localhost:3000
bun --cwd apps/gateway run dev    # gateway
bun --cwd apps/auth run dev       # auth service
bun --cwd apps/chat run dev       # chat service
bun --cwd apps/agent run dev      # agent service
bun --cwd apps/billing run dev    # billing service
```

Other scripts: `bun run build`, `bun run lint`, `bun run check-types`, `bun --cwd apps/web run check-types`.

---

## Authentication Flow

```text
Google
  ↓
Firebase (web) signInWithPopup → idToken (+ profile backfill)
  ↓
POST /auth/login { token, name, avatar } → verifyIdToken → Redis SETEX session:xxx 7d → Set-Cookie session
  ↓
Gateway GET /me (protect) → Redis GET → req.user → { user }
  ↓
Web Zustand relay-user (persist) + chat hydrate; 401 → null → /auth
  ↓
Logout GET /auth/logout → Redis DEL + clearCookie; account deletion purges Mongo + sessions + Firebase user
```

---

## Development

```bash
bun run lint          # turbo lint
bun run check-types   # turbo check-types + next typegen
bun run build         # turbo build
bun run format        # prettier --write "**/*.{ts,tsx,md}"
```

Conventions: minimal borders over shadows, `framer-motion` 150–250 ms, `zustand/persist` for `relay-user`/`relay-conversations`, one error envelope `{ success: false, message, code, details? }`, per-user Redis rate limits on money/LLM/upload routes.

---

## Adding a New Agent

1. Create `apps/agent/agents/<name>.agent.ts`. On failure return a friendly `aiResponse` fallback — but **rethrow credit errors** so the controller can map them to `402`.
2. Add the `AgentName` variant in `graph/router.ts` (`validAgents`), `graph/graph.ts` (node + conditional edge + `END` edge), `config/llmModels.ts`, and `controllers/agent.controller.ts` (`VALID_AGENTS`).
3. Add its credit cost in `apps/auth/controllers/auth.controller.ts` (`COST`) and deduct via `deductCredits(userId, "<name>")`.
4. If it consumes uploads, accept `fileUrl/fileType/fileName/mimeType` from state (wired from the controller's `file` body).
5. Frontend: extend `AgentName` in `apps/web/lib/conversation.ts`; add picker labels in `chatArea.tsx` only if manual selection is desired (`auto` + router covers the rest).

---

## Security

- Secrets via environment variables; never commit `serviceAccountkey.json` or `.env`
- Firebase ID token verification server-side (`firebase-admin`)
- httpOnly, `secure=production`, `sameSite=strict` cookies, `maxAge 7d`
- Gateway `protect` validates Redis session for `/me`, `/chat`, `/agent`, `/billing`
- Corrupt sessions → `401` (never `500`); Redis outage → `503`
- CORS restricted to `FRONTEND_URL` with `credentials: true`
- Per-user/IP Redis rate limits; login brute-force shield (10/10 min)
- Razorpay HMAC verified with `timingSafeEqual`; failed signatures persisted; verify is idempotent
- Uploads restricted to PNG/JPEG/WebP/PDF ≤ 10 MB; 24 h expiring SAS URLs

> Never commit secrets or service-account credentials.

---

## Roadmap

- Streaming agent responses (SSE) instead of request/response
- Server-to-server auth (shared internal secret) for payment/credit routes
- More specialized agents and richer tool execution
- Multi-step planning / orchestration with tracing
- Additional artifact types and export
- Real-time collaboration

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
