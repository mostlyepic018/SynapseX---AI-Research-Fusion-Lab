// Lightweight Semantic Scholar integration for related research
// Docs: https://api.semanticscholar.org/api-docs/graph
import type { Paper } from "../shared/schema";

interface S2Author { name?: string }
interface S2Paper {
  paperId?: string;
  title?: string;
  abstract?: string;
  year?: number;
  url?: string;
  authors?: S2Author[];
  externalIds?: Record<string, string>;
}

function sanitize(text?: string | null): string | undefined {
  if (!text) return undefined;
  return text.replace(/\s+/g, " ").trim();
}

export async function searchSemanticScholar(query: string, limit = 8): Promise<Partial<Paper>[]> {
  const endpoint = new URL("https://api.semanticscholar.org/graph/v1/paper/search");
  endpoint.searchParams.set("query", query);
  endpoint.searchParams.set("limit", String(limit));
  endpoint.searchParams.set("fields", [
    "title",
    "abstract",
    "year",
    "url",
    "authors.name",
    "externalIds",
  ].join(","));

  try {
    const res = await fetch(endpoint.toString(), {
      headers: { "User-Agent": "SynapseXFusion/1.0 (+https://github.com)" },
    });
    if (!res.ok) throw new Error(`S2 HTTP ${res.status}`);
    const json = await res.json();
    const data: S2Paper[] = Array.isArray(json?.data) ? json.data : [];
    const mapped = data.map((p): Partial<Paper> => ({
      title: sanitize(p.title),
      abstract: sanitize(p.abstract),
      authors: (p.authors || []).map(a => a.name!).filter(Boolean),
      year: p.year ?? null,
      source: "semantic_scholar",
      sourceId: p.paperId || p.externalIds?.ArXiv || p.externalIds?.DOI || undefined,
      url: p.url,
      pdfUrl: undefined,
    }));
    // Sort newest first when year info is available
    return mapped.sort((a: any, b: any) => {
      const ay = a?.year || 0;
      const by = b?.year || 0;
      return by - ay;
    });
  } catch (err) {
    console.warn("Semantic Scholar search failed (falling back)", err);
    return [];
  }
}
