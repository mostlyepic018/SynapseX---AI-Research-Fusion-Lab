// API client with backend-first calls and mock fallback
import type { AgentType, Paper, Message } from "@/types/schema";

export interface AgentQueryRequest {
  role: AgentType;
  query: string;
  context?: string;
  paperId?: string;
  workspaceId?: string;
}

export interface AgentQueryResponse {
  agent: AgentType;
  response: string;
}

export interface ChatWithPaperRequest {
  paperId: string;
  question: string;
  agentType?: AgentType;
}

export interface ChatWithPaperResponse {
  answer: string;
  agentMessage: Message;
}

export interface CreatePaperRequest {
  title: string;
  abstract?: string;
  authors?: string[];
  url?: string;
  workspaceId?: string;
}

export interface IngestPaperUrlRequest {
  url: string;
  title?: string;
  workspaceId?: string;
}

export interface UploadPaperFileRequest {
  file: File;
  title?: string;
  url?: string;
  workspaceId?: string;
}

export interface RelatedResearchRequest {
  topic: string;
}

export interface RelatedResearchResponse {
  topic: string;
  relatedInfo: string;
  graph?: { nodes: GraphNode[]; edges: GraphEdge[] };
  totalPapers?: number;
}

export interface GraphNode {
  id: string;
  type?: string;
  label: string;
  data?: any;
}

export interface GraphEdge {
  id: string;
  sourceId: string;
  targetId: string;
  type?: string;
  label?: string;
}

export type PaperFormat =
  | 'generic'
  | 'ieee'
  | 'acm'
  | 'neurips'
  | 'arxiv'
  | 'nature';

export interface GeneratePaperRequest {
  topic: string;
  workspaceId?: string;
  format?: PaperFormat;
}

// Agent API
const mem = {
  papers: [] as Paper[],
  messages: [] as Message[],
  documents: [] as { id: string; title: string; content: string; version: number; workspaceId?: string | null }[],
};

function uid() { return Math.random().toString(36).slice(2, 10); }

// Prefer explicit env; otherwise, when running the Vite dev server on port 5173,
// default to the same hostname as the page to keep cookies same-site (localhost vs 127.0.0.1).
const API_BASE = (import.meta as any).env?.VITE_API_BASE
  || (typeof window !== 'undefined' && window.location?.port === '5173'
      ? `${window.location.protocol}//${window.location.hostname}:5000`
      : '');

async function backendFetch<T>(path: string, init?: RequestInit, fallback?: () => T | Promise<T>): Promise<T> {
  if (!API_BASE) return fallback ? await fallback() : Promise.reject(new Error('No backend configured'));
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
      credentials: 'include',
      ...init,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `HTTP ${res.status}`);
    }
    return res.json();
  } catch (err) {
    if (fallback) return await fallback();
    throw err;
  }
}

// ---- Auth API ----
export interface AuthUser { id: string; username: string; email?: string | null; avatar_url?: string | null; created_at: string; }
export async function register(data: { username: string; password: string; email?: string }): Promise<AuthUser> {
  return backendFetch<AuthUser>(`/api/auth/register`, { method: 'POST', body: JSON.stringify(data) });
}
export async function login(data: { username: string; password: string }): Promise<AuthUser> {
  return backendFetch<AuthUser>(`/api/auth/login`, { method: 'POST', body: JSON.stringify(data) });
}
export async function logout(): Promise<{ ok: boolean }> {
  return backendFetch<{ ok: boolean }>(`/api/auth/logout`, { method: 'POST' });
}
export async function me(): Promise<AuthUser | null> {
  return backendFetch<AuthUser | null>(`/api/auth/me`, { method: 'GET' }, async () => null);
}
export interface UserAction { id: string; userId: string; method: string; path: string; body?: string | null; createdAt: string }
export async function listMyActions(): Promise<UserAction[]> {
  return backendFetch<UserAction[]>(`/api/actions`, { method: 'GET' }, async () => []);
}

export async function askAgent(data: AgentQueryRequest): Promise<AgentQueryResponse> {
  return backendFetch<AgentQueryResponse>('/api/agents/ask', {
    method: 'POST',
    body: JSON.stringify(data),
  }, async () => ({ agent: data.role, response: `Acknowledged (mock): ${data.query}` }));
}

