// ArXiv API integration for paper search
import type { Paper } from "@shared/schema";

interface ArXivEntry {
  id: string;
  title: string;
  summary: string;
  authors: Array<{ name: string }>;
  published: string;
  link: Array<{ href: string; title?: string }>;
}

export async function searchArXiv(query: string, maxResults = 10): Promise<Partial<Paper>[]> {
  try {
    const encodedQuery = encodeURIComponent(query);
    const url = `http://export.arxiv.org/api/query?search_query=all:${encodedQuery}&start=0&max_results=${maxResults}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("ArXiv API request failed");
    }

    const xmlText = await response.text();
    
    // Parse XML response (basic parsing)
    const papers: Partial<Paper>[] = [];
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
    const matches = xmlText.matchAll(entryRegex);

    for (const match of matches) {
      const entry = match[1];
      
      const titleMatch = entry.match(/<title>(.*?)<\/title>/);
      const summaryMatch = entry.match(/<summary>(.*?)<\/summary>/);
      const idMatch = entry.match(/<id>(.*?)<\/id>/);
      const publishedMatch = entry.match(/<published>(.*?)<\/published>/);
      
      const authorMatches = entry.matchAll(/<name>(.*?)<\/name>/g);
      const authors = Array.from(authorMatches).map(m => m[1].trim());

      if (titleMatch && summaryMatch && idMatch) {
        const arxivId = idMatch[1].split('/').pop() || "";
        const year = publishedMatch ? new Date(publishedMatch[1]).getFullYear() : null;

        papers.push({
          title: titleMatch[1].trim().replace(/\s+/g, ' '),
          abstract: summaryMatch[1].trim().replace(/\s+/g, ' '),
          authors,
          year,
          source: "arxiv",
          sourceId: arxivId,
          url: idMatch[1],
          pdfUrl: `https://arxiv.org/pdf/${arxivId}.pdf`,
        });
      }
    }

    return papers;
  } catch (error) {
    console.error("ArXiv search error:", error);
    return [];
  }
}
