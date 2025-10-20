import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Workspaces for organizing research projects
export const workspaces = pgTable("workspaces", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  ownerId: varchar("owner_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Research papers
export const papers = pgTable("papers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  abstract: text("abstract"),
  authors: text("authors").array(),
  year: integer("year"),
  source: text("source"), // 'arxiv', 'semantic_scholar', 'uploaded'
  sourceId: text("source_id"), // external ID from ArXiv, etc
  url: text("url"),
  pdfUrl: text("pdf_url"),
  content: text("content"), // Full text content
  sections: jsonb("sections"), // Parsed sections as JSON
  workspaceId: varchar("workspace_id").references(() => workspaces.id),
  uploadedBy: varchar("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Agent conversation logs
export const agentLogs = pgTable("agent_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentType: text("agent_type").notNull(), // 'nlp', 'reasoning', 'data', 'cv', 'critic', 'retrieval'
  query: text("query").notNull(),
  response: text("response").notNull(),
  context: text("context"),
  paperId: varchar("paper_id").references(() => papers.id),
  workspaceId: varchar("workspace_id").references(() => workspaces.id),
  userId: varchar("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Chat messages (for chat-with-paper and team workspace)
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  content: text("content").notNull(),
  role: text("role").notNull(), // 'user', 'agent'
  agentType: text("agent_type"), // if role is 'agent'
  paperId: varchar("paper_id").references(() => papers.id),
  workspaceId: varchar("workspace_id").references(() => workspaces.id),
  userId: varchar("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Generated papers/documents
export const generatedDocuments = pgTable("generated_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  content: text("content").notNull(), // Markdown content
  version: integer("version").notNull().default(1),
  workspaceId: varchar("workspace_id").references(() => workspaces.id),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Version history for generated documents
export const generatedDocumentVersions = pgTable("generated_document_versions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  documentId: varchar("document_id").notNull().references(() => generatedDocuments.id),
  version: integer("version").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(), // Markdown snapshot
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Knowledge graph nodes
export const knowledgeNodes = pgTable("knowledge_nodes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(), // 'user', 'agent', 'paper', 'dataset', 'concept'
  label: text("label").notNull(),
  data: jsonb("data"), // Additional metadata
  workspaceId: varchar("workspace_id").references(() => workspaces.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Knowledge graph edges
export const knowledgeEdges = pgTable("knowledge_edges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sourceId: varchar("source_id").notNull().references(() => knowledgeNodes.id),
  targetId: varchar("target_id").notNull().references(() => knowledgeNodes.id),
  type: text("type").notNull(), // 'reasoning', 'validation', 'citation', 'collaboration'
  label: text("label"),
  workspaceId: varchar("workspace_id").references(() => workspaces.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Tasks for agent assignment
export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  agentType: text("agent_type").notNull(), // 'nlp', 'reasoning', 'data', 'cv', 'critic', 'retrieval'
  priority: text("priority").notNull().default('medium'), // 'low', 'medium', 'high', 'urgent'
  status: text("status").notNull().default('pending'), // 'pending', 'in_progress', 'completed', 'failed'
  result: text("result"), // Agent's response/output
  context: text("context"), // Additional context for the task
  workspaceId: varchar("workspace_id").notNull().references(() => workspaces.id),
  assignedBy: varchar("assigned_by").references(() => users.id),
  paperId: varchar("paper_id").references(() => papers.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
});

// Workspace members
export const workspaceMembers = pgTable("workspace_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workspaceId: varchar("workspace_id").notNull().references(() => workspaces.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  role: text("role").notNull().default('member'), // 'owner', 'admin', 'member'
  status: text("status").notNull().default('online'), // 'online', 'offline', 'away'
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

// Canvas documents for collaborative work
export const canvasDocuments = pgTable("canvas_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  content: text("content").notNull(), // Collaborative canvas content
  workspaceId: varchar("workspace_id").notNull().references(() => workspaces.id),
  lastEditedBy: varchar("last_edited_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  workspaces: many(workspaces),
  papers: many(papers),
  messages: many(messages),
}));

export const workspacesRelations = relations(workspaces, ({ one, many }) => ({
  owner: one(users, {
    fields: [workspaces.ownerId],
    references: [users.id],
  }),
  papers: many(papers),
  messages: many(messages),
  agentLogs: many(agentLogs),
}));

export const papersRelations = relations(papers, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [papers.workspaceId],
    references: [workspaces.id],
  }),
  uploader: one(users, {
    fields: [papers.uploadedBy],
    references: [users.id],
  }),
  messages: many(messages),
  agentLogs: many(agentLogs),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertWorkspaceSchema = createInsertSchema(workspaces).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPaperSchema = createInsertSchema(papers).omit({
  id: true,
  createdAt: true,
});

export const insertAgentLogSchema = createInsertSchema(agentLogs).omit({
  id: true,
  createdAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export const insertGeneratedDocumentSchema = createInsertSchema(generatedDocuments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertGeneratedDocumentVersionSchema = createInsertSchema(generatedDocumentVersions).omit({
  id: true,
  createdAt: true,
});

export const insertKnowledgeNodeSchema = createInsertSchema(knowledgeNodes).omit({
  id: true,
  createdAt: true,
});

export const insertKnowledgeEdgeSchema = createInsertSchema(knowledgeEdges).omit({
  id: true,
  createdAt: true,
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  startedAt: true,
  completedAt: true,
});

export const insertWorkspaceMemberSchema = createInsertSchema(workspaceMembers).omit({
  id: true,
  joinedAt: true,
});

export const insertCanvasDocumentSchema = createInsertSchema(canvasDocuments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertWorkspace = z.infer<typeof insertWorkspaceSchema>;
export type Workspace = typeof workspaces.$inferSelect;

export type InsertPaper = z.infer<typeof insertPaperSchema>;
export type Paper = typeof papers.$inferSelect;

export type InsertAgentLog = z.infer<typeof insertAgentLogSchema>;
export type AgentLog = typeof agentLogs.$inferSelect;

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

export type InsertGeneratedDocument = z.infer<typeof insertGeneratedDocumentSchema>;
export type GeneratedDocument = typeof generatedDocuments.$inferSelect;

export type InsertGeneratedDocumentVersion = z.infer<typeof insertGeneratedDocumentVersionSchema>;
export type GeneratedDocumentVersion = typeof generatedDocumentVersions.$inferSelect;

export type InsertKnowledgeNode = z.infer<typeof insertKnowledgeNodeSchema>;
export type KnowledgeNode = typeof knowledgeNodes.$inferSelect;

export type InsertKnowledgeEdge = z.infer<typeof insertKnowledgeEdgeSchema>;
export type KnowledgeEdge = typeof knowledgeEdges.$inferSelect;

export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;

export type InsertWorkspaceMember = z.infer<typeof insertWorkspaceMemberSchema>;
export type WorkspaceMember = typeof workspaceMembers.$inferSelect;

export type InsertCanvasDocument = z.infer<typeof insertCanvasDocumentSchema>;
export type CanvasDocument = typeof canvasDocuments.$inferSelect;

// Agent types
export const AGENT_TYPES = {
  NLP: 'nlp',
  REASONING: 'reasoning',
  DATA: 'data',
  CV: 'cv',
  CRITIC: 'critic',
  RETRIEVAL: 'retrieval',
} as const;

export type AgentType = typeof AGENT_TYPES[keyof typeof AGENT_TYPES];
