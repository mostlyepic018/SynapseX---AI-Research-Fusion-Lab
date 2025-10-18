// Frontend-only mock API for SynapseX
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

export interface RelatedResearchRequest {
  topic: string;
}

export interface RelatedResearchResponse {
  topic: string;
  relatedInfo: string;
}

export interface GeneratePaperRequest {
  topic: string;
  workspaceId?: string;
}

// Agent API
const mem = {
  papers: [] as Paper[],
  messages: [] as Message[],
  documents: [] as { id: string; title: string; content: string; version: number; workspaceId?: string | null }[],
};

function uid() { return Math.random().toString(36).slice(2, 10); }

export async function askAgent(data: AgentQueryRequest): Promise<AgentQueryResponse> {
  // simple echo with role for demo purposes
  return {
    agent: data.role,
    response: `Acknowledged: ${data.query}`,
  };
}

// Paper API
export async function searchPapers(query: string): Promise<Paper[]> {
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
}

export async function getPapersByWorkspace(_workspaceId: string): Promise<Paper[]> {
  return mem.papers;
}

export async function createPaper(data: CreatePaperRequest): Promise<Paper> {
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
}

// Chat API
export async function chatWithPaper(data: ChatWithPaperRequest): Promise<ChatWithPaperResponse> {
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
}

export async function getMessagesByPaper(paperId: string): Promise<Message[]> {
  return mem.messages.filter(m => m.paperId === paperId);
}

// Research API
export async function findRelatedResearch(data: RelatedResearchRequest): Promise<RelatedResearchResponse> {
  return {
    topic: data.topic,
    relatedInfo: `Top related works for "${data.topic}":\n\n1) Paper A — key concepts...\n2) Paper B — connections...\n3) Paper C — builds upon...`,
  };
}

// Document Generation API
export async function generatePaper(data: GeneratePaperRequest) {
  const doc = {
    id: uid(),
    title: `Generated Paper: ${data.topic}`,
    content: `# ${data.topic}\n\n## Abstract\nAn abstract about ${data.topic}.\n\n## Introduction\n...`,
    version: 1,
    workspaceId: data.workspaceId || null,
  };
  mem.documents.unshift(doc);
  return doc;
}

export async function getDocumentsByWorkspace(workspaceId: string) {
  return mem.documents.filter(d => d.workspaceId === workspaceId);
}

// Knowledge Graph API
export async function getGraphNodes(_workspaceId: string) {
  return [] as any[];
}

export async function getGraphEdges(_workspaceId: string) {
  return [] as any[];
}
