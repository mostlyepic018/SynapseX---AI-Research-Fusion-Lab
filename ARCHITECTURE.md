# SynapseX Backend Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (React)                           │
│  Multi-Agent Lab | Team Workspace | Canvas | Paper Explorer     │
└────────────┬────────────────────────────────────┬───────────────┘
             │                                     │
             │ HTTP REST API                       │ WebSocket
             │                                     │
┌────────────▼─────────────────────────────────────▼──────────────┐
│                      EXPRESS SERVER                              │
│                    (server/index.ts)                             │
└──────────┬──────────────────────────────────────┬───────────────┘
           │                                       │
           │                                       │
    ┌──────▼─────────┐                   ┌────────▼────────┐
    │   REST Routes  │                   │   WebSocket     │
    │ (routes.ts)    │                   │   Server (ws)   │
    │                │                   │                 │
    │ • Tasks        │                   │ • Broadcast     │
    │ • Workspace    │                   │ • Join/Leave    │
    │ • Canvas       │                   │ • Real-time     │
    │ • Chat         │                   │   Updates       │
    │ • Agents       │                   │                 │
    └────────┬───────┘                   └─────────────────┘
             │
             │
    ┌────────▼─────────────────────────┐
    │      Task Queue Manager          │
    │     (task-queue.ts)              │
    │                                  │
    │  • Priority Queue                │
    │  • Sequential Processing         │
    │  • Status Tracking               │
    │  • Error Handling                │
    └────────┬─────────────────────────┘
             │
             │
    ┌────────▼─────────────────────────┐
    │      Agent System                │
    │      (gemini.ts)                 │
    │                                  │
    │  ┌──────────────────────────┐   │
    │  │  Custom System Prompts   │   │
    │  ├──────────────────────────┤   │
    │  │ • NLP Agent              │   │
    │  │ • Reasoning Agent        │   │
    │  │ • Data Agent             │   │
    │  │ • CV Agent               │   │
    │  │ • Critic Agent           │   │
    │  │ • Retrieval Agent        │   │
    │  └──────────────────────────┘   │
    └────────┬─────────────────────────┘
             │
             │
    ┌────────▼─────────────────────────┐
    │    Google Gemini 2.5 Flash      │
    │    API Integration               │
    └──────────────────────────────────┘
```

## Data Flow

### Task Assignment Flow
```
┌──────────┐
│  Client  │
└────┬─────┘
     │ POST /api/tasks
     │ { title, description, agentType, priority, workspaceId }
     │
     ▼
┌──────────────────┐
│  Express Server  │
│  creates Task    │
└────┬─────────────┘
     │
     ├──► Storage (DB/Memory)
     │    Status: "pending"
     │
     ├──► WebSocket Broadcast
     │    Event: "task_queued"
     │
     ▼
┌─────────────────────┐
│  Task Queue Manager │
│  picks up task      │
└────┬────────────────┘
     │
     │ Status: "in_progress"
     │
     ├──► WebSocket Broadcast
     │    Event: "task_started"
     │
     ▼
┌──────────────────────┐
│   Agent Processing   │
│   • System Prompt    │
│   • Context Routing  │
│   • Gemini API Call  │
└────┬─────────────────┘
     │
     │ Get Response
     │
     ▼
┌──────────────────────┐
│  Store Result        │
│  Status: "completed" │
└────┬─────────────────┘
     │
     ├──► WebSocket Broadcast
     │    Event: "task_completed"
     │
     ├──► Create Message
     │    (Task result in chat)
     │
     ▼
┌──────────────┐
│    Client    │
│  UI Updates  │
└──────────────┘
```

### Team Chat Flow
```
┌──────────┐
│  Client  │ POST /api/workspace/messages/agent
└────┬─────┘
     │ { workspaceId, query, agentType }
     │
     ▼
┌─────────────────┐
│  Agent System   │
│  Query Agent    │
└────┬────────────┘
     │
     ▼
