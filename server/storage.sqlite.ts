import { getDB, saveDB, nowISO } from "./sqlite";
import type { IStorage } from "./storage.types";
import type {
  User, InsertUser,
  Workspace, InsertWorkspace,
  Paper, InsertPaper,
  AgentLog, InsertAgentLog,
  Message, InsertMessage,
  GeneratedDocument, InsertGeneratedDocument,
  KnowledgeNode, InsertKnowledgeNode,
  KnowledgeEdge, InsertKnowledgeEdge,
  Task, InsertTask,
  WorkspaceMember, InsertWorkspaceMember,
  CanvasDocument, InsertCanvasDocument,
} from "../shared/schema";

// schema is initialized in sqlite.ts

function uid() { return Math.random().toString(36).slice(2, 10); }
function now() { return nowISO(); }

function parseJSON<T>(s: any): T | null {
  if (s == null) return null;
  try { return JSON.parse(String(s)); } catch { return null; }
}
function strJSON(v: any): string | null {
  if (v == null) return null;
  try { return JSON.stringify(v); } catch { return null; }
}

export class SqliteStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const db = await getDB();
    const rs = db.exec("SELECT * FROM users WHERE id = ?", [id]);
    const row = rs[0]?.values?.[0];
    if (!row) return undefined;
    return {
      id: String(row[0]), username: String(row[1]), password: String(row[2] ?? ""),
      email: (row[3] as any) ?? null, avatarUrl: (row[4] as any) ?? null,
      createdAt: new Date(String(row[5])),
    } as any;
  }
  async getUserByUsername(username: string): Promise<User | undefined> {
    const db = await getDB();
    const rs = db.exec("SELECT * FROM users WHERE username = ?", [username]);
    const row = rs[0]?.values?.[0];
    if (!row) return undefined;
    return {
      id: String(row[0]), username: String(row[1]), password: String(row[2] ?? ""),
      email: (row[3] as any) ?? null, avatarUrl: (row[4] as any) ?? null,
      createdAt: new Date(String(row[5])),
    } as any;
  }
  async createUser(user: InsertUser): Promise<User> {
    const id = uid();
    const db = await getDB();
    db.prepare("INSERT INTO users (id, username, password, email, avatar_url, created_at) VALUES (?, ?, ?, ?, ?, ?)")
      .run([id, user.username, (user as any).password ?? "", (user as any).email ?? null, (user as any).avatarUrl ?? null, now()]);
    await saveDB(db);
    return (await this.getUser(id))!;
  }

  // Workspaces
  async getWorkspace(id: string): Promise<Workspace | undefined> {
    const db = await getDB();
    const rs = db.exec("SELECT * FROM workspaces WHERE id = ?", [id]);
    const row = rs[0]?.values?.[0];
    if (!row) return undefined;
    return { id: String(row[0]), name: String(row[1]), description: (row[2] as any) ?? null, ownerId: String(row[3]), createdAt: new Date(String(row[4])), updatedAt: new Date(String(row[5])) } as any;
  }
  async getWorkspacesByUser(userId: string): Promise<Workspace[]> {
    const db = await getDB();
    const rs = db.exec("SELECT * FROM workspaces WHERE owner_id = ? ORDER BY datetime(created_at) DESC", [userId]);
    const rows = rs[0]?.values || [];
    return (rows as any[]).map((r: any[]) => ({ id: String(r[0]), name: String(r[1]), description: (r[2] as any) ?? null, ownerId: String(r[3]), createdAt: new Date(String(r[4])), updatedAt: new Date(String(r[5])) }));
  }
  async createWorkspace(workspace: InsertWorkspace): Promise<Workspace> {
    const id = uid(); const t = now();
    const db = await getDB();
    db.prepare("INSERT INTO workspaces (id, name, description, owner_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)")
      .run([id, workspace.name, (workspace as any).description ?? null, workspace.ownerId, t, t]);
    await saveDB(db);
    return (await this.getWorkspace(id))!;
  }

  // Papers
  async getPaper(id: string): Promise<Paper | undefined> {
    const db = await getDB();
    const rs = db.exec("SELECT * FROM papers WHERE id = ?", [id]);
    const r = rs[0]?.values?.[0];
    if (!r) return undefined;
    return this.mapPaper(r);
  }
  async getPapersByWorkspace(workspaceId: string): Promise<Paper[]> {
    const db = await getDB();
    const rs = db.exec("SELECT * FROM papers WHERE workspace_id = ? ORDER BY datetime(created_at) DESC", [workspaceId]);
    const rows = rs[0]?.values || [];
    return (rows as any[]).map((r: any) => this.mapPaper(r));
  }
  async searchPapers(query: string): Promise<Paper[]> {
    const q = `%${query}%`;
    const db = await getDB();
    const rs = db.exec("SELECT * FROM papers WHERE title LIKE ? OR abstract LIKE ? ORDER BY datetime(created_at) DESC LIMIT 50", [q, q]);
    const rows = rs[0]?.values || [];
    return (rows as any[]).map((r: any) => this.mapPaper(r));
  }
  private mapPaper(r: any): Paper {
    return {
      id: String(r[0]), title: String(r[1]), abstract: (r[2] as any) ?? null,
      authors: parseJSON<string[]>(r[3]), year: (r[4] as any) ?? null,
      source: (r[5] as any) ?? null, sourceId: (r[6] as any) ?? null, url: (r[7] as any) ?? null, pdfUrl: (r[8] as any) ?? null,
      content: (r[9] as any) ?? null, sections: parseJSON<any>(r[10]),
      workspaceId: (r[11] as any) ?? null, uploadedBy: (r[12] as any) ?? null, createdAt: new Date(String(r[13])),
    } as any;
  }
  async createPaper(paper: InsertPaper): Promise<Paper> {
    const id = uid();
    const db = await getDB();
    db.prepare(`INSERT INTO papers (id, title, abstract, authors, year, source, source_id, url, pdf_url, content, sections, workspace_id, uploaded_by, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run([id, paper.title, (paper as any).abstract ?? null, strJSON((paper as any).authors) , (paper as any).year ?? null, (paper as any).source ?? null,
           (paper as any).sourceId ?? null, (paper as any).url ?? null, (paper as any).pdfUrl ?? null, (paper as any).content ?? null,
           strJSON((paper as any).sections), (paper as any).workspaceId ?? null, (paper as any).uploadedBy ?? null, now()]);
    await saveDB(db);
    return (await this.getPaper(id))!;
  }

  // Agent Logs
  async getAgentLogsByPaper(paperId: string): Promise<AgentLog[]> {
    const db = await getDB();
    const rs = db.exec("SELECT * FROM agent_logs WHERE paper_id = ? ORDER BY datetime(created_at) DESC", [paperId]);
    const rows = rs[0]?.values || [];
    return (rows as any[]).map((r: any[]) => ({ id: String(r[0]), agentType: String(r[1]), query: String(r[2]), response: String(r[3]), context: (r[4] as any) ?? null, paperId: (r[5] as any) ?? null, workspaceId: (r[6] as any) ?? null, userId: (r[7] as any) ?? null, createdAt: new Date(String(r[8])) } as any));
  }
  async createAgentLog(log: InsertAgentLog): Promise<AgentLog> {
    const id = uid();
    const db = await getDB();
    db.prepare("INSERT INTO agent_logs (id, agent_type, query, response, context, paper_id, workspace_id, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .run([id, log.agentType, log.query, log.response, (log as any).context ?? null, (log as any).paperId ?? null, (log as any).workspaceId ?? null, (log as any).userId ?? null, now()]);
    await saveDB(db);
    const rs = db.exec("SELECT * FROM agent_logs WHERE id = ?", [id]);
    const row = rs[0]?.values?.[0];
    return { id, agentType: String(row[1]), query: String(row[2]), response: String(row[3]), context: (row[4] as any) ?? null, paperId: (row[5] as any) ?? null, workspaceId: (row[6] as any) ?? null, userId: (row[7] as any) ?? null, createdAt: new Date(String(row[8])) } as any;
  }

  // Messages
  async getMessagesByPaper(paperId: string): Promise<Message[]> {
    const db = await getDB();
    const rs = db.exec("SELECT * FROM messages WHERE paper_id = ? ORDER BY datetime(created_at) ASC", [paperId]);
    const rows = rs[0]?.values || [];
    return (rows as any[]).map((r: any[]) => this.mapMessage(r));
  }
  async getMessagesByWorkspace(workspaceId: string): Promise<Message[]> {
    const db = await getDB();
    const rs = db.exec("SELECT * FROM messages WHERE workspace_id = ? ORDER BY datetime(created_at) ASC", [workspaceId]);
    const rows = rs[0]?.values || [];
    return (rows as any[]).map((r: any[]) => this.mapMessage(r));
  }
  private mapMessage(r: any[]): Message {
    return { id: String(r[0]), content: String(r[1]), role: String(r[2]), agentType: (r[3] as any) ?? null, paperId: (r[4] as any) ?? null, workspaceId: (r[5] as any) ?? null, userId: (r[6] as any) ?? null, createdAt: new Date(String(r[7])) } as any;
  }
  async createMessage(message: InsertMessage): Promise<Message> {
    const id = uid();
    const db = await getDB();
    db.prepare("INSERT INTO messages (id, content, role, agent_type, paper_id, workspace_id, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .run([id, message.content, message.role, (message as any).agentType ?? null, (message as any).paperId ?? null, (message as any).workspaceId ?? null, (message as any).userId ?? null, now()]);
    await saveDB(db);
    const rs = db.exec("SELECT * FROM messages WHERE id = ?", [id]);
    const row = rs[0]?.values?.[0];
    return this.mapMessage(row);
  }

  // Documents
  async getDocument(id: string): Promise<GeneratedDocument | undefined> {
    const db = await getDB();
    const rs = db.exec("SELECT * FROM generated_documents WHERE id = ?", [id]);
    const r = rs[0]?.values?.[0];
    if (!r) return undefined; return this.mapDoc(r);
  }
  async getDocumentsByWorkspace(workspaceId: string): Promise<GeneratedDocument[]> {
    const db = await getDB();
    const rs = db.exec("SELECT * FROM generated_documents WHERE workspace_id = ? ORDER BY datetime(updated_at) DESC", [workspaceId]);
    const rows = rs[0]?.values || [];
    return (rows as any[]).map((r: any) => this.mapDoc(r));
  }
  private mapDoc(r: any): GeneratedDocument { return { id: String(r[0]), title: String(r[1]), content: String(r[2]), version: Number(r[3]), workspaceId: (r[4] as any) ?? null, createdBy: (r[5] as any) ?? null, createdAt: new Date(String(r[6])), updatedAt: new Date(String(r[7])) } as any; }
  async createDocument(doc: InsertGeneratedDocument): Promise<GeneratedDocument> {
    const id = uid(); const t = now();
    const db = await getDB();
    db.prepare("INSERT INTO generated_documents (id, title, content, version, workspace_id, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .run([id, doc.title, doc.content, (doc as any).version ?? 1, (doc as any).workspaceId ?? null, (doc as any).createdBy ?? null, t, t]);
    await saveDB(db);
    return (await this.getDocument(id))!;
  }

  async updateDocument(id: string, updates: { title?: string; content?: string; bumpVersion?: boolean }): Promise<GeneratedDocument> {
    const db = await getDB();
    // Fetch current
    const cur = db.exec("SELECT * FROM generated_documents WHERE id = ?", [id])[0]?.values?.[0];
    if (!cur) throw new Error("Document not found");
    const current = this.mapDoc(cur);
    const nextVersion = updates.bumpVersion ? (current.version || 1) + 1 : current.version || 1;
    const newTitle = updates.title ?? current.title;
    const newContent = updates.content ?? current.content;
    // Save previous snapshot into versions table
    if (updates.bumpVersion) {
      const vid = uid();
      db.prepare("INSERT INTO generated_document_versions (id, document_id, version, title, content, created_at) VALUES (?, ?, ?, ?, ?, ?)")
        .run([vid, id, nextVersion, newTitle, newContent, now()]);
    }
    // Update main document
    db.prepare("UPDATE generated_documents SET title = ?, content = ?, version = ?, updated_at = ? WHERE id = ?")
      .run([newTitle, newContent, nextVersion, now(), id]);
    await saveDB(db);
    return (await this.getDocument(id))!;
  }

  async listDocumentVersions(documentId: string) {
    const db = await getDB();
    const rs = db.exec("SELECT * FROM generated_document_versions WHERE document_id = ? ORDER BY version DESC", [documentId]);
    const rows = rs[0]?.values || [];
    return (rows as any[]).map((r: any[]) => ({ id: String(r[0]), documentId: String(r[1]), version: Number(r[2]), title: String(r[3]), content: String(r[4]), createdAt: new Date(String(r[5])) } as any));
  }

  async createDocumentVersion(payload: any) {
    const id = uid();
    const db = await getDB();
    db.prepare("INSERT INTO generated_document_versions (id, document_id, version, title, content, created_at) VALUES (?, ?, ?, ?, ?, ?)")
      .run([id, payload.documentId, payload.version, payload.title, payload.content, now()]);
    await saveDB(db);
    const rs = db.exec("SELECT * FROM generated_document_versions WHERE id = ?", [id]);
    const r = rs[0]?.values?.[0];
    return { id, documentId: String(r[1]), version: Number(r[2]), title: String(r[3]), content: String(r[4]), createdAt: new Date(String(r[5])) } as any;
  }

  // Knowledge graph
  async getNodesByWorkspace(workspaceId: string): Promise<KnowledgeNode[]> {
    const db = await getDB();
    const rs = db.exec("SELECT * FROM knowledge_nodes WHERE workspace_id = ?", [workspaceId]);
    const rows = rs[0]?.values || [];
    return (rows as any[]).map((r: any[]) => ({ id: String(r[0]), type: String(r[1]), label: String(r[2]), data: parseJSON<any>(r[3]), workspaceId: (r[4] as any) ?? null, createdAt: new Date(String(r[5])) } as any));
  }
  async getEdgesByWorkspace(workspaceId: string): Promise<KnowledgeEdge[]> {
    const db = await getDB();
    const rs = db.exec("SELECT * FROM knowledge_edges WHERE workspace_id = ?", [workspaceId]);
    const rows = rs[0]?.values || [];
    return (rows as any[]).map((r: any[]) => ({ id: String(r[0]), sourceId: String(r[1]), targetId: String(r[2]), type: String(r[3]), label: (r[4] as any) ?? null, workspaceId: (r[5] as any) ?? null, createdAt: new Date(String(r[6])) } as any));
  }
  async createNode(node: InsertKnowledgeNode): Promise<KnowledgeNode> {
    const id = uid();
    const db = await getDB();
    db.prepare("INSERT INTO knowledge_nodes (id, type, label, data, workspace_id, created_at) VALUES (?, ?, ?, ?, ?, ?)")
      .run([id, node.type, node.label, strJSON((node as any).data), (node as any).workspaceId ?? null, now()]);
    await saveDB(db);
    const rs = db.exec("SELECT * FROM knowledge_nodes WHERE id = ?", [id]);
    const row = rs[0]?.values?.[0];
    return { id, type: String(row[1]), label: String(row[2]), data: parseJSON(row[3]), workspaceId: (row[4] as any) ?? null, createdAt: new Date(String(row[5])) } as any;
  }
  async createEdge(edge: InsertKnowledgeEdge): Promise<KnowledgeEdge> {
    const id = uid();
    const db = await getDB();
    db.prepare("INSERT INTO knowledge_edges (id, source_id, target_id, type, label, workspace_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run([id, edge.sourceId, edge.targetId, edge.type, (edge as any).label ?? null, (edge as any).workspaceId ?? null, now()]);
    await saveDB(db);
    const rs = db.exec("SELECT * FROM knowledge_edges WHERE id = ?", [id]);
    const row = rs[0]?.values?.[0];
    return { id, sourceId: String(row[1]), targetId: String(row[2]), type: String(row[3]), label: (row[4] as any) ?? null, workspaceId: (row[5] as any) ?? null, createdAt: new Date(String(row[6])) } as any;
  }

  // Tasks
  async getTask(id: string): Promise<Task | undefined> {
    const db = await getDB();
    const rs = db.exec("SELECT * FROM tasks WHERE id = ?", [id]);
    const r = rs[0]?.values?.[0];
    if (!r) return undefined; return this.mapTask(r);
  }
  async getTasksByWorkspace(workspaceId: string): Promise<Task[]> {
    const db = await getDB();
    const rs = db.exec("SELECT * FROM tasks WHERE workspace_id = ? ORDER BY datetime(created_at) DESC", [workspaceId]);
    const rows = rs[0]?.values || [];
    return (rows as any[]).map((r: any[]) => this.mapTask(r));
  }
  async getPendingTasks(workspaceId: string): Promise<Task[]> {
    const db = await getDB();
    const rs = db.exec("SELECT * FROM tasks WHERE workspace_id = ? AND status = 'pending' ORDER BY datetime(created_at) ASC", [workspaceId]);
    const rows = rs[0]?.values || [];
    return (rows as any[]).map((r: any[]) => this.mapTask(r));
  }
  private mapTask(r: any[]): Task { return { id: String(r[0]), title: String(r[1]), description: String(r[2]), agentType: String(r[3]) as any, priority: String(r[4]), status: String(r[5]) as any, result: (r[6] as any) ?? null, context: (r[7] as any) ?? null, workspaceId: String(r[8]), assignedBy: (r[9] as any) ?? null, paperId: (r[10] as any) ?? null, createdAt: new Date(String(r[11])), startedAt: r[12] ? new Date(String(r[12])) : null, completedAt: r[13] ? new Date(String(r[13])) : null } as any; }
  async createTask(task: InsertTask): Promise<Task> {
    const id = uid();
    const db = await getDB();
    db.prepare("INSERT INTO tasks (id, title, description, agent_type, priority, status, result, context, workspace_id, assigned_by, paper_id, created_at, started_at, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .run([id, task.title, task.description, task.agentType, (task as any).priority ?? 'medium', (task as any).status ?? 'pending', (task as any).result ?? null, (task as any).context ?? null, task.workspaceId, (task as any).assignedBy ?? null, (task as any).paperId ?? null, now(), null, null]);
    await saveDB(db);
    return (await this.getTask(id))!;
  }
  async updateTaskStatus(id: string, status: string, result?: string): Promise<Task> {
    const db = await getDB();
    db.prepare("UPDATE tasks SET status = ?, result = COALESCE(?, result) WHERE id = ?").run([status, result ?? null, id]);
    await saveDB(db);
    return (await this.getTask(id))!;
  }
  async updateTaskProgress(id: string, status: string, startedAt?: Date, completedAt?: Date): Promise<Task> {
    const db = await getDB();
    db.prepare("UPDATE tasks SET status = ?, started_at = COALESCE(?, started_at), completed_at = COALESCE(?, completed_at) WHERE id = ?")
      .run([status, startedAt ? startedAt.toISOString() : null, completedAt ? completedAt.toISOString() : null, id]);
    await saveDB(db);
    return (await this.getTask(id))!;
  }

  // Workspace Members
  async getWorkspaceMember(workspaceId: string, userId: string): Promise<WorkspaceMember | undefined> {
    const db = await getDB();
    const rs = db.exec("SELECT * FROM workspace_members WHERE workspace_id = ? AND user_id = ?", [workspaceId, userId]);
    const r = rs[0]?.values?.[0];
    if (!r) return undefined;
    return { id: String(r[0]), workspaceId: String(r[1]), userId: String(r[2]), role: String(r[3]), status: String(r[4]), joinedAt: new Date(String(r[5])) } as any;
  }
  async getWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
    const db = await getDB();
    const rs = db.exec("SELECT * FROM workspace_members WHERE workspace_id = ?", [workspaceId]);
    const rows = rs[0]?.values || [];
    return (rows as any[]).map((r: any[]) => ({ id: String(r[0]), workspaceId: String(r[1]), userId: String(r[2]), role: String(r[3]), status: String(r[4]), joinedAt: new Date(String(r[5])) } as any));
  }
  async createWorkspaceMember(member: InsertWorkspaceMember): Promise<WorkspaceMember> {
    const id = uid();
    const db = await getDB();
    db.prepare("INSERT INTO workspace_members (id, workspace_id, user_id, role, status, joined_at) VALUES (?, ?, ?, ?, ?, ?)")
      .run([id, member.workspaceId, member.userId, (member as any).role ?? 'member', (member as any).status ?? 'online', now()]);
    await saveDB(db);
    return (await this.getWorkspaceMember(member.workspaceId, member.userId))!;
  }
  async updateMemberStatus(workspaceId: string, userId: string, status: string): Promise<WorkspaceMember> {
    const db = await getDB();
    db.prepare("UPDATE workspace_members SET status = ? WHERE workspace_id = ? AND user_id = ?").run([status, workspaceId, userId]);
    await saveDB(db);
    return (await this.getWorkspaceMember(workspaceId, userId))!;
  }

  // Canvas
  async getCanvasDocument(id: string): Promise<CanvasDocument | undefined> {
    const db = await getDB();
    const rs = db.exec("SELECT * FROM canvas_documents WHERE id = ?", [id]);
    const r = rs[0]?.values?.[0];
    if (!r) return undefined;
    return { id: String(r[0]), title: String(r[1]), content: String(r[2]), workspaceId: String(r[3]), lastEditedBy: (r[4] as any) ?? null, createdAt: new Date(String(r[5])), updatedAt: new Date(String(r[6])) } as any;
  }
  async getCanvasDocumentsByWorkspace(workspaceId: string): Promise<CanvasDocument[]> {
    const db = await getDB();
    const rs = db.exec("SELECT * FROM canvas_documents WHERE workspace_id = ? ORDER BY datetime(updated_at) DESC", [workspaceId]);
    const rows = rs[0]?.values || [];
    return (rows as any[]).map((r: any[]) => ({ id: String(r[0]), title: String(r[1]), content: String(r[2]), workspaceId: String(r[3]), lastEditedBy: (r[4] as any) ?? null, createdAt: new Date(String(r[5])), updatedAt: new Date(String(r[6])) } as any));
    }
  async createCanvasDocument(doc: InsertCanvasDocument): Promise<CanvasDocument> {
    const id = uid(); const t = now();
    const db = await getDB();
    db.prepare("INSERT INTO canvas_documents (id, title, content, workspace_id, last_edited_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run([id, doc.title, (doc as any).content ?? "", doc.workspaceId, (doc as any).lastEditedBy ?? null, t, t]);
    await saveDB(db);
    return (await this.getCanvasDocument(id))!;
  }
  async updateCanvasDocument(id: string, content: string, lastEditedBy: string): Promise<CanvasDocument> {
    const db = await getDB();
    db.prepare("UPDATE canvas_documents SET content = ?, last_edited_by = ?, updated_at = ? WHERE id = ?")
      .run([content, lastEditedBy ?? null, now(), id]);
    await saveDB(db);
    return (await this.getCanvasDocument(id))!;
  }
}
