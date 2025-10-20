# SynapseX Fusion Lab — Technical Flow Guide

This document explains how each feature works end-to-end, what technologies power it, the data flow between client/server/AI, and where to look in the codebase.


## Tech stack at a glance

- Runtime: Node.js + TypeScript
- Server: Express.js (`server/index.ts`, `server/routes.ts`)
- Realtime: WebSocket via `ws` (`/ws` path)
- AI: Google Gemini 2.5 Flash via `@google/genai` (`server/gemini.ts`)
- Parsing: `pdf-parse` (PDF → text), basic HTML → text
- External search APIs: ArXiv (XML via `fast-xml-parser`), Semantic Scholar (REST)
- Storage selection (`server/storage.ts`):
  - DatabaseStorage (Postgres + Drizzle ORM) when `DATABASE_URL` is set
  - SqliteStorage (embedded SQLite via `sql.js`) default fallback
  - MemoryStorage ultimate fallback for dev
- Client: React + Vite + Tailwind + shadcn/ui + Radix + TanStack Query + Wouter
- Shared types/schema: `shared/schema.ts` (Drizzle schema + TS types)

Environment:
- GEMINI_API_KEY (required for AI features)
- DATABASE_URL (optional; enables Postgres/Drizzle storage)
- SESSION_SECRET (optional; sessions; generated if absent)
- PORT (default 5000)


## Global request flow

1) Client UI calls `client/src/lib/api.ts` helper functions
2) HTTP REST → Express route in `server/routes.ts`
3) Validation/context building → Storage operations (`server/storage.*`)
4) Optional: AI request via `server/gemini.ts`
5) Optional: WebSocket broadcast to interested workspace clients
6) JSON response back to client; TanStack Query updates UI

WebSocket path: `ws://<host>/ws`
- Clients send `{ type: 'join_workspace', workspaceId }` to subscribe
- Server broadcasts events scoped by workspace


## Authentication + activity logging

Files: `server/auth.ts`, `server/sqlite.ts`
- Sessions: `express-session` + `memorystore` (cookie-based)
- Users/actions tables live in the embedded SQLite (`.data/app.sqlite` via `sql.js`)
- Endpoints:
  - POST `/api/auth/register`, `/api/auth/login`, `/api/auth/logout`
  - GET `/api/auth/me`
- Middleware: `actionLogger()` logs all non-auth `/api/*` calls into `user_actions`

Technologies: express-session, memorystore, sql.js


## Feature flows

### 1) Multi‑Agent Lab (ping agents + assign tasks)

UI: `client/src/pages/multi-agent-lab.tsx`
APIs: POST `/api/agents/ask`, POST `/api/tasks`, GET `/api/tasks/*`
Realtime: WebSocket events `task_queued|started|completed|failed`, `agent_log` (client-originated)

Flow (Ping Agent):
- UI → `askAgent({ role, query })`
- Route `/api/agents/ask` → `queryAgent(role, query, context?)` → Gemini
- Result saved as `agent_logs`
- Response returns `{ agent, response }` to UI; UI may broadcast a local `agent_log` over WS for terminal display

Flow (Assign Task):
- UI → POST `/api/tasks` with `{ title, description, agentType, priority, workspaceId, ... }`
- Storage creates task with status `pending`
- Task queued: `queueManager.addToQueue()` broadcasts `task_queued`
- Processor builds context: optional paper snippet + `buildWorkspacePapersContext()`
- `queryAgent()` → Gemini result
- Storage updates: status `completed|failed`, result text
- Broadcast `task_started` → `task_completed|task_failed`
- Also persists a workspace `message` with the result

Key files: `server/routes.ts`, `server/task-queue.ts`, `server/gemini.ts`, `server/context.ts`

Technologies: Express, ws, @google/genai, sql.js/Drizzle


### 2) Paper search (local + ArXiv + Semantic Scholar)

