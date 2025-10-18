import type {
  User,
  InsertUser,
  Workspace,
  InsertWorkspace,
  Paper,
  InsertPaper,
  AgentLog,
  InsertAgentLog,
  Message,
  InsertMessage,
  GeneratedDocument,
  InsertGeneratedDocument,
  KnowledgeNode,
  InsertKnowledgeNode,
  KnowledgeEdge,
  InsertKnowledgeEdge,
} from "@shared/schema";
import type { IStorage } from "./storage.types";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export class MemoryStorage implements IStorage {
  private users: User[] = [];
  private workspaces: Workspace[] = [];
  private papers: Paper[] = [];
  private agentLogs: AgentLog[] = [];
  private messages: Message[] = [];
  private documents: GeneratedDocument[] = [];
  private nodes: KnowledgeNode[] = [];
  private edges: KnowledgeEdge[] = [];

  // Users
  async getUser(id: string) { return this.users.find(u => u.id === id); }
  async getUserByUsername(username: string) { return this.users.find(u => u.username === username); }
  async createUser(user: InsertUser) {
    const row: User = { id: uid(), createdAt: new Date(), ...user } as any;
    this.users.push(row);
    return row;
  }

  // Workspaces
  async getWorkspace(id: string) { return this.workspaces.find(w => w.id === id); }
  async getWorkspacesByUser(userId: string) { return this.workspaces.filter(w => w.ownerId === userId).sort((a,b)=>+b.createdAt! - +a.createdAt!); }
  async createWorkspace(workspace: InsertWorkspace) {
    const row: Workspace = { id: uid(), createdAt: new Date(), updatedAt: new Date(), ...workspace } as any;
    this.workspaces.push(row);
    return row;
  }

  // Papers
  async getPaper(id: string) { return this.papers.find(p => p.id === id); }
  async getPapersByWorkspace(workspaceId: string) { return this.papers.filter(p => p.workspaceId === workspaceId).sort((a,b)=>+b.createdAt! - +a.createdAt!); }
  async searchPapers(query: string) {
    const q = query.toLowerCase();
    return this.papers.filter(p => (p.title?.toLowerCase().includes(q) || p.abstract?.toLowerCase().includes(q))).sort((a,b)=>+b.createdAt! - +a.createdAt!).slice(0,50);
  }
  async createPaper(paper: InsertPaper) {
    const row: Paper = { id: uid(), createdAt: new Date(), ...paper } as any;
    this.papers.push(row);
    return row;
  }

  // Agent Logs
  async getAgentLogsByPaper(paperId: string) { return this.agentLogs.filter(l => l.paperId === paperId).sort((a,b)=>+b.createdAt! - +a.createdAt!); }
  async createAgentLog(log: InsertAgentLog) {
    const row: AgentLog = { id: uid(), createdAt: new Date(), ...log } as any;
    this.agentLogs.push(row);
    return row;
  }

  // Messages
  async getMessagesByPaper(paperId: string) { return this.messages.filter(m => m.paperId === paperId).sort((a,b)=>+a.createdAt! - +b.createdAt!); }
  async getMessagesByWorkspace(workspaceId: string) { return this.messages.filter(m => m.workspaceId === workspaceId).sort((a,b)=>+a.createdAt! - +b.createdAt!); }
  async createMessage(message: InsertMessage) {
    const row: Message = { id: uid(), createdAt: new Date(), ...message } as any;
    this.messages.push(row);
    return row;
  }

  // Generated Documents
  async getDocument(id: string) { return this.documents.find(d => d.id === id); }
  async getDocumentsByWorkspace(workspaceId: string) { return this.documents.filter(d => d.workspaceId === workspaceId).sort((a,b)=>+b.updatedAt! - +a.updatedAt!); }
  async createDocument(doc: InsertGeneratedDocument) {
    const now = new Date();
    const row: GeneratedDocument = { id: uid(), createdAt: now, updatedAt: now, version: (doc as any).version ?? 1, ...doc } as any;
    this.documents.push(row);
    return row;
  }

  // Knowledge Graph
  async getNodesByWorkspace(workspaceId: string) { return this.nodes.filter(n => n.workspaceId === workspaceId); }
  async getEdgesByWorkspace(workspaceId: string) { return this.edges.filter(e => e.workspaceId === workspaceId); }
  async createNode(node: InsertKnowledgeNode) {
    const row: KnowledgeNode = { id: uid(), createdAt: new Date(), ...node } as any;
    this.nodes.push(row);
    return row;
  }
  async createEdge(edge: InsertKnowledgeEdge) {
    const row: KnowledgeEdge = { id: uid(), createdAt: new Date(), ...edge } as any;
    this.edges.push(row);
    return row;
  }
}
