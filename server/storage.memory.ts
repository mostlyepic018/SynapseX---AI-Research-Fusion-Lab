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
  Task,
  InsertTask,
  WorkspaceMember,
  InsertWorkspaceMember,
  CanvasDocument,
  InsertCanvasDocument,
} from "../shared/schema";
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
  private documentVersions: { id: string; documentId: string; version: number; title: string; content: string; createdAt: Date }[] = [];
  private nodes: KnowledgeNode[] = [];
  private edges: KnowledgeEdge[] = [];
  private tasks: Task[] = [];
  private workspaceMembers: WorkspaceMember[] = [];
  private canvasDocuments: CanvasDocument[] = [];

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
  async updateDocument(id: string, updates: { title?: string; content?: string; bumpVersion?: boolean }) {
    const doc = this.documents.find(d => d.id === id);
    if (!doc) throw new Error("Document not found");
    if (updates.title !== undefined) doc.title = updates.title;
    if (updates.content !== undefined) doc.content = updates.content;
    if (updates.bumpVersion) doc.version = (doc.version || 1) + 1;
    // push version snapshot
    if (updates.bumpVersion) {
      this.documentVersions.push({ id: uid(), documentId: doc.id, version: doc.version, title: doc.title, content: doc.content, createdAt: new Date() });
    }
    doc.updatedAt = new Date();
    return doc;
  }
  async listDocumentVersions(documentId: string) {
    return this.documentVersions.filter(v => v.documentId === documentId).sort((a,b)=>b.version - a.version) as any;
  }
  async createDocumentVersion(payload: any) {
    const row = { id: uid(), createdAt: new Date(), ...payload };
    this.documentVersions.push(row);
    return row as any;
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

  // Tasks
  async getTask(id: string) { return this.tasks.find(t => t.id === id); }
  async getTasksByWorkspace(workspaceId: string) { 
    return this.tasks.filter(t => t.workspaceId === workspaceId).sort((a,b)=>+b.createdAt! - +a.createdAt!); 
  }
  async getPendingTasks(workspaceId: string) { 
    return this.tasks.filter(t => t.workspaceId === workspaceId && t.status === 'pending').sort((a,b)=>+a.createdAt! - +b.createdAt!); 
  }
  async createTask(task: InsertTask) {
    const row: Task = { 
      id: uid(), 
      createdAt: new Date(), 
      startedAt: null,
      completedAt: null,
      result: null,
      ...task 
    } as any;
    this.tasks.push(row);
    return row;
  }
  async updateTaskStatus(id: string, status: string, result?: string) {
    const task = this.tasks.find(t => t.id === id);
    if (!task) throw new Error("Task not found");
    task.status = status;
    if (result !== undefined) task.result = result;
    return task;
  }
  async updateTaskProgress(id: string, status: string, startedAt?: Date, completedAt?: Date) {
    const task = this.tasks.find(t => t.id === id);
    if (!task) throw new Error("Task not found");
    task.status = status;
    if (startedAt) task.startedAt = startedAt;
    if (completedAt) task.completedAt = completedAt;
    return task;
  }

  // Workspace Members
  async getWorkspaceMember(workspaceId: string, userId: string) {
    return this.workspaceMembers.find(m => m.workspaceId === workspaceId && m.userId === userId);
  }
  async getWorkspaceMembers(workspaceId: string) {
    return this.workspaceMembers.filter(m => m.workspaceId === workspaceId);
  }
  async createWorkspaceMember(member: InsertWorkspaceMember) {
    const row: WorkspaceMember = { id: uid(), joinedAt: new Date(), ...member } as any;
    this.workspaceMembers.push(row);
    return row;
  }
  async updateMemberStatus(workspaceId: string, userId: string, status: string) {
    const member = this.workspaceMembers.find(m => m.workspaceId === workspaceId && m.userId === userId);
    if (!member) throw new Error("Member not found");
    member.status = status;
    return member;
  }

  // Canvas Documents
  async getCanvasDocument(id: string) { return this.canvasDocuments.find(d => d.id === id); }
  async getCanvasDocumentsByWorkspace(workspaceId: string) {
    return this.canvasDocuments.filter(d => d.workspaceId === workspaceId).sort((a,b)=>+b.updatedAt! - +a.updatedAt!);
  }
  async createCanvasDocument(doc: InsertCanvasDocument) {
    const now = new Date();
    const row: CanvasDocument = { id: uid(), createdAt: now, updatedAt: now, ...doc } as any;
    this.canvasDocuments.push(row);
    return row;
  }
  async updateCanvasDocument(id: string, content: string, lastEditedBy: string) {
    const doc = this.canvasDocuments.find(d => d.id === id);
    if (!doc) throw new Error("Canvas document not found");
    doc.content = content;
    doc.lastEditedBy = lastEditedBy;
    doc.updatedAt = new Date();
    return doc;
  }
}
