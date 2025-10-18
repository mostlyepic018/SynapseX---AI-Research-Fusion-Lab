// API helper functions for SynapseX
import { apiRequest } from "@/lib/queryClient";
import type { AgentType, Paper, Message } from "@shared/schema";

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
export async function askAgent(data: AgentQueryRequest): Promise<AgentQueryResponse> {
  return apiRequest("POST", "/api/agents/ask", data);
}

// Paper API
export async function searchPapers(query: string): Promise<Paper[]> {
  const params = new URLSearchParams({ q: query });
  const response = await fetch(`/api/papers/search?${params}`);
  if (!response.ok) throw new Error("Failed to search papers");
  return response.json();
}

export async function getPapersByWorkspace(workspaceId: string): Promise<Paper[]> {
  const response = await fetch(`/api/papers/workspace/${workspaceId}`);
  if (!response.ok) throw new Error("Failed to get papers");
  return response.json();
}

export async function createPaper(data: CreatePaperRequest): Promise<Paper> {
  return apiRequest("POST", "/api/papers/upload", data);
}

// Chat API
export async function chatWithPaper(data: ChatWithPaperRequest): Promise<ChatWithPaperResponse> {
  return apiRequest("POST", "/api/chat/paper", data);
}

export async function getMessagesByPaper(paperId: string): Promise<Message[]> {
  const response = await fetch(`/api/messages/paper/${paperId}`);
  if (!response.ok) throw new Error("Failed to get messages");
  return response.json();
}

// Research API
export async function findRelatedResearch(data: RelatedResearchRequest): Promise<RelatedResearchResponse> {
  return apiRequest("POST", "/api/research/related", data);
}

// Document Generation API
export async function generatePaper(data: GeneratePaperRequest) {
  return apiRequest("POST", "/api/paper/generate", data);
}

export async function getDocumentsByWorkspace(workspaceId: string) {
  const response = await fetch(`/api/documents/workspace/${workspaceId}`);
  if (!response.ok) throw new Error("Failed to get documents");
  return response.json();
}

// Knowledge Graph API
export async function getGraphNodes(workspaceId: string) {
  const response = await fetch(`/api/graph/nodes/${workspaceId}`);
  if (!response.ok) throw new Error("Failed to get nodes");
  return response.json();
}

export async function getGraphEdges(workspaceId: string) {
  const response = await fetch(`/api/graph/edges/${workspaceId}`);
  if (!response.ok) throw new Error("Failed to get edges");
  return response.json();
}
