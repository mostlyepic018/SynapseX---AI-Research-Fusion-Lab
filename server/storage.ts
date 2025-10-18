import type { IStorage } from "./storage.types";

let storageImpl: IStorage | null = null;

export async function getStorage(): Promise<IStorage> {
  if (storageImpl) return storageImpl;
  if (typeof process !== "undefined" && process.env.DATABASE_URL) {
    const { DatabaseStorage } = await import("./storage.db");
    storageImpl = new DatabaseStorage();
    console.log("Storage: using DatabaseStorage (Postgres)");
  } else {
    const { MemoryStorage } = await import("./storage.memory");
    storageImpl = new MemoryStorage();
    console.log("Storage: using MemoryStorage (in-memory)");
  }
  return storageImpl;
}

export type { IStorage } from "./storage.types";