UI: `client/src/pages/paper-explorer.tsx` (and shared components)
APIs: GET `/api/papers/search?q=...&sortBy=...&sortOrder=...` and GET `/api/papers/arxiv/:id`

Flow:
- Local search: `storage.searchPapers(q)` against stored uploads
- ArXiv: `server/arxiv.ts` builds query; fetches Atom XML; parses via `fast-xml-parser`
- Semantic Scholar: `server/semantic-scholar.ts` REST fetch; maps to normalized shape
- Results merged, deduplicated by `(source, sourceId, normalizedTitle)` and scored
- Sort options: latest-first (date) or basic relevance heuristic (token overlap)
- Return combined list to client

Technologies: fetch, fast-xml-parser, custom scoring/dedupe


### 3) Paper ingestion (URL or PDF upload) + auto analysis

UI: Pages like Paper Explorer, Workspace
APIs:
- POST `/api/papers/ingest-url` with `{ url, workspaceId, title? }`
- POST `/api/papers/upload-file` (multipart, field `file`)
- POST `/api/papers/upload` (metadata-only)

Flow (URL):
- Server fetches bytes
- If PDF → `pdf-parse` to text; else HTML → `htmlToText()`
- `splitIntoSections()` for rough headings (abstract/introduction/...)
- `storage.createPaper()` persists metadata + content + sections
- Broadcast `paper_added` to workspace via WS
- Optional AI: `analyzeDocument(content)` saves `agent_logs`

Flow (PDF upload): identical text extraction, creation, broadcast, analysis

Technologies: pdf-parse, simple HTML cleaner, ws broadcast


### 4) Chat with Paper

UI: `client/src/pages/chat-with-paper.tsx`, components `chat-message.tsx`
APIs: POST `/api/chat/paper`, GET `/api/messages/paper/:paperId`

Flow:
- UI posts `{ paperId, question, agentType? }`
- Route loads paper, builds context (title + abstract + full content excerpt)
- `queryAgent({ role: agentType || 'reasoning', query, context })`
- Saves chat transcript as two messages: user question and agent answer
- Returns `{ answer, agentMessage }`

Technologies: @google/genai, storage messages, React chat UI


### 5) Related Research + Lightweight Graph

UI: `client/src/pages/related-research.tsx`
API: POST `/api/research/related` with `{ topic, max? }`

Flow:
- Collect candidates from: local storage, ArXiv, Semantic Scholar (parallel)
- De‑duplicate by normalized title
- Build keyword sets from title+abstract, compute Jaccard overlap for each pair
- Create nodes/edges from overlap; call `queryAgent('retrieval')` to summarize connections (fallback to heuristic text on failure)
- Return `{ relatedInfo, graph: { nodes, edges } }`

Technologies: custom text tokenization/overlap, @google/genai


### 6) AI Paper Generator

UI: `client/src/pages/paper-generator.tsx`
API: POST `/api/paper/generate` with `{ topic, workspaceId?, format? }`

Flow:
- Server builds a prompt template per `format` (generic, ieee, acm, neurips, arxiv, nature)
- `queryAgent('nlp')` generates Markdown content
- `storage.createDocument()` persists a `generated_document`
- WS broadcast `document_generated` to workspace
- GET `/api/documents/workspace/:workspaceId` lists generated docs

Technologies: @google/genai, storage generated_documents, WS broadcast


### 7) Knowledge Graph (manual + auto‑generate)

UI: `client/src/pages/knowledge-graph.tsx`
APIs:
- Manual CRUD: GET `/api/graph/nodes/:workspaceId`, GET `/api/graph/edges/:workspaceId`, POST `/api/graph/nodes`, POST `/api/graph/edges`
- Auto generate: POST `/api/graph/generate/:workspaceId`

Flow (Auto):
- Load workspace artifacts: papers, messages, tasks
- Seed existing nodes/edges to avoid duplicates
- Create nodes: papers (title/metadata), agents (from messages/tasks), concepts (basic keyword extraction from titles)
- Create edges: paper↔concept (mentions), agent↔paper (discussed/assigned), paper↔paper (title overlap as proxy for relation)
- Return consolidated `{ nodes, edges }`

