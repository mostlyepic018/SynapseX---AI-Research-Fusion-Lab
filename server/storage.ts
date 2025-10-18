// Following javascript_database blueprint - using DatabaseStorage with Drizzle ORM
import {
  users,
  workspaces,
  papers,
  agentLogs,
  messages,
  generatedDocuments,
  knowledgeNodes,
  knowledgeEdges,
  type User,
  type InsertUser,
  type Workspace,
  type InsertWorkspace,
  type Paper,
  type InsertPaper,
  type AgentLog,
  type InsertAgentLog,
  type Message,
  type InsertMessage,
  type GeneratedDocument,
  type InsertGeneratedDocument,
  type KnowledgeNode,
  type InsertKnowledgeNode,
  type KnowledgeEdge,
  type InsertKnowledgeEdge,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, ilike } from "drizzle-orm";

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

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Workspaces
  async getWorkspace(id: string): Promise<Workspace | undefined> {
    const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, id));
    return workspace || undefined;
  }

  async getWorkspacesByUser(userId: string): Promise<Workspace[]> {
    return db.select().from(workspaces).where(eq(workspaces.ownerId, userId)).orderBy(desc(workspaces.createdAt));
  }

  async createWorkspace(insertWorkspace: InsertWorkspace): Promise<Workspace> {
    const [workspace] = await db.insert(workspaces).values(insertWorkspace).returning();
    return workspace;
  }

  // Papers
  async getPaper(id: string): Promise<Paper | undefined> {
    const [paper] = await db.select().from(papers).where(eq(papers.id, id));
    return paper || undefined;
  }

  async getPapersByWorkspace(workspaceId: string): Promise<Paper[]> {
    return db.select().from(papers).where(eq(papers.workspaceId, workspaceId)).orderBy(desc(papers.createdAt));
  }

  async searchPapers(query: string): Promise<Paper[]> {
    return db
      .select()
      .from(papers)
      .where(
        or(
          ilike(papers.title, `%${query}%`),
          ilike(papers.abstract, `%${query}%`)
        )
      )
      .orderBy(desc(papers.createdAt))
      .limit(50);
  }

  async createPaper(insertPaper: InsertPaper): Promise<Paper> {
    const [paper] = await db.insert(papers).values(insertPaper).returning();
    return paper;
  }

  // Agent Logs
  async getAgentLogsByPaper(paperId: string): Promise<AgentLog[]> {
    return db.select().from(agentLogs).where(eq(agentLogs.paperId, paperId)).orderBy(desc(agentLogs.createdAt));
  }

  async createAgentLog(insertLog: InsertAgentLog): Promise<AgentLog> {
    const [log] = await db.insert(agentLogs).values(insertLog).returning();
    return log;
  }

  // Messages
  async getMessagesByPaper(paperId: string): Promise<Message[]> {
    return db.select().from(messages).where(eq(messages.paperId, paperId)).orderBy(messages.createdAt);
  }

  async getMessagesByWorkspace(workspaceId: string): Promise<Message[]> {
    return db.select().from(messages).where(eq(messages.workspaceId, workspaceId)).orderBy(messages.createdAt);
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db.insert(messages).values(insertMessage).returning();
    return message;
  }

  // Generated Documents
  async getDocument(id: string): Promise<GeneratedDocument | undefined> {
    const [doc] = await db.select().from(generatedDocuments).where(eq(generatedDocuments.id, id));
    return doc || undefined;
  }

  async getDocumentsByWorkspace(workspaceId: string): Promise<GeneratedDocument[]> {
    return db
      .select()
      .from(generatedDocuments)
      .where(eq(generatedDocuments.workspaceId, workspaceId))
      .orderBy(desc(generatedDocuments.updatedAt));
  }

  async createDocument(insertDoc: InsertGeneratedDocument): Promise<GeneratedDocument> {
    const [doc] = await db.insert(generatedDocuments).values(insertDoc).returning();
    return doc;
  }

  // Knowledge Graph
  async getNodesByWorkspace(workspaceId: string): Promise<KnowledgeNode[]> {
    return db.select().from(knowledgeNodes).where(eq(knowledgeNodes.workspaceId, workspaceId));
  }

  async getEdgesByWorkspace(workspaceId: string): Promise<KnowledgeEdge[]> {
    return db.select().from(knowledgeEdges).where(eq(knowledgeEdges.workspaceId, workspaceId));
  }

  async createNode(insertNode: InsertKnowledgeNode): Promise<KnowledgeNode> {
    const [node] = await db.insert(knowledgeNodes).values(insertNode).returning();
    return node;
  }

  async createEdge(insertEdge: InsertKnowledgeEdge): Promise<KnowledgeEdge> {
    const [edge] = await db.insert(knowledgeEdges).values(insertEdge).returning();
    return edge;
  }
}

export const storage = new DatabaseStorage();