// Paper API
export async function searchPapers(query: string, opts?: { sortBy?: 'relevance' | 'submittedDate' | 'lastUpdatedDate'; sortOrder?: 'ascending' | 'descending' }): Promise<Paper[]> {
  const sortBy = opts?.sortBy ?? 'submittedDate';
  const sortOrder = opts?.sortOrder ?? 'descending';
  const url = `/api/papers/search?q=${encodeURIComponent(query)}&sortBy=${encodeURIComponent(sortBy)}&sortOrder=${encodeURIComponent(sortOrder)}`;
  return backendFetch<Paper[]>(url, { method: 'GET' }, async () => {
    const results: Paper[] = [
      {
        id: `arxiv-${uid()}`,
        title: `${query} — A Comprehensive Survey`,
        abstract: `We survey ${query} with a focus on recent advances...`,
        authors: ["A. Researcher", "B. Scientist"],
        year: new Date().getFullYear(),
        source: "arxiv",
        sourceId: uid(),
        url: "https://arxiv.org/abs/0000.00000",
        pdfUrl: null,
        content: null,
        sections: null,
        workspaceId: null,
        uploadedBy: null,
        createdAt: new Date().toISOString(),
      },
    ];
    return results;
  });
}

export async function getPapersByWorkspace(workspaceId: string): Promise<Paper[]> {
  return backendFetch<Paper[]>(`/api/papers/workspace/${workspaceId}`, { method: 'GET' }, async () => mem.papers);
}

export async function createPaper(data: CreatePaperRequest): Promise<Paper> {
  return backendFetch<Paper>('/api/papers/upload', { method: 'POST', body: JSON.stringify(data) }, async () => {
    const paper: Paper = {
      id: uid(),
      title: data.title,
      abstract: data.abstract || null,
      authors: data.authors || null,
      source: "uploaded",
      sourceId: null,
      url: data.url || null,
      pdfUrl: null,
      content: null,
      sections: null,
      workspaceId: data.workspaceId || null,
      uploadedBy: null,
      createdAt: new Date().toISOString(),
    };
    mem.papers.unshift(paper);
    return paper;
  });
}

export async function ingestPaperUrl(data: IngestPaperUrlRequest): Promise<Paper> {
  return backendFetch<Paper>('/api/papers/ingest-url', { method: 'POST', body: JSON.stringify(data) }, async () => {
    // Mock: create a basic paper with content unavailable
    const paper: Paper = {
      id: uid(),
      title: data.title || data.url,
      abstract: null,
      authors: null,
      source: 'uploaded',
      sourceId: null,
      url: data.url,
      pdfUrl: data.url.endsWith('.pdf') ? data.url : null,
      content: 'Content ingestion is mocked in offline mode.',
      sections: null,
      workspaceId: data.workspaceId || null,
      uploadedBy: null,
      createdAt: new Date().toISOString(),
    };
    mem.papers.unshift(paper);
    return paper;
  });
}

