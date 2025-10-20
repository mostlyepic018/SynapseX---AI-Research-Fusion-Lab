import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Workspace selection helpers
const WS_STORAGE_KEY = 'workspaceId';

export function getWorkspaceId(): string {
  try {
    const url = new URL(window.location.href);
    const ws = url.searchParams.get('ws');
    if (ws) {
      localStorage.setItem(WS_STORAGE_KEY, ws);
      return ws;
    }
  } catch {}
  try {
    const stored = localStorage.getItem(WS_STORAGE_KEY);
    if (stored) return stored;
  } catch {}
  return 'synx-default';
}

export function setWorkspaceId(id: string) {
  try { localStorage.setItem(WS_STORAGE_KEY, id); } catch {}
}
