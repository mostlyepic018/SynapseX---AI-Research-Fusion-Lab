# SynapseX Fusion Lab

AI research collaboration platform where specialized agents work together like a research team. Explore papers, ask questions, assign tasks to agents, generate drafts, and coordinate a research sprint—end-to-end.

SynapseX runs in two modes:
- Frontend-only demo with mock data (no backend, fastest to try)
- Full-stack with real AI (Express + Gemini API + WebSocket; optional Postgres)

## Quick start

Pick one mode below. You can switch anytime.

### Option A — Frontend-only demo (no backend)

1) Install dependencies

```bash
npm install
```

2) Start the dev server

```bash
npm run dev
```

3) Open http://localhost:5173

This mode uses in-memory mocks. Great for UI exploration and workflows.

### Option B — Full-stack (Express + Gemini + WebSocket)

1) Set your environment

```bash
export GEMINI_API_KEY="<your_gemini_api_key>"
# optional
export DATABASE_URL="<postgres_connection_string>"  # enables Drizzle/Postgres storage
export PORT=5000  # default
```

2) Run the server (serves API + client with Vite middleware)

```bash
npx tsx server/index.ts
```

3) Open http://127.0.0.1:${PORT:-5000}

In full-stack mode, agents call the Gemini API, paper search hits ArXiv + local storage, and WebSocket broadcasts are real.

## What you can do

**Backend is now fully implemented with:**
- ✅ Multi-agent task queue system with priority processing
- ✅ Real-time collaboration via WebSocket
- ✅ Team workspace with human + AI agent chat
- ✅ Collaborative canvas for shared work
- ✅ Agent-specific context routing and custom prompts
- ✅ Task lifecycle management (pending → in_progress → completed/failed)
- ✅ Live status tracking and broadcasts

See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for complete API reference.

### Multi‑Agent Lab (`/agents`)
- Six agents: NLP, Reasoning, Data, CV, Critic, Retrieval
- Ping agents and see responses
- Assign tasks with priority; watch live logs in the terminal
- Real-time updates via WebSocket

### Paper Explorer (`/papers`)
- Search papers (ArXiv + local in full-stack; mock in demo)
- Upload/add papers to your workspace
- Inspect metadata and jump into chat

### Chat with Paper (`/chat`)
- Pick a paper and ask questions
- Choose the responding agent type (e.g., Reasoning)
- See a threaded history of Q&A

### Related Research (`/related`)
- Find connected papers and concepts
- Get agent-written summaries and connections

### Paper Generator (`/generator`)
- Generate a structured draft outline from a topic
- Edit with a live Markdown preview
- Save/export versions

### Knowledge Graph (`/graph`)
- Visualize nodes/edges for your workspace
- Inspect counts and basic stats

### Team Workspace (`/workspace`)
- Shared documents and chat
- Member presence and active tasks

## Key workflows

Here are a few end-to-end flows you can try.

1) Research sprint
- Explore: Search papers in Paper Explorer → add to workspace
- Understand: Open a paper in Chat → ask NLP/Reasoning/Data agents
- Critique: Use Critic to review claims and methodology
- Draft: Generate an outline in Paper Generator and refine the text
- Connect: Inspect Knowledge Graph for relationships
- Collaborate: Share updates in Team Workspace

2) Agent tasking
- Go to Multi‑Agent Lab
- Assign a task to an agent (e.g., “Summarize Section 3” with High priority)
- Watch the terminal for progress logs and completion

3) Paper Q&A
- Open Chat with Paper
- Ask targeted questions (e.g., “What dataset and metrics were used?”)
- Switch agent types to compare perspectives (Reasoning vs Data)

4) Draft generation
- Open Paper Generator
- Enter a topic and generate a structured draft
- Edit the Markdown, save versions, export when ready

## Architecture

- Client: React + Vite + Tailwind + Radix UI + TanStack Query + Wouter
- Server: Express + WebSocket (ws)
- AI: Google Gemini 2.5 (via @google/genai)
- Storage: Drizzle ORM with optional Neon/Postgres, plus in-memory fallback

Project layout (top-level):