┌──────────────────┐
│  Gemini API      │
│  Get Response    │
└────┬─────────────┘
     │
     ▼
┌──────────────────┐
│  Save Messages   │
│  • User Query    │
│  • Agent Reply   │
└────┬─────────────┘
     │
     ├──► WebSocket Broadcast
     │    Event: "agent_message"
     │
     ▼
┌──────────────┐
│  All Clients │
│  in Workspace│
└──────────────┘
```

### Canvas Collaboration Flow
```
┌──────────┐
│ Client A │ PATCH /api/canvas/:id
└────┬─────┘
     │ { content, userId }
     │
     ▼
┌─────────────────┐
│  Update Canvas  │
│  Document       │
└────┬────────────┘
     │
     ├──► Storage
     │    Save content + timestamp
     │
     ├──► WebSocket Broadcast
     │    Event: "canvas_updated"
     │
     ▼
┌────────────────────────┐
│  Clients B, C, D, ...  │
│  Refresh Canvas View   │
└────────────────────────┘
```

## Storage Architecture

```
┌─────────────────────────────────────┐
│        Storage Interface            │
│         (IStorage)                  │
└────────┬────────────────────────────┘
         │
         │ Factory Pattern
         │ (storage.ts)
         │
    ┌────┴─────┐
    │          │
    │    IF DATABASE_URL set?
    │          │
    ▼          ▼
   YES        NO
    │          │
    │          │
┌───▼────────────┐    ┌───────────────────┐
│ DatabaseStorage│    │  MemoryStorage    │
│ (storage.db)   │    │  (storage.memory) │
│                │    │                   │
│ • Postgres     │    │ • In-Memory Maps  │
│ • Drizzle ORM  │    │ • Fast Access     │
│ • Persistent   │    │ • Resets on       │
│                │    │   Restart         │
└────────────────┘    └───────────────────┘
```

## Database Schema

```
┌─────────────────────────────────────────────────────────────────┐
│                         DATABASE TABLES                          │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    users     │     │  workspaces  │     │    papers    │
├──────────────┤     ├──────────────┤     ├──────────────┤
│ id           │     │ id           │     │ id           │
│ username     │◄────┤ ownerId      │◄────┤ workspaceId  │
│ email        │     │ name         │     │ title        │
│ password     │     │ description  │     │ abstract     │
└──────────────┘     └──────────────┘     │ content      │
                                           └──────────────┘

┌──────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│      tasks       │     │  workspaceMembers│     │ canvasDocuments │
├──────────────────┤     ├──────────────────┤     ├─────────────────┤
│ id               │     │ id               │     │ id              │
│ title            │     │ workspaceId      │     │ title           │
│ description      │     │ userId           │     │ content         │
│ agentType        │     │ role             │     │ workspaceId     │
│ priority         │     │ status           │     │ lastEditedBy    │
│ status           │     │ joinedAt         │     │ updatedAt       │
│ result           │     └──────────────────┘     └─────────────────┘
│ workspaceId      │
│ paperId          │
│ createdAt        │
│ startedAt        │
│ completedAt      │
└──────────────────┘

┌──────────────────┐     ┌──────────────────┐
│    messages      │     │   agentLogs      │
├──────────────────┤     ├──────────────────┤
│ id               │     │ id               │
│ content          │     │ agentType        │
│ role             │     │ query            │
│ agentType        │     │ response         │
│ paperId          │     │ context          │
│ workspaceId      │     │ paperId          │
│ userId           │     │ workspaceId      │
│ createdAt        │     │ createdAt        │
└──────────────────┘     └──────────────────┘
```

## WebSocket Message Types

```
CLIENT → SERVER
├─ join_workspace
│  └─ { type, workspaceId }
└─ leave_workspace
   └─ { type }

