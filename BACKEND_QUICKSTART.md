# Backend Quick Start Guide

## Overview

The backend implementation includes:
- **Task Queue System**: Assign tasks to specialized AI agents with priority handling
- **Real-time WebSocket**: Live updates for task progress, chat, and collaboration
- **Team Workspace**: Human and AI agents working together
- **Canvas Workspace**: Collaborative document editing
- **Agent System**: 6 specialized agents with custom prompts and context routing

## Prerequisites

1. Node.js installed
2. Gemini API key (already configured in `.env`)

## Starting the Server

### Quick Start (Recommended)

```bash
# Install dependencies (if not already done)
npm install

# Start the full-stack server
npx tsx server/index.ts
```

The server will:
- Start on `http://127.0.0.1:5000`
- Serve the API on `/api/*`
- Serve the client via Vite middleware
- Enable WebSocket on `ws://127.0.0.1:5000/ws`
- Use in-memory storage (data resets on restart)

### With Database (Optional)

```bash
# Set your Postgres database URL
export DATABASE_URL="postgresql://user:password@host:port/database"

# Start server
npx tsx server/index.ts
```

## Testing the Backend

### 1. Test Agent Query

```bash
curl -X POST http://127.0.0.1:5000/api/agents/ask \
  -H "Content-Type: application/json" \
  -d '{
    "role": "nlp",
    "query": "Summarize the key concepts in transformer models"
  }'
```

### 2. Create a Task

```bash
curl -X POST http://127.0.0.1:5000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Analyze research methodology",
    "description": "Review the methodology section and provide feedback",
    "agentType": "critic",
    "priority": "high",
    "workspaceId": "demo-workspace"
  }'
```

### 3. Get Task Queue

```bash
curl http://127.0.0.1:5000/api/tasks/queue/demo-workspace
```

### 4. Create Canvas Document

```bash
curl -X POST http://127.0.0.1:5000/api/canvas \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Research Sprint Canvas",
    "content": "# Team Notes\n\nOur research findings...",
    "workspaceId": "demo-workspace"
  }'
```

### 5. Send Workspace Message

```bash
curl -X POST http://127.0.0.1:5000/api/workspace/messages \
  -H "Content-Type: application/json" \
  -d '{
    "workspaceId": "demo-workspace",
    "content": "Let us review the latest findings",
    "role": "user"
  }'
```

### 6. Agent Participation in Chat

```bash
curl -X POST http://127.0.0.1:5000/api/workspace/messages/agent \
  -H "Content-Type: application/json" \
  -d '{
    "workspaceId": "demo-workspace",
    "query": "What are the main challenges in the current approach?",
    "agentType": "reasoning"
  }'
```

## WebSocket Testing

Use a WebSocket client (like `wscat`):

```bash
# Install wscat
npm install -g wscat

# Connect to WebSocket
wscat -c ws://127.0.0.1:5000/ws

# Join a workspace
> {"type":"join_workspace","workspaceId":"demo-workspace"}

# Now you'll receive real-time updates for tasks, messages, etc.
```

## Agent Types

1. **nlp** - Text analysis, summarization, content generation
2. **reasoning** - Logical validation, methodology critique
3. **data** - Statistical analysis, dataset evaluation
4. **cv** - Computer vision, figure interpretation
5. **critic** - Quality assessment, research review
6. **retrieval** - Information gathering, citation management

## Priority Levels

- **urgent** - Highest priority, processed first
- **high** - Important tasks
- **medium** - Standard priority (default)
- **low** - Background tasks

## Task Lifecycle

```
pending → in_progress → completed
                    ↘ failed
```

## Real-time Events

When you assign a task, you'll receive WebSocket events:
1. `task_queued` - Task added to queue
2. `task_started` - Agent begins processing
3. `task_completed` - Agent finished (result included)
4. `task_failed` - Processing error

## Monitoring

Check server logs for detailed information:
```
[Task Queue] Starting task task-123 - Analyze methodology [Agent: critic]
[Task Queue] Completed task task-123 - Analyze methodology
[WebSocket] Client abc123 joined workspace demo-workspace
```

## API Endpoints Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/tasks` | POST | Create task |
| `/api/tasks/workspace/:id` | GET | Get all tasks |
| `/api/tasks/queue/:id` | GET | Get pending tasks |
| `/api/workspace/members` | POST | Add member |
| `/api/workspace/messages` | POST | Send message |
| `/api/workspace/messages/agent` | POST | Agent chat |
| `/api/canvas` | POST | Create canvas |
| `/api/canvas/:id` | PATCH | Update canvas |

See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for complete reference.

## Troubleshooting

### Server won't start
- Check if port 5000 is already in use
- Verify Gemini API key is set in `.env`

### Tasks not processing
- Check server logs for errors
- Verify workspace ID exists
- Ensure agent type is valid

### WebSocket not connecting
- Confirm server is running
- Check WebSocket URL: `ws://127.0.0.1:5000/ws`
- Send `join_workspace` message after connecting

## Next Steps

1. Open the client at `http://127.0.0.1:5000`
2. Navigate to Multi-Agent Lab (`/agents`)
3. Assign tasks to agents
4. Watch real-time updates in the console
5. Check Team Workspace (`/workspace`) for collaboration

## Production Deployment

For production:
1. Set `NODE_ENV=production`
2. Build client: `npm run build`
3. Set `DATABASE_URL` for persistence
4. Use environment variable for `GEMINI_API_KEY` (don't commit it!)
5. Configure reverse proxy (nginx/Apache) for WebSocket

---

**Ready to start!** Run `npx tsx server/index.ts` and visit `http://127.0.0.1:5000`