```
client/           # React app (pages, components, hooks, lib)
server/           # Express API, Gemini integration, storage layers, WebSocket
shared/           # Shared schema/types (when enabled)
vite.config.ts    # Vite config (client root)
```

## Environment and configuration

- GEMINI_API_KEY: Required in full-stack mode for AI features
- DATABASE_URL: Optional Postgres URL; if unset, in-memory storage is used
- PORT: Server port (default 5000; server binds to 127.0.0.1)

Aliases (client): `@` → `client/src`, `@assets` → `attached_assets`

Client → Server base URL:
- When running `npm run dev` (frontend on :5173), the client will call the backend at `http://127.0.0.1:5000` by default.
- You can override by setting `VITE_API_BASE` in `.env` (e.g., `VITE_API_BASE=http://localhost:5000`).

## API surface (full‑stack mode)

Agent and research endpoints:
- POST `/api/agents/ask` → { role, query, context? } → { agent, response }
- POST `/api/research/related` → { topic } → related info summary

Papers and chat:
- GET `/api/papers/search?q=...` → local + ArXiv results
- GET `/api/papers/workspace/:workspaceId`
- POST `/api/papers/upload` → create/upload a paper
- POST `/api/chat/paper` → { paperId, question, agentType } → answer + message log
- GET `/api/messages/paper/:paperId`

Documents and graph:
- POST `/api/paper/generate` → draft document
- GET `/api/documents/workspace/:workspaceId`
- GET `/api/graph/nodes/:workspaceId`
- GET `/api/graph/edges/:workspaceId`

WebSocket:
- Path: `ws://<host>/ws`
- Broadcasts JSON messages to all clients (used by the terminal in Multi‑Agent Lab)

## Development tips

- Frontend-only mode uses `client/src/lib/api.ts` mocks; swap to real fetch calls when server is on
- In dev full‑stack, the server injects Vite middleware and serves the client and API together
- Build client with `npm run build` before running server in production; output goes to `dist/public`

## Scripts

- `npm run dev` — Frontend dev server (http://localhost:5173)
- `npm run build` — Build client assets
- `npm run preview` — Preview built client
- `npm run check` — TypeScript type check

To add a convenience script for the server, you can extend `package.json` (optional):

```json
{
  "scripts": {
    "serve": "tsx server/index.ts"
  }
}
```

Then run:

```bash
npm run serve
```

## Notes

- In frontend-only mode, all data is in-memory and resets on refresh
- In full-stack mode, enable Gemini with `GEMINI_API_KEY`; Postgres is optional
- The server binds to 127.0.0.1 by default to avoid macOS socket issues

## 🎉 Backend Implementation Complete!

The backend is **fully functional** with:
- ✅ Multi-agent task queue system
- ✅ Real-time WebSocket collaboration
- ✅ Team workspace (human + AI chat)
- ✅ Collaborative canvas editing
- ✅ 25+ API endpoints
- ✅ 6 specialized AI agents with custom prompts
- ✅ Priority-based task processing

**Server Status:** Running at `http://127.0.0.1:5000`

### 📚 Documentation
- **[API_DOCUMENTATION.md](./API_DOCUMENTATION.md)** - Complete API reference
- **[BACKEND_QUICKSTART.md](./BACKEND_QUICKSTART.md)** - Getting started guide
- **[IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)** - What was built
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System architecture diagrams
- **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** - Quick reference card

### 🧪 Test the Backend
```bash
# Quick test
./test-backend.sh

# Or manually
curl -X POST http://127.0.0.1:5000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title":"Analyze methodology",
    "description":"Review research methodology",
    "agentType":"critic",
    "priority":"high",
    "workspaceId":"demo"
  }'
```

### 🔑 Features Ready for Frontend Integration
1. **Task Assignment** - POST /api/tasks → Real-time processing
2. **Task Queue** - GET /api/tasks/queue/:id → Active & pending tasks
3. **Team Chat** - POST /api/workspace/messages/agent → AI participation
4. **Canvas** - PATCH /api/canvas/:id → Collaborative editing
5. **WebSocket** - ws://127.0.0.1:5000/ws → Live updates

---

Built with care to make AI research workflows collaborative, transparent, and fun.