SERVER → CLIENT
├─ Task Events
│  ├─ task_queued
│  ├─ task_started
│  ├─ task_completed
│  └─ task_failed
│
├─ Chat Events
│  ├─ new_message
│  └─ agent_message
│
├─ Canvas Events
│  └─ canvas_updated
│
└─ Member Events
   ├─ member_joined
   └─ member_status_changed
```

## Agent System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        AGENT SYSTEM                              │
└─────────────────────────────────────────────────────────────────┘

                    ┌────────────────────┐
                    │  Agent Interface   │
                    │   queryAgent()     │
                    └─────────┬──────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
         System Prompt   Context Routing   Gemini API
              │               │               │
              ▼               ▼               ▼
    ┌─────────────────────────────────────────────────┐
    │           Agent-Specific Processing             │
    ├─────────────────────────────────────────────────┤
    │                                                 │
    │  ┌────────────────┐  ┌────────────────┐       │
    │  │  NLP Agent     │  │ Reasoning Agent│       │
    │  │ • Text Analysis│  │ • Logic Check  │       │
    │  │ • Summarize    │  │ • Methodology  │       │
    │  └────────────────┘  └────────────────┘       │
    │                                                 │
    │  ┌────────────────┐  ┌────────────────┐       │
    │  │  Data Agent    │  │   CV Agent     │       │
    │  │ • Stats        │  │ • Figures      │       │
    │  │ • Metrics      │  │ • Charts       │       │
    │  └────────────────┘  └────────────────┘       │
    │                                                 │
    │  ┌────────────────┐  ┌────────────────┐       │
    │  │ Critic Agent   │  │ Retrieval Agent│       │
    │  │ • Review       │  │ • Search       │       │
    │  │ • Quality      │  │ • Citations    │       │
    │  └────────────────┘  └────────────────┘       │
    └─────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌────────────────────┐
                    │   Gemini 2.5 Flash │
                    │   Response         │
                    └────────────────────┘
```

## Request/Response Cycle

```
1. CLIENT REQUEST
   │
   ├─ HTTP REST API
   │  └─ Express Routes
   │     └─ Validation
   │        └─ Storage Layer
   │
   ├─ WebSocket Message
   │  └─ Parse JSON
   │     └─ Route to Handler
   │
   └─ Task Creation
      └─ Queue Manager
         └─ Agent Processing

2. PROCESSING
   │
   ├─ Agent Selection
   │  └─ System Prompt Load
   │
   ├─ Context Assembly
   │  ├─ Paper Content?
   │  └─ Custom Context?
   │
   ├─ Gemini API Call
   │  └─ Response Processing
   │
   └─ Storage Update
      └─ Status Change

3. RESPONSE
   │
   ├─ HTTP Response
   │  └─ JSON Data
   │
   ├─ WebSocket Broadcast
   │  └─ All Workspace Clients
   │
   └─ Create Message
      └─ Chat History
```

## Deployment Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                      PRODUCTION SETUP                         │
└──────────────────────────────────────────────────────────────┘

┌─────────────┐
│   Client    │
│  (Browser)  │
└──────┬──────┘
       │
       │ HTTPS
       │
┌──────▼──────────────┐
│  Reverse Proxy      │
│  (nginx/Apache)     │
│  • SSL/TLS          │
│  • WebSocket Proxy  │
└──────┬──────────────┘
       │
       │ HTTP
       │
┌──────▼──────────────┐
│  Express Server     │
│  • PORT=5000        │
│  • Node.js          │
└──────┬──────────────┘
       │
       ├──► Postgres Database
       │    (persistent storage)
       │
       ├──► Gemini API
       │    (AI processing)
       │
       └──► Redis (optional)
            (WebSocket scaling)
```

---

## Technology Stack

- **Runtime**: Node.js + TypeScript
- **Server**: Express.js
- **WebSocket**: ws library
- **AI**: Google Gemini 2.5 Flash
- **Database**: Postgres + Drizzle ORM
- **Storage**: Memory fallback
- **Client**: React + Vite + TanStack Query

---

Built for collaborative AI research 🚀
