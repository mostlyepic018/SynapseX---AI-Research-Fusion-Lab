# 🚀 Quick Reference Card

## Server Commands

```bash
# Start server (dev mode)
npx tsx server/index.ts

# Test backend
./test-backend.sh

# Check server status
curl http://127.0.0.1:5000/api/papers/search?q=test
```

## Essential Endpoints

### Task Management
```bash
# Create task
POST /api/tasks
{"title":"...", "description":"...", "agentType":"nlp", "priority":"high", "workspaceId":"..."}

# Get queue
GET /api/tasks/queue/:workspaceId

# Get all tasks
GET /api/tasks/workspace/:workspaceId
```

### Team Chat
```bash
# Send message
POST /api/workspace/messages
{"workspaceId":"...", "content":"...", "role":"user"}

# Agent chat
POST /api/workspace/messages/agent
{"workspaceId":"...", "query":"...", "agentType":"reasoning"}

# Get messages
GET /api/workspace/messages/:workspaceId
```

### Canvas
```bash
# Create
POST /api/canvas
{"title":"...", "content":"...", "workspaceId":"..."}

# Update
PATCH /api/canvas/:id
{"content":"...", "userId":"..."}

# Get
GET /api/canvas/:id
```

## Agent Types

| Agent | Code | Use For |
|-------|------|---------|
| NLP | `nlp` | Summarization, text generation |
| Reasoning | `reasoning` | Logic validation, methodology |
| Data | `data` | Statistics, dataset analysis |
| CV | `cv` | Image/figure interpretation |
| Critic | `critic` | Quality review, peer review |
| Retrieval | `retrieval` | Finding related work, citations |

## Priority Levels

- `urgent` - Highest priority
- `high` - Important
- `medium` - Default
- `low` - Background

## Task Status

- `pending` - Waiting in queue
- `in_progress` - Being processed
- `completed` - Finished successfully
- `failed` - Processing error

## WebSocket

```javascript
// Connect
const ws = new WebSocket('ws://127.0.0.1:5000/ws');

// Join workspace
ws.send(JSON.stringify({
  type: 'join_workspace',
  workspaceId: 'workspace-id'
}));

// Listen for events
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  console.log(msg.type); // task_queued, task_completed, etc.
};
```

## Environment

```bash
# .env file
GEMINI_API_KEY=your_gemini_api_key_here
PORT=5000
DATABASE_URL=postgresql://... # Optional
```

## Storage Modes

- **Memory**: Fast, resets on restart
- **Postgres**: Set DATABASE_URL for persistence

## Event Types

**Task Events:**
- `task_queued`
- `task_started`
- `task_completed`
- `task_failed`

**Chat Events:**
- `new_message`
- `agent_message`

**Canvas Events:**
- `canvas_updated`

**Member Events:**
- `member_joined`
- `member_status_changed`

## Error Handling

All errors return:
```json
{
  "error": "Error message"
}
```

Status codes: 400 (Bad Request), 404 (Not Found), 500 (Server Error)

## Quick Test

```bash
# 1. Start server
npx tsx server/index.ts

# 2. Create task
curl -X POST http://127.0.0.1:5000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","description":"Summarize","agentType":"nlp","priority":"high","workspaceId":"test"}'

# 3. Check status (wait 5 sec)
curl http://127.0.0.1:5000/api/tasks/workspace/test

# 4. Get messages (task result posted here)
curl http://127.0.0.1:5000/api/workspace/messages/test
```

## Documentation Files

- `README.md` - Project overview
- `API_DOCUMENTATION.md` - Complete API reference
- `BACKEND_QUICKSTART.md` - Getting started guide
- `IMPLEMENTATION_SUMMARY.md` - What was built
- `ARCHITECTURE.md` - System architecture
- `QUICK_REFERENCE.md` - This file

## Support

Server running at: **http://127.0.0.1:5000**

Check logs for task processing: Console output shows detailed progress

---

🎯 **Ready to go!** Start the server and test with curl or the frontend.