Technologies: storage aggregation, simple NLP, deterministic graph building


### 8) Team Workspace Chat

UI: `client/src/pages/team-workspace.tsx`
APIs:
- GET `/api/workspace/messages/:workspaceId`
- POST `/api/workspace/messages` (human/agent messages persisted)
- POST `/api/workspace/messages/agent` for LLM‑assisted replies

Flow (Agent reply):
- Build `combinedContext = providedContext + buildWorkspacePapersContext(workspaceId)`
- `queryAgent({ role: agentType, query, context: combinedContext })`
- Save user message and agent message
- WS broadcast `agent_message` to workspace subscribers

Technologies: @google/genai, WS broadcast, storage messages


### 9) Canvas documents (collaborative notes)

UI: `client/src/pages/team-workspace.tsx` or a dedicated canvas view
APIs:
- POST `/api/canvas` (create)
- GET `/api/canvas/workspace/:workspaceId`
- GET `/api/canvas/:id`
- PATCH `/api/canvas/:id` (update content)

Flow:
- Create and list canvases by workspace
- Update emits WS `canvas_updated` with summary (id/title/lastEditedBy/updatedAt)

Technologies: storage canvas_documents, WS broadcast


### 10) Workspace members

APIs:
- POST `/api/workspace/members` (add)
- GET `/api/workspace/members/:workspaceId` (list)
- PATCH `/api/workspace/members/:workspaceId/:userId/status` (presence)

Flow:
- Add/list/update members; presence updates broadcast `member_joined` / `member_status_changed`

Technologies: storage workspace_members, WS broadcast


### 11) Health checks

- GET `/api/health` → `{ status: 'ok' }`
- GET `/api/health/ai` → `{ status: 'ok' | 'missing_key' }` based on GEMINI_API_KEY


## Data model (summary)

Source of truth: `shared/schema.ts` (Drizzle) and `server/sqlite.ts` (sql.js DDL)
- users, user_actions
- workspaces
- papers (metadata, content, sections JSON)
- agent_logs
- messages (chat + task results)
- generated_documents
- knowledge_nodes, knowledge_edges
- tasks
- workspace_members
- canvas_documents

Sqlite implementation: `server/storage.sqlite.ts`
- Maps SQL rows ↔ TS types (parse JSON fields, timestamps)
- Provides methods used by routes: create/get/list for each entity

Storage routing: `server/storage.ts`
- Uses Postgres/Drizzle when `DATABASE_URL` is provided (see `server/storage.db.ts`)
- Otherwise uses embedded SQLite via `sql.js`
- If `sql.js` import fails, fallback to in‑memory


## AI service (`server/gemini.ts`)

- Guards against missing GEMINI_API_KEY
- Defines agent system prompts: `nlp`, `reasoning`, `data`, `cv`, `critic`, `retrieval`
- `queryAgent({ role, query, context? })` → `@google/genai` (model: `gemini-2.5-flash`)
- Helpers: `analyzeDocument(content)`, `generateSummary(text, style)`


## Realtime (`/ws`)

File: `server/routes.ts`
- HTTP server wraps Express; WebSocketServer at path `/ws`
- Client lifecycle: `connection` → `join_workspace` / `leave_workspace`
- `broadcastToWorkspace(workspaceId, message)` used by routes/queue
- Event types observed:
  - paper_added
  - document_generated
  - new_message, agent_message
  - task_queued, task_started, task_completed, task_failed
  - canvas_updated
  - member_joined, member_status_changed
  - Custom `agent_log` messages may be sent by clients for terminal display in Multi‑Agent Lab


## Client architecture