export async function uploadPaperFile(data: UploadPaperFileRequest): Promise<Paper> {
  if (!API_BASE) {
    const paper: Paper = {
      id: uid(),
      title: data.title || data.file.name.replace(/\.pdf$/i, ''),
      abstract: null,
      authors: null,
      source: 'uploaded',
      sourceId: null,
      url: data.url || null,
      pdfUrl: null,
      content: 'PDF content is mocked in offline mode.',
      sections: null,
      workspaceId: data.workspaceId || null,
      uploadedBy: null,
      createdAt: new Date().toISOString(),
    };
    mem.papers.unshift(paper);
    return paper;
  }
  const form = new FormData();
  form.append('file', data.file);
  if (data.title) form.append('title', data.title);
  if (data.url) form.append('url', data.url);
  if (data.workspaceId) form.append('workspaceId', data.workspaceId);
  const res = await fetch(`${API_BASE}/api/papers/upload-file`, { method: 'POST', body: form });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// Chat API
export async function chatWithPaper(data: ChatWithPaperRequest): Promise<ChatWithPaperResponse> {
  return backendFetch<ChatWithPaperResponse>('/api/chat/paper', { method: 'POST', body: JSON.stringify(data) }, async () => {
    const agentMsg: Message = {
      id: uid(),
      content: `AI (${data.agentType || 'reasoning'}): Answer to "${data.question}" — this is a demo response.`,
      role: 'agent',
      agentType: (data.agentType || 'reasoning') as AgentType,
      paperId: data.paperId,
      workspaceId: null,
      userId: null,
      createdAt: new Date().toISOString(),
    };
    mem.messages.push(agentMsg);
    return { answer: agentMsg.content, agentMessage: agentMsg };
  });
}

export async function getMessagesByPaper(paperId: string): Promise<Message[]> {
  return backendFetch<Message[]>(`/api/messages/paper/${paperId}`, { method: 'GET' }, async () => mem.messages.filter(m => m.paperId === paperId));
}

// Research API
export async function findRelatedResearch(data: RelatedResearchRequest): Promise<RelatedResearchResponse> {
  return backendFetch<RelatedResearchResponse>('/api/research/related', { method: 'POST', body: JSON.stringify(data) }, async () => ({
    topic: data.topic,
    relatedInfo: `### Related works for "${data.topic}"

- Paper A — key concepts...
- Paper B — connections...
- Paper C — builds upon...
`,
    graph: {
      nodes: [
        { id: 'p0', label: 'Paper A', type: 'paper' },
        { id: 'p1', label: 'Paper B', type: 'paper' },
        { id: 'p2', label: 'Paper C', type: 'paper' },
      ],
      edges: [
        { id: 'e0', sourceId: 'p0', targetId: 'p1', type: 'citation', label: 'overlap' },
        { id: 'e1', sourceId: 'p1', targetId: 'p2', type: 'citation', label: 'overlap' },
      ],
    },
    totalPapers: 3,
  }));
}

// Document Generation API
export async function generatePaper(data: GeneratePaperRequest) {
  return backendFetch<any>('/api/paper/generate', { method: 'POST', body: JSON.stringify(data) }, async () => {
    const format = data.format || 'generic';

    function templateFor(format: PaperFormat, topic: string): string {
      switch (format) {
        case 'ieee':
          return `# ${topic}\n\n## Abstract\n\n## Keywords\n\n## Introduction\n\n## Related Work\n\n## Methodology\n\n## Experiments\n\n## Results\n\n## Discussion\n\n## Conclusion\n\n## References`;
        case 'acm':
          return `# ${topic}\n\n## CCS Concepts\n\n## Keywords\n\n## Abstract\n\n## Introduction\n\n## Related Work\n\n## Methods\n\n## Evaluation\n\n## Results\n\n## Discussion\n\n## Conclusion\n\n## Acknowledgments\n\n## References`;
        case 'neurips':
          return `# ${topic}\n\n## Abstract\n\n## Introduction\n\n## Related Work\n\n## Method\n\n## Experiments\n\n## Results\n\n## Conclusion\n\n## Broader Impact\n\n## References`;
        case 'arxiv':
          return `# ${topic}\n\n## Abstract\n\n## Introduction\n\n## Related Work\n\n## Methods\n\n## Experiments\n\n## Results\n\n## Conclusion\n\n## Acknowledgments\n\n## References`;
        case 'nature':
          return `# ${topic}\n\n## Abstract\n\n## Introduction\n\n## Results\n\n## Discussion\n\n## Methods\n\n## Data availability\n\n## Code availability\n\n## Acknowledgments\n\n## References`;
        case 'generic':
        default:
          return `# ${topic}\n\n## Abstract\n\n## Introduction\n\n## Methodology\n\n## Results\n\n## Conclusion`;
      }
    }

    const doc = {
      id: uid(),
      title: `Generated Paper: ${data.topic}`,
      content: templateFor(format, data.topic),
      version: 1,
      workspaceId: data.workspaceId || null,
    };
    mem.documents.unshift(doc);
    return doc;
  });
}

export async function getDocumentsByWorkspace(workspaceId: string) {
  return backendFetch<any[]>(`/api/documents/workspace/${workspaceId}`, { method: 'GET' }, async () => mem.documents.filter(d => d.workspaceId === workspaceId));
}

export async function createDocument(payload: { title: string; content: string; workspaceId?: string | null }) {
  if (!API_BASE) {
    const doc = { id: uid(), title: payload.title, content: payload.content, version: 1, workspaceId: payload.workspaceId || null };
    mem.documents.unshift(doc as any);
    return doc;
  }
  return backendFetch<any>(`/api/documents`, { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateDocument(id: string, payload: { title?: string; content?: string; bumpVersion?: boolean }) {
  if (!API_BASE) {
    const doc = mem.documents.find(d => d.id === id);
    if (!doc) throw new Error('Document not found');
    if (payload.title !== undefined) (doc as any).title = payload.title;
    if (payload.content !== undefined) (doc as any).content = payload.content;
    if (payload.bumpVersion) (doc as any).version = ((doc as any).version || 1) + 1;
    return doc;
  }
  return backendFetch<any>(`/api/documents/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

export async function getDocumentHistory(id: string) {
  return backendFetch<any[]>(`/api/documents/${id}/history`, { method: 'GET' }, async () => []);
}

// Knowledge Graph API
export async function getGraphNodes(workspaceId: string) {
  return backendFetch<GraphNode[]>(`/api/graph/nodes/${workspaceId}`, { method: 'GET' }, async () => []);
}

export async function getGraphEdges(workspaceId: string) {
  return backendFetch<GraphEdge[]>(`/api/graph/edges/${workspaceId}`, { method: 'GET' }, async () => []);
}

export async function createGraphNode(payload: { type: string; label: string; data?: any; workspaceId: string; }): Promise<GraphNode> {
  return backendFetch<GraphNode>(`/api/graph/nodes`, { method: 'POST', body: JSON.stringify(payload) });
}

export async function createGraphEdge(payload: { sourceId: string; targetId: string; type: string; label?: string; workspaceId: string; }): Promise<GraphEdge> {
  return backendFetch<GraphEdge>(`/api/graph/edges`, { method: 'POST', body: JSON.stringify(payload) });
}

export async function generateKnowledgeGraph(workspaceId: string): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
  return backendFetch<{ nodes: GraphNode[]; edges: GraphEdge[] }>(`/api/graph/generate/${workspaceId}`, { method: 'POST' }, async () => ({ nodes: [], edges: [] }));
}

// --- New: Tasks & Workspace APIs ---

export interface CreateTaskRequest {
  title: string;
  description: string;
  agentType: AgentType;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  workspaceId: string;
  paperId?: string | null;
  context?: string | null;
}

export interface TaskDto {
  id: string;
  title: string;
  description: string;
  agentType: AgentType;
  priority: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  result?: string | null;
  workspaceId: string;
  paperId?: string | null;
  createdAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
}

export async function createTask(data: CreateTaskRequest): Promise<TaskDto> {
  return backendFetch<TaskDto>('/api/tasks', { method: 'POST', body: JSON.stringify(data) });
}

export async function getTasksByWorkspace(workspaceId: string): Promise<TaskDto[]> {
  return backendFetch<TaskDto[]>(`/api/tasks/workspace/${workspaceId}`, { method: 'GET' }, async () => []);
}

export async function getPendingTasks(workspaceId: string): Promise<TaskDto[]> {
  return backendFetch<TaskDto[]>(`/api/tasks/queue/${workspaceId}`, { method: 'GET' }, async () => []);
}

export async function getWorkspaceMessages(workspaceId: string): Promise<Message[]> {
  return backendFetch<Message[]>(`/api/workspace/messages/${workspaceId}`, { method: 'GET' }, async () => []);
}

export async function sendWorkspaceMessage(payload: { workspaceId: string; content: string; role: 'user' | 'agent'; agentType?: AgentType; userId?: string | null; }): Promise<Message> {
  return backendFetch<Message>('/api/workspace/messages', { method: 'POST', body: JSON.stringify(payload) });
}

export async function agentWorkspaceMessage(payload: { workspaceId: string; query: string; agentType: AgentType; context?: string; }) {
  return backendFetch<{ query: string; response: string; message: Message }>("/api/workspace/messages/agent", { method: 'POST', body: JSON.stringify(payload) });
}

// Canvas APIs
export interface CanvasDoc {
  id: string; title: string; content: string; workspaceId: string; lastEditedBy?: string | null; updatedAt?: string;
}

export async function createCanvas(payload: { title: string; content?: string; workspaceId: string; }): Promise<CanvasDoc> {
  return backendFetch<CanvasDoc>('/api/canvas', { method: 'POST', body: JSON.stringify(payload) });
}

export async function listCanvasByWorkspace(workspaceId: string): Promise<CanvasDoc[]> {
  return backendFetch<CanvasDoc[]>(`/api/canvas/workspace/${workspaceId}`, { method: 'GET' }, async () => []);
}

export async function getCanvas(id: string): Promise<CanvasDoc> {
  return backendFetch<CanvasDoc>(`/api/canvas/${id}`, { method: 'GET' });
}

export async function updateCanvas(id: string, content: string, userId?: string | null): Promise<CanvasDoc> {
  return backendFetch<CanvasDoc>(`/api/canvas/${id}`, { method: 'PATCH', body: JSON.stringify({ content, userId: userId || null }) });
}

// Workspace Members APIs
export interface WorkspaceMemberDto { id: string; userId: string; workspaceId: string; role: string; status: 'online' | 'offline' | 'away'; joinedAt: string; }

export async function getWorkspaceMembers(workspaceId: string): Promise<WorkspaceMemberDto[]> {
  return backendFetch<WorkspaceMemberDto[]>(`/api/workspace/members/${workspaceId}`, { method: 'GET' }, async () => []);
}

export async function addWorkspaceMember(payload: { workspaceId: string; userId: string; role?: string }): Promise<WorkspaceMemberDto> {
  return backendFetch<WorkspaceMemberDto>(`/api/workspace/members`, { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateMemberStatus(workspaceId: string, userId: string, status: 'online' | 'offline' | 'away'): Promise<WorkspaceMemberDto> {
  return backendFetch<WorkspaceMemberDto>(`/api/workspace/members/${workspaceId}/${userId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
}

// Paper upload/ingest APIs
// use existing ingestPaperUrl and uploadPaperFile above
