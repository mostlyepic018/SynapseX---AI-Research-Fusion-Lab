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

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Workspaces
  getWorkspace(id: string): Promise<Workspace | undefined>;
  getWorkspacesByUser(userId: string): Promise<Workspace[]>;
  createWorkspace(workspace: InsertWorkspace): Promise<Workspace>;

  // Papers
  getPaper(id: string): Promise<Paper | undefined>;
  getPapersByWorkspace(workspaceId: string): Promise<Paper[]>;
  searchPapers(query: string): Promise<Paper[]>;
  createPaper(paper: InsertPaper): Promise<Paper>;

  // Agent Logs
  getAgentLogsByPaper(paperId: string): Promise<AgentLog[]>;
  createAgentLog(log: InsertAgentLog): Promise<AgentLog>;

  // Messages
  getMessagesByPaper(paperId: string): Promise<Message[]>;
  getMessagesByWorkspace(workspaceId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;

  // Generated Documents
  getDocument(id: string): Promise<GeneratedDocument | undefined>;
  getDocumentsByWorkspace(workspaceId: string): Promise<GeneratedDocument[]>;
  createDocument(doc: InsertGeneratedDocument): Promise<GeneratedDocument>;
  updateDocument(id: string, updates: { title?: string; content?: string; bumpVersion?: boolean }): Promise<GeneratedDocument>;
  listDocumentVersions(documentId: string): Promise<import("../shared/schema").GeneratedDocumentVersion[]>;
  createDocumentVersion(payload: import("../shared/schema").InsertGeneratedDocumentVersion): Promise<import("../shared/schema").GeneratedDocumentVersion>;

  // Knowledge Graph
  getNodesByWorkspace(workspaceId: string): Promise<KnowledgeNode[]>;
  getEdgesByWorkspace(workspaceId: string): Promise<KnowledgeEdge[]>;
  createNode(node: InsertKnowledgeNode): Promise<KnowledgeNode>;
  createEdge(edge: InsertKnowledgeEdge): Promise<KnowledgeEdge>;

  // Tasks
  getTask(id: string): Promise<Task | undefined>;
  getTasksByWorkspace(workspaceId: string): Promise<Task[]>;
  getPendingTasks(workspaceId: string): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTaskStatus(id: string, status: string, result?: string): Promise<Task>;
  updateTaskProgress(id: string, status: string, startedAt?: Date, completedAt?: Date): Promise<Task>;

  // Workspace Members
  getWorkspaceMember(workspaceId: string, userId: string): Promise<WorkspaceMember | undefined>;
  getWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]>;
  createWorkspaceMember(member: InsertWorkspaceMember): Promise<WorkspaceMember>;
  updateMemberStatus(workspaceId: string, userId: string, status: string): Promise<WorkspaceMember>;

  // Canvas Documents
  getCanvasDocument(id: string): Promise<CanvasDocument | undefined>;
  getCanvasDocumentsByWorkspace(workspaceId: string): Promise<CanvasDocument[]>;
  createCanvasDocument(doc: InsertCanvasDocument): Promise<CanvasDocument>;
  updateCanvasDocument(id: string, content: string, lastEditedBy: string): Promise<CanvasDocument>;
}
