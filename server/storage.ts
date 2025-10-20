import type { IStorage } from "./storage.types";

let storageImpl: IStorage | null = null;

export async function getStorage(): Promise<IStorage> {
  if (storageImpl) return storageImpl;
  if (typeof process !== "undefined" && process.env.DATABASE_URL) {
    const { DatabaseStorage } = await import("./storage.db");
    storageImpl = new DatabaseStorage();
    console.log("Storage: using DatabaseStorage (Postgres)");
  } else {
    try {
      const { SqliteStorage } = await import("./storage.sqlite");
      storageImpl = new SqliteStorage();
      console.log("Storage: using SqliteStorage (SQLite)");
    } catch (e) {
      const { MemoryStorage } = await import("./storage.memory");
      storageImpl = new MemoryStorage();
      console.warn("Storage: falling back to MemoryStorage (in-memory)");
    }
  }
  return storageImpl;
}

export type { IStorage } from "./storage.types";