- Routing/pages: `client/src/pages/*` (e.g., multi-agent-lab, team-workspace, paper-explorer, paper-generator, related-research, chat-with-paper)
- API helpers: `client/src/lib/api.ts` (uses fetch to backend, with frontend-only fallbacks)
- Realtime hook: `client/src/lib/websocket.ts` (join workspace; listen/broadcast)
- State/query: TanStack Query; `client/src/lib/queryClient.ts`
- UI library: shadcn/ui components in `client/src/components/ui/*`, with custom components for agents, papers, chat


## Error handling and edge cases

- AI key missing: `/api/health/ai` reports `missing_key`; AI endpoints throw with clear messages caught by routes and returned as 500 with `error`
- Large/empty docs: ingestion requires extracted content length; rejects if too small
- ArXiv/S2 network errors: search falls back to available sources; related research has a graceful fallback summary
- Task queue: processes per workspace with basic priority ordering; guards against double-processing
- WebSocket: messages are JSON; non‑workspace clients receive a global broadcast fallback for generic messages


## How to extend safely

- Add a new agent: define a system prompt in `AGENT_SYSTEM_PROMPTS`, extend UI where needed, reuse `/api/agents/ask` and tasks
- Add new storage entity: define tables in `shared/schema.ts` + `server/sqlite.ts`, implement methods in `storage.sqlite.ts`, then expose routes
- Improve graph: replace keyword overlap with embedding similarity; keep data shape `{ nodes, edges }` to avoid breaking UI
- Secure sessions: set `SESSION_SECRET` and `cookie.secure=true` behind HTTPS; add CSRF if needed
- Scale WS: replace in‑process broadcast with Redis pub/sub; shard by workspace


## Pointers (where to look)

- Server entry: `server/index.ts` (CORS, sessions, auth, logging, route registration, Vite dev middleware)
- Routes: `server/routes.ts` (all REST + WS setup)
- AI: `server/gemini.ts`
- Search: `server/arxiv.ts`, `server/semantic-scholar.ts`
- Parsing: `server/pdf.ts`
- Queue: `server/task-queue.ts`
- Storage switch: `server/storage.ts`; SQLite impl: `server/storage.sqlite.ts`; schema: `shared/schema.ts`; SQLite bootstrapping: `server/sqlite.ts`
- Client APIs: `client/src/lib/api.ts`; WebSocket: `client/src/lib/websocket.ts`


## Glossary of main endpoints

- Agents: POST `/api/agents/ask`
- Papers: GET `/api/papers/search`, GET `/api/papers/arxiv/:id`, GET `/api/papers/workspace/:workspaceId`, POST `/api/papers/upload`, POST `/api/papers/ingest-url`, POST `/api/papers/upload-file`
- Chat: POST `/api/chat/paper`, GET `/api/messages/paper/:paperId`
- Related: POST `/api/research/related`
- Documents: POST `/api/paper/generate`, GET `/api/documents/workspace/:workspaceId`
- Graph: GET `/api/graph/nodes/:workspaceId`, GET `/api/graph/edges/:workspaceId`, POST `/api/graph/nodes`, POST `/api/graph/edges`, POST `/api/graph/generate/:workspaceId`
- Tasks: POST `/api/tasks`, GET `/api/tasks/workspace/:id`, GET `/api/tasks/queue/:id`, GET `/api/tasks/:taskId`
- Workspace chat: GET `/api/workspace/messages/:workspaceId`, POST `/api/workspace/messages`, POST `/api/workspace/messages/agent`
- Members: POST `/api/workspace/members`, GET `/api/workspace/members/:workspaceId`, PATCH `/api/workspace/members/:workspaceId/:userId/status`
- Auth: POST `/api/auth/register`, POST `/api/auth/login`, POST `/api/auth/logout`, GET `/api/auth/me`
- Health: GET `/api/health`, GET `/api/health/ai`


## Run modes recap

- Frontend-only (mocked API helpers): `npm run dev` (Vite at :5173), client uses in-memory fallbacks for some calls
- Full-stack: set env, run server; serves API and client and enables all AI, search, and WebSocket features

— End —
