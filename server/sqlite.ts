import initSqlJs, { type Database } from "sql.js";
import fs from "node:fs";
import path from "node:path";

const dataDir = path.resolve(process.cwd(), ".data");
const dbFile = path.join(dataDir, "app.sqlite");

let dbPromise: Promise<Database> | null = null;

async function ensureDir(p: string) {
  await fs.promises.mkdir(p, { recursive: true }).catch(() => {});
}

export async function getDB(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const SQL = await initSqlJs({});
      await ensureDir(dataDir);
      let db: Database;
      if (fs.existsSync(dbFile)) {
        const filebuffer = await fs.promises.readFile(dbFile);
        db = new SQL.Database(filebuffer);
      } else {
        db = new SQL.Database();
      }
      // Pragmas and schema
      db.run("PRAGMA journal_mode = WAL;");
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          username TEXT NOT NULL UNIQUE,
          password TEXT,
          email TEXT,
          avatar_url TEXT,
          created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS user_actions (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          method TEXT NOT NULL,
          path TEXT NOT NULL,
          body TEXT,
          created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS workspaces (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          owner_id TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS papers (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          abstract TEXT,
          authors TEXT,
          year INTEGER,
          source TEXT,
          source_id TEXT,
          url TEXT,
          pdf_url TEXT,
          content TEXT,
          sections TEXT,
          workspace_id TEXT,
          uploaded_by TEXT,
          created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS agent_logs (
          id TEXT PRIMARY KEY,
          agent_type TEXT NOT NULL,
          query TEXT NOT NULL,
          response TEXT NOT NULL,
          context TEXT,
          paper_id TEXT,
          workspace_id TEXT,
          user_id TEXT,
          created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS messages (
          id TEXT PRIMARY KEY,
          content TEXT NOT NULL,
          role TEXT NOT NULL,
          agent_type TEXT,
          paper_id TEXT,
          workspace_id TEXT,
          user_id TEXT,
          created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS generated_documents (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          version INTEGER NOT NULL,
          workspace_id TEXT,
          created_by TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS generated_document_versions (
          id TEXT PRIMARY KEY,
          document_id TEXT NOT NULL,
          version INTEGER NOT NULL,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS knowledge_nodes (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL,
          label TEXT NOT NULL,
          data TEXT,
          workspace_id TEXT,
          created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS knowledge_edges (
          id TEXT PRIMARY KEY,
          source_id TEXT NOT NULL,
          target_id TEXT NOT NULL,
          type TEXT NOT NULL,
          label TEXT,
          workspace_id TEXT,
          created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS tasks (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          agent_type TEXT NOT NULL,
          priority TEXT NOT NULL,
          status TEXT NOT NULL,
          result TEXT,
          context TEXT,
          workspace_id TEXT NOT NULL,
          assigned_by TEXT,
          paper_id TEXT,
          created_at TEXT NOT NULL,
          started_at TEXT,
          completed_at TEXT
        );
        CREATE TABLE IF NOT EXISTS workspace_members (
          id TEXT PRIMARY KEY,
          workspace_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          role TEXT NOT NULL,
          status TEXT NOT NULL,
          joined_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS canvas_documents (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          workspace_id TEXT NOT NULL,
          last_edited_by TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);
      await saveDB(db);
      return db;
    })();
  }
  return dbPromise;
}

export async function saveDB(db?: Database) {
  const database = db || (await dbPromise!);
  const data = database.export();
  const buffer = Buffer.from(data);
  await ensureDir(dataDir);
  await fs.promises.writeFile(dbFile, buffer);
}

export function nowISO() { return new Date().toISOString(); }
