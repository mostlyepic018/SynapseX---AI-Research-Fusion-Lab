# SynapseX - AI Research Fusion Lab

## Overview
SynapseX is a collaborative AI research platform where humans and AI agents powered by Gemini 2.5 co-create, analyze, and understand research papers together. It provides a digital lab environment where 6 specialized AI agents work alongside researchers.

## Tech Stack
- **Frontend**: React with Vite, TailwindCSS, shadcn/ui components
- **Backend**: Express.js, Node.js
- **Database**: PostgreSQL with Drizzle ORM
- **AI**: Google Gemini 2.5 API
- **Real-time**: WebSockets for collaboration
- **State Management**: TanStack Query

## Key Features

### 1. Multi-Agent Collaboration Lab
- 6 specialized AI agents: NLP, Reasoning, Data, CV, Critic, Retrieval
- Real-time agent status monitoring with visual indicators
- Agent communication terminal showing inter-agent conversations
- Task assignment and agent pinging capabilities

### 2. Smart Research Paper Explorer
- Search and discover research papers
- Integration ready for ArXiv and Semantic Scholar APIs
- Save papers to workspace
- Filter by source and metadata

### 3. Chat with Research Paper
- Upload PDFs or paste paper links
- Ask questions about methodology, datasets, findings
- Multi-agent responses with agent identification
- Context-aware Q&A using Gemini

### 4. Related Research Finder
- Discover semantically connected papers
- Network graph visualization (ready for React Flow integration)
- Auto-generate literature reviews

### 5. Dynamic Paper Generator
- Collaborative writing with AI agents in real-time
- Split-view markdown editor with live preview
- Version control system
- Multi-cursor support showing agent contributions

### 6. Knowledge Fusion Graph
- Interactive network visualization of research connections
- Nodes: papers, agents, datasets, key concepts
- Edges: citations, reasoning, validation, collaboration

### 7. Human-in-the-Loop Coaching
- Provide feedback to guide AI agents
- View agent adaptation logs
- Learning progress tracking
- Suggested guidance prompts

### 8. Team Collaboration Workspace
- Real-time document editing via WebSockets
- Live chat with team members and AI agents
- Presence indicators and typing status
- Task assignment with @mentions

## Project Structure

### Frontend (`client/`)
- `src/pages/` - Feature pages (8 main features)
- `src/components/` - Reusable UI components
  - `agent-card.tsx` - AI agent status cards with glow effects
  - `paper-card.tsx` - Research paper display cards
  - `chat-message.tsx` - Chat message bubbles
  - `app-sidebar.tsx` - Collapsible navigation sidebar
  - `agent-console.tsx` - Floating agent logs panel
  - `theme-provider.tsx` & `theme-toggle.tsx` - Dark/light mode
- `src/lib/` - API helpers, WebSocket hooks, utilities

### Backend (`server/`)
- `routes.ts` - API endpoints and WebSocket server
- `storage.ts` - Database operations using Drizzle ORM
- `gemini.ts` - Gemini AI service wrapper with agent prompts
- `db.ts` - Database connection

### Shared (`shared/`)
- `schema.ts` - Drizzle ORM schema and TypeScript types

## Design System
- **Primary Color**: Neon Blue (#4F46E5)
- **Secondary Color**: Violet (#7C3AED)
- **Typography**: Inter (headings), IBM Plex Sans (body), JetBrains Mono (code)
- **Animations**: Pulsing glows for active agents, smooth transitions
- **Theme**: Light and dark mode support

## API Endpoints

### Agent System
- `POST /api/agents/ask` - Query any agent with role and context
- Agents log all interactions to database

### Papers
- `GET /api/papers/search?q=query` - Search papers
- `GET /api/papers/workspace/:id` - Get workspace papers
- `POST /api/papers/upload` - Create/upload paper

### Chat
- `POST /api/chat/paper` - Ask questions about a paper
- `GET /api/messages/paper/:id` - Get chat history

### Research
- `POST /api/research/related` - Find related research

### Documents
- `POST /api/paper/generate` - Generate paper with AI
- `GET /api/documents/workspace/:id` - Get documents

### Knowledge Graph
- `GET /api/graph/nodes/:workspaceId` - Get graph nodes
- `GET /api/graph/edges/:workspaceId` - Get graph edges

### WebSocket
- `ws://host/ws` - Real-time collaboration channel

## Environment Variables
- `GEMINI_API_KEY` - Google Gemini API key
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Session encryption key

## Database Schema
Tables: users, workspaces, papers, agent_logs, messages, generated_documents, knowledge_nodes, knowledge_edges

## Development
The application is already set up and running on `npm run dev`.

## Recent Changes (October 18, 2025)
- Implemented complete frontend with 8 feature pages
- Built comprehensive backend with Gemini AI integration
- Set up PostgreSQL database with Drizzle ORM
- Created WebSocket server for real-time collaboration
- Integrated TanStack Query for data fetching
- Added dark mode support with theme provider
- Implemented agent status monitoring with visual effects
- Created floating agent console for live logs

## Next Steps
- Add ArXiv and Semantic Scholar API integration
- Implement React Flow for knowledge graph visualization
- Add PDF parsing capabilities
- Enhance multi-agent coordination algorithms
- Implement user authentication and workspace management
- Add export functionality for generated papers
