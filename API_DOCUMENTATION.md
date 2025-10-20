# SynapseX Fusion Lab - API Documentation

## Backend Architecture

The backend is built with:
- **Express.js** - REST API server
- **WebSocket (ws)** - Real-time collaboration
- **Google Gemini 2.5 Flash** - AI agent processing
- **Drizzle ORM** - Database abstraction (Postgres/Memory)
- **Task Queue System** - Asynchronous agent task processing

## Multi-Agent Lab + Team Workspace Integration

The core feature integrates:
1. **Task Assignment & Queue Management** - Assign tasks to specialized AI agents
2. **Real-time Collaboration** - WebSocket-based live updates
3. **Agent-Specific Processing** - Custom prompts and context routing per agent
4. **Team Chat** - Human and AI agents collaborating
5. **Canvas Workspace** - Collaborative document editing

---

## API Endpoints

### Task Management

#### Create Task (Assign to Agent)
```
POST /api/tasks
```

**Request Body:**
```json
{
  "title": "Analyze methodology section",
  "description": "Review the methodology and identify potential improvements",
  "agentType": "critic",
  "priority": "high",
  "workspaceId": "workspace-id",
  "paperId": "paper-id-optional",
  "context": "Additional context for the agent"
}
```

**Agent Types:** `nlp`, `reasoning`, `data`, `cv`, `critic`, `retrieval`
**Priority Levels:** `low`, `medium`, `high`, `urgent`

