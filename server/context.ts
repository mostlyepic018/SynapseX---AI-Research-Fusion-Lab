import { getStorage } from "./storage";

// Build a compact context string summarizing workspace uploads (papers)
// Caps: up to 5 papers, ~800 chars per paper, ~3500 total chars
export async function buildWorkspacePapersContext(workspaceId?: string | null): Promise<string> {
  if (!workspaceId) return "";
  try {
    const storage = await getStorage();
    const papers = await storage.getPapersByWorkspace(workspaceId);
    if (!papers || papers.length === 0) return "";

    const maxPapers = 5;
    const maxCharsPer = 800;
    const maxTotal = 3500;
    const picked = papers.slice(0, maxPapers);
    const parts: string[] = [];
    parts.push("Workspace Uploads Summary:\n");
    for (const p of picked) {
      let chunk = `Title: ${p.title}`;
      if (p.year) chunk += ` (${p.year})`;
      if (p.url) chunk += `\nURL: ${p.url}`;
      if (p.abstract) chunk += `\nAbstract: ${p.abstract}`;
      if (p.content) {
        const body = p.content.replace(/\s+/g, ' ').slice(0, maxCharsPer);
        chunk += `\nExcerpt: ${body}${p.content.length > maxCharsPer ? '…' : ''}`;
      }
      parts.push(chunk);
      const joined = parts.join("\n\n");
      if (joined.length > maxTotal) {
        parts.pop();
        break;
      }
    }
    return parts.join("\n\n");
  } catch {
    return "";
  }
}
