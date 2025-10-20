import {
  users,
  workspaces,
  papers,
  agentLogs,
  messages,
  generatedDocuments,
  generatedDocumentVersions,
  knowledgeNodes,
  knowledgeEdges,
  tasks,
  workspaceMembers,
  canvasDocuments,
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
  type Task,
  type InsertTask,
  type WorkspaceMember,
  type InsertWorkspaceMember,
  type CanvasDocument,
  type InsertCanvasDocument,
} from "../shared/schema";
import { db } from "./db";
import { eq, desc, or, ilike, and } from "drizzle-orm";
import type { IStorage } from "./storage.types";

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
      .where(or(ilike(papers.title, `%${query}%`), ilike(papers.abstract, `%${query}%`)))
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

  async updateDocument(id: string, updates: { title?: string; content?: string; bumpVersion?: boolean }): Promise<GeneratedDocument> {
    const [current] = await db.select().from(generatedDocuments).where(eq(generatedDocuments.id, id));
    if (!current) throw new Error("Document not found");
    const nextVersion = updates.bumpVersion ? (current.version || 1) + 1 : current.version || 1;
    const title = updates.title ?? current.title;
    const content = updates.content ?? current.content;
    if (updates.bumpVersion) {
      await db.insert(generatedDocumentVersions).values({ documentId: id, version: nextVersion, title, content });
    }
    const [doc] = await db
      .update(generatedDocuments)
      .set({ title, content, version: nextVersion, updatedAt: new Date() })
      .where(eq(generatedDocuments.id, id))
      .returning();
    return doc;
  }

  async listDocumentVersions(documentId: string) {
    return db
      .select()
      .from(generatedDocumentVersions)
      .where(eq(generatedDocumentVersions.documentId, documentId))
      .orderBy(desc(generatedDocumentVersions.version));
  }

  async createDocumentVersion(payload: any) {
    const [row] = await db.insert(generatedDocumentVersions).values(payload).returning();
    return row;
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

  // Tasks
  async getTask(id: string): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task || undefined;
  }

  async getTasksByWorkspace(workspaceId: string): Promise<Task[]> {
    return db.select().from(tasks).where(eq(tasks.workspaceId, workspaceId)).orderBy(desc(tasks.createdAt));
  }

  async getPendingTasks(workspaceId: string): Promise<Task[]> {
    return db
      .select()
      .from(tasks)
      .where(and(eq(tasks.workspaceId, workspaceId), eq(tasks.status, 'pending')))
      .orderBy(tasks.createdAt);
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const [task] = await db.insert(tasks).values(insertTask).returning();
    return task;
  }

  async updateTaskStatus(id: string, status: string, result?: string): Promise<Task> {
    const updateData: any = { status };
    if (result !== undefined) updateData.result = result;
    
    const [task] = await db.update(tasks).set(updateData).where(eq(tasks.id, id)).returning();
    return task;
  }

  async updateTaskProgress(id: string, status: string, startedAt?: Date, completedAt?: Date): Promise<Task> {
    const updateData: any = { status };
    if (startedAt) updateData.startedAt = startedAt;
    if (completedAt) updateData.completedAt = completedAt;
    
    const [task] = await db.update(tasks).set(updateData).where(eq(tasks.id, id)).returning();
    return task;
  }

  // Workspace Members
  async getWorkspaceMember(workspaceId: string, userId: string): Promise<WorkspaceMember | undefined> {
    const [member] = await db
      .select()
      .from(workspaceMembers)
      .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)));
    return member || undefined;
  }

  async getWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
    return db.select().from(workspaceMembers).where(eq(workspaceMembers.workspaceId, workspaceId));
  }

  async createWorkspaceMember(insertMember: InsertWorkspaceMember): Promise<WorkspaceMember> {
    const [member] = await db.insert(workspaceMembers).values(insertMember).returning();
    return member;
  }

  async updateMemberStatus(workspaceId: string, userId: string, status: string): Promise<WorkspaceMember> {
    const [member] = await db
      .update(workspaceMembers)
      .set({ status })
      .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)))
      .returning();
    return member;
  }

  // Canvas Documents
  async getCanvasDocument(id: string): Promise<CanvasDocument | undefined> {
    const [canvas] = await db.select().from(canvasDocuments).where(eq(canvasDocuments.id, id));
    return canvas || undefined;
  }

  async getCanvasDocumentsByWorkspace(workspaceId: string): Promise<CanvasDocument[]> {
    return db
      .select()
      .from(canvasDocuments)
      .where(eq(canvasDocuments.workspaceId, workspaceId))
      .orderBy(desc(canvasDocuments.updatedAt));
  }

  async createCanvasDocument(insertCanvas: InsertCanvasDocument): Promise<CanvasDocument> {
    const [canvas] = await db.insert(canvasDocuments).values(insertCanvas).returning();
    return canvas;
  }

  async updateCanvasDocument(id: string, content: string, lastEditedBy: string): Promise<CanvasDocument> {
    const [canvas] = await db
      .update(canvasDocuments)
      .set({ content, lastEditedBy, updatedAt: new Date() })
      .where(eq(canvasDocuments.id, id))
      .returning();
    return canvas;
  }
}