**Response:**
```json
{
  "id": "task-id",
  "title": "Analyze methodology section",
  "description": "...",
  "agentType": "critic",
  "priority": "high",
  "status": "pending",
  "workspaceId": "workspace-id",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

#### Get All Tasks for Workspace
```
GET /api/tasks/workspace/:workspaceId
```

Returns all tasks (pending, in_progress, completed, failed) sorted by creation date.

#### Get Task Queue (Pending Tasks)
```
GET /api/tasks/queue/:workspaceId
```

Returns only pending tasks sorted by priority and creation time.

#### Get Specific Task
```
GET /api/tasks/:taskId
```

Returns task details including result if completed.

---

### Workspace Members

#### Add Member to Workspace
```
POST /api/workspace/members
```

**Request Body:**
```json
{
  "workspaceId": "workspace-id",
  "userId": "user-id",
  "role": "member"
}
```

**Roles:** `owner`, `admin`, `member`

#### Get Workspace Members
```
GET /api/workspace/members/:workspaceId
```

Returns all members with their status (online/offline/away).

#### Update Member Status
```
PATCH /api/workspace/members/:workspaceId/:userId/status
```

**Request Body:**
```json
{
  "status": "online"
}
```

**Status Options:** `online`, `offline`, `away`

---

### Canvas Documents (Collaborative Workspace)

#### Create Canvas Document
```
POST /api/canvas
```

**Request Body:**
```json
{
  "title": "Research Sprint Canvas",
  "content": "Initial content...",
  "workspaceId": "workspace-id"
}
```

#### Get Canvas Documents for Workspace
```
GET /api/canvas/workspace/:workspaceId
```

Returns all canvas documents sorted by last update.

#### Get Specific Canvas Document
```
GET /api/canvas/:canvasId
```

#### Update Canvas Document
```
PATCH /api/canvas/:canvasId
```

**Request Body:**
```json
{
  "content": "Updated content...",
  "userId": "user-id-optional"
}
```

Broadcasts update to all workspace members via WebSocket.

---

### Team Workspace Chat

#### Get Workspace Messages
```
GET /api/workspace/messages/:workspaceId
```

Returns all chat messages (human + agent) sorted chronologically.

#### Send Message (Human)
```
POST /api/workspace/messages
```

**Request Body:**
```json
{
  "workspaceId": "workspace-id",
  "content": "Let's review the latest findings",
  "role": "user",
  "userId": "user-id-optional"
}
```

#### Agent Participation in Chat
```
POST /api/workspace/messages/agent
```

**Request Body:**
```json
{
  "workspaceId": "workspace-id",
  "query": "Summarize the key findings from all papers",
  "agentType": "nlp",
  "context": "Optional additional context"
}
```

Agent responds and message is saved + broadcasted to workspace.

---

### Existing Endpoints

#### Agent Query
```
POST /api/agents/ask
```

Direct agent query (not task-based).

#### Paper Search
```
GET /api/papers/search?q=machine+learning
```

Search local + ArXiv papers.

#### Chat with Paper
```
POST /api/chat/paper
```

Ask questions about a specific paper.

#### Paper Generator
```
POST /api/paper/generate
```

Generate research paper outline.

Request body:
```json
{
  "topic": "Graph transformers",
  "workspaceId": "optional-workspace-id",
  "format": "generic | ieee | acm | neurips | arxiv | nature"
}
```

---

### Knowledge Graph

#### List Nodes
```
GET /api/graph/nodes/:workspaceId
```

#### List Edges
```
GET /api/graph/edges/:workspaceId
```

#### Create Node
```
POST /api/graph/nodes
```
Body:
```json
{ "type": "paper|agent|dataset|concept", "label": "string", "data": {}, "workspaceId": "id" }
```

#### Create Edge
```
POST /api/graph/edges
```
Body:
```json
{ "sourceId": "node-id", "targetId": "node-id", "type": "citation|reasoning|validation|collaboration|concept", "label": "optional", "workspaceId": "id" }
```

#### Generate Fused Graph for Workspace
```
POST /api/graph/generate/:workspaceId
```
Synthesizes graph nodes and edges from workspace papers, messages, and tasks. Returns `{ nodes, edges }` and persists new nodes/edges.

---

## WebSocket Protocol

### Connection
```
ws://localhost:5000/ws
```

### Message Types

#### Join Workspace
```json
{
  "type": "join_workspace",
  "workspaceId": "workspace-id"
}
```

#### Leave Workspace
```json
{
  "type": "leave_workspace"
}
```

### Server Broadcasts

#### Task Queued
```json
{
  "type": "task_queued",
  "task": {
    "id": "task-id",
    "title": "...",
    "agentType": "nlp",
    "priority": "high",
    "status": "pending"
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

#### Task Started
```json
{
  "type": "task_started",
  "task": {
    "id": "task-id",
    "status": "in_progress"
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

#### Task Completed
```json
{
  "type": "task_completed",
  "task": {
    "id": "task-id",
    "status": "completed",
    "result": "Agent response..."
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

#### Task Failed
```json
{
  "type": "task_failed",
  "task": {
    "id": "task-id",
    "status": "failed",
    "error": "Error message"
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

#### New Message
```json
{
  "type": "new_message",
  "message": {
    "id": "message-id",
    "content": "...",
    "role": "user",
    "workspaceId": "workspace-id"
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

#### Agent Message
```json
{
  "type": "agent_message",
  "message": {
    "id": "message-id",
    "content": "Agent response...",
    "role": "agent",
    "agentType": "reasoning"
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

#### Canvas Updated
```json
{
  "type": "canvas_updated",
  "canvas": {
    "id": "canvas-id",
    "title": "...",
    "lastEditedBy": "user-id",
    "updatedAt": "2024-01-01T00:00:00Z"
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

#### Member Joined
```json
{
  "type": "member_joined",
  "member": {
    "id": "member-id",
    "userId": "user-id",
    "role": "member",
    "status": "online"
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

#### Member Status Changed
```json
{
  "type": "member_status_changed",
  "member": {
    "userId": "user-id",
    "status": "away"
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

---

## Agent System

### Agent Types & Specializations

1. **NLP Agent** (`nlp`)
   - Text analysis and generation
   - Summarization
   - Content structuring
   - Abstract extraction

2. **Reasoning Agent** (`reasoning`)
   - Logical validation
   - Methodology critique
   - Bias detection
   - Claim validation

3. **Data Agent** (`data`)
   - Statistical analysis
   - Dataset evaluation
   - Pattern identification
   - Quantitative assessment

4. **Computer Vision Agent** (`cv`)
   - Figure interpretation
   - Visual data analysis
   - Chart/graph understanding
   - Visual pattern detection

5. **Critic Agent** (`critic`)
   - Quality assessment
   - Weakness identification
   - Research scoring
   - Improvement suggestions

6. **Retrieval Agent** (`retrieval`)
   - Research discovery
   - Related paper finding
   - Citation management
   - Information gathering

### Agent Processing Flow

1. **Task Creation** → Task added to database with `pending` status
2. **Queue Addition** → Task enters priority queue (urgent → high → medium → low)
3. **Task Processing** → Agent-specific system prompt + context routing
4. **Gemini API Call** → Google Gemini 2.5 Flash processes request
5. **Result Storage** → Response saved to task + message created
6. **WebSocket Broadcast** → All workspace members notified
7. **Status Update** → Task marked as `completed` or `failed`

### Custom Context Routing

- Tasks linked to papers receive paper content as context
- Tasks can include custom context strings
- Agent prompts are role-specific with collaboration instructions
- Responses are structured and actionable

---

## Database Schema

### Tasks Table
```typescript
{
  id: string (uuid)
  title: string
  description: string
  agentType: string (nlp|reasoning|data|cv|critic|retrieval)
  priority: string (low|medium|high|urgent)
  status: string (pending|in_progress|completed|failed)
  result: string (nullable)
  context: string (nullable)
  workspaceId: string (foreign key)
  assignedBy: string (nullable, foreign key to users)
  paperId: string (nullable, foreign key to papers)
  createdAt: timestamp
  startedAt: timestamp (nullable)
  completedAt: timestamp (nullable)
}
```

### Workspace Members Table
```typescript
{
  id: string (uuid)
  workspaceId: string (foreign key)
  userId: string (foreign key)
  role: string (owner|admin|member)
  status: string (online|offline|away)
  joinedAt: timestamp
}
```

### Canvas Documents Table
```typescript
{
  id: string (uuid)
  title: string
  content: string
  workspaceId: string (foreign key)
  lastEditedBy: string (nullable, foreign key to users)
  createdAt: timestamp
  updatedAt: timestamp
}
```

---

## Environment Configuration

```bash
# Required for AI features
GEMINI_API_KEY=your_api_key_here

# Optional - enables Postgres storage
DATABASE_URL=postgresql://...

# Optional - default is 5000
PORT=5000
```

---

## Error Handling

All endpoints return consistent error responses:

```json
{
  "error": "Error message description"
}
```

HTTP Status Codes:
- `200` - Success
- `400` - Bad Request (missing required fields)
- `404` - Not Found
- `500` - Internal Server Error

---

## Development Notes

- Tasks are processed sequentially by default (can be parallelized)
- WebSocket messages are workspace-scoped
- In-memory storage resets on server restart (use Postgres for persistence)
- Agent responses are streamed to prevent timeout issues
- Task queue automatically processes pending tasks on creation
- Server logs include detailed task processing information

---

## Example Workflow

### 1. Create a Workspace
```bash
POST /api/workspace/members
{
  "workspaceId": "ws-123",
  "userId": "user-1",
  "role": "owner"
}
```

### 2. Connect to WebSocket
```javascript
const ws = new WebSocket('ws://localhost:5000/ws');
ws.send(JSON.stringify({ type: 'join_workspace', workspaceId: 'ws-123' }));
```

### 3. Assign Task to Agent
```bash
POST /api/tasks
{
  "title": "Summarize methodology",
  "description": "Provide a concise summary of the methodology section",
  "agentType": "nlp",
  "priority": "high",
  "workspaceId": "ws-123"
}
```

### 4. Monitor via WebSocket
- Receive `task_queued` → `task_started` → `task_completed`
- Task result automatically posted to workspace chat

### 5. Chat with Agent
```bash
POST /api/workspace/messages/agent
{
  "workspaceId": "ws-123",
  "query": "What are the key findings?",
  "agentType": "reasoning"
}
```

### 6. Collaborative Editing
```bash
PATCH /api/canvas/canvas-123
{
  "content": "Updated research notes...",
  "userId": "user-1"
}
```

All workspace members receive canvas update via WebSocket.

---

Built with ❤️ for collaborative AI research.
