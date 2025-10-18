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

  // Knowledge Graph
  getNodesByWorkspace(workspaceId: string): Promise<KnowledgeNode[]>;
  getEdgesByWorkspace(workspaceId: string): Promise<KnowledgeEdge[]>;
  createNode(node: InsertKnowledgeNode): Promise<KnowledgeNode>;
  createEdge(edge: InsertKnowledgeEdge): Promise<KnowledgeEdge>;
}
