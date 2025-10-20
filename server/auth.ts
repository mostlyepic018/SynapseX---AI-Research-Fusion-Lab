import type { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import MemoryStore from "memorystore";
import { getDB, saveDB, nowISO } from "./sqlite";
import crypto from "node:crypto";

// Lightweight SQLite auth + action history module
// Keeps existing app storage intact while persisting users and actions.

// tables are initialized by sqlite.ts

function genId() {
  return crypto.randomBytes(16).toString("hex");
}

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const derivedKey = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, key) => (err ? reject(err) : resolve(key as Buffer)));
  });
  return `${salt.toString("hex")}:${derivedKey.toString("hex")}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, keyHex] = stored.split(":");
  if (!saltHex || !keyHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const derivedKey = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, key) => (err ? reject(err) : resolve(key as Buffer)));
  });
  return crypto.timingSafeEqual(Buffer.from(keyHex, "hex"), derivedKey);
}

export function setupSession(app: Express) {
  const Store = MemoryStore(session);
  const secret = process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex");
  app.use(
    session({
      secret,
      resave: false,
      saveUninitialized: false,
      store: new Store({ checkPeriod: 1000 * 60 * 60 }),
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: false, // set true when served over HTTPS
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      },
    })
  );
}

export function actionLogger() {
  return async (req: Request, _res: Response, next: NextFunction) => {
    // Skip logging auth endpoints to avoid noise
    if (!req.path.startsWith("/api")) return next();
    if (req.path.startsWith("/api/auth")) return next();
    const userId = (req.session as any)?.userId || null;
    try {
      const db = await getDB();
      const bodyStr = (() => {
        try {
          // do not log file buffers; keep it small
          const clone = JSON.parse(JSON.stringify(req.body ?? {}));
          const s = JSON.stringify(clone);
          return s.length > 4096 ? s.slice(0, 4096) + "…" : s;
        } catch { return null; }
      })();
      const stmt = db.prepare(`INSERT INTO user_actions (id, user_id, method, path, body, created_at) VALUES (?, ?, ?, ?, ?, ?)`);
      stmt.run([genId(), userId, req.method, req.path, bodyStr, nowISO()]);
      await saveDB(db);
    } catch (e) {
      // non-fatal
      console.warn("action log failed", e);
    }
    next();
  };
}

export function registerAuthRoutes(app: Express) {
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const db = await getDB();
      const { username, password, email } = req.body || {};
      if (!username || !password) return res.status(400).json({ error: "username and password are required" });
      const existing = db.exec(`SELECT id FROM users WHERE username = ?`, [username]);
      if (existing?.[0]?.values?.length) return res.status(409).json({ error: "username already exists" });
      const id = genId();
      const password_hash = await hashPassword(password);
      const stmt = db.prepare("INSERT INTO users (id, username, password, email, avatar_url, created_at) VALUES (?, ?, ?, ?, ?, ?)");
      stmt.run([id, username, password_hash, email || null, null, nowISO()]);
      await saveDB(db);
      (req.session as any).userId = id;
      const rows = db.exec("SELECT id, username, email, avatar_url, created_at FROM users WHERE id = ?", [id]);
      const row = rows[0]?.values?.[0];
      const user = row ? { id: row[0], username: row[1], email: row[2], avatar_url: row[3], created_at: row[4] } : null;
      res.json(user);
    } catch (e: any) {
      res.status(500).json({ error: e.message || "registration failed" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const db = await getDB();
      const { username, password } = req.body || {};
      if (!username || !password) return res.status(400).json({ error: "username and password are required" });
      const rows = db.exec("SELECT id, username, password, email, avatar_url, created_at FROM users WHERE username = ?", [username]);
      const r = rows[0]?.values?.[0];
      if (!r) return res.status(401).json({ error: "invalid credentials" });
      const ok = await verifyPassword(password, String(r[2]));
      if (!ok) return res.status(401).json({ error: "invalid credentials" });
      (req.session as any).userId = String(r[0]);
      const user = { id: String(r[0]), username: String(r[1]), email: r[3] as any, avatar_url: r[4] as any, created_at: String(r[5]) };
      res.json(user);
    } catch (e: any) {
      res.status(500).json({ error: e.message || "login failed" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy(() => {
      res.json({ ok: true });
    });
  });

  app.get("/api/auth/me", async (req: Request, res: Response) => {
    const userId = (req.session as any)?.userId;
    if (!userId) return res.status(200).json(null);
    const db = await getDB();
    const rows = db.exec("SELECT id, username, email, avatar_url, created_at FROM users WHERE id = ?", [userId]);
    const r = rows[0]?.values?.[0];
    const user = r ? { id: String(r[0]), username: String(r[1]), email: r[2] as any, avatar_url: r[3] as any, created_at: String(r[4]) } : null;
    return res.json(user);
  });

  app.get("/api/actions", async (req: Request, res: Response) => {
    const userId = (req.session as any)?.userId;
    if (!userId) return res.status(401).json({ error: "unauthorized" });
    const db = await getDB();
    const rs = db.exec("SELECT id, user_id, method, path, body, created_at FROM user_actions WHERE user_id = ? ORDER BY datetime(created_at) DESC LIMIT 200", [userId]);
  const values: any[] = (rs[0]?.values as any[]) || [];
  const rows = values.map((v: any[]) => ({ id: String(v[0]), userId: String(v[1]), method: String(v[2]), path: String(v[3]), body: v[4] as any, createdAt: String(v[5]) }));
    res.json(rows);
  });
}
