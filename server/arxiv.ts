// ArXiv API integration for paper search
import type { Paper } from "../shared/schema";
import { XMLParser } from "fast-xml-parser";

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  trimValues: true,
  // Decode escaped entities and preserve newlines
  processEntities: true,
});

function sanitizeText(input?: string | null): string | undefined {
  if (!input) return undefined;
  // Remove HTML tags that sometimes appear in arXiv summaries
  const noTags = input.replace(/<[^>]+>/g, "");
  return noTags.replace(/\s+/g, " ").trim();
}

function encodeArxivQuery(expr: string): string {
  // Encode fully, then convert spaces to '+', since arXiv examples use '+' as space separators
  // Keep other characters encoded for safety
  return encodeURIComponent(expr).replace(/%20/g, '+');
}

export interface ArxivQueryOptions {
  start?: number; // pagination start index
  maxResults?: number; // number of results
  sortBy?: "relevance" | "lastUpdatedDate" | "submittedDate";
  sortOrder?: "ascending" | "descending";
}

export async function searchArXiv(
  query: string,
  maxResults = 10,
  options: ArxivQueryOptions = {}
): Promise<Partial<Paper>[]> {
  try {
    const start = options.start ?? 0;
    const sortByParam = options.sortBy || "submittedDate";
    const sortOrderParam = options.sortOrder || "descending";
    const sortBy = sortByParam ? `&sortBy=${encodeURIComponent(sortByParam)}` : "";
    const sortOrder = sortOrderParam ? `&sortOrder=${encodeURIComponent(sortOrderParam)}` : "";
      const q = query.trim();
      // Stronger query: prefer exact phrase in title/abstract, and AND across tokens in title/abstract/all
      const tokens = q.split(/\s+/).filter(Boolean);
      const esc = (s: string) => s.replace(/"/g, '\\"');
      const phraseTi = `ti:\"${esc(q)}\"`;
      const phraseAbs = `abs:\"${esc(q)}\"`;
      const andTi = tokens.length > 1 ? tokens.map(t => `ti:${t}`).join(' AND ') : (tokens[0] ? `ti:${tokens[0]}` : '');
      const andAbs = tokens.length > 1 ? tokens.map(t => `abs:${t}`).join(' AND ') : (tokens[0] ? `abs:${tokens[0]}` : '');
      const andAll = tokens.length > 1 ? tokens.map(t => `all:${t}`).join(' AND ') : (tokens[0] ? `all:${tokens[0]}` : '');
      const rawParts = [phraseTi, phraseAbs, andTi, andAbs, andAll].filter(Boolean);
      const rawExpr = rawParts.length ? rawParts.join(' OR ') : `all:${q}`;
      const encodedQuery = encodeArxivQuery(rawExpr);
      const url = `https://export.arxiv.org/api/query?search_query=${encodedQuery}&start=${start}&max_results=${maxResults}${sortBy}${sortOrder}`;
    console.log(`[arXiv] URL: ${url}`);

    const response = await fetch(url, { headers: { "User-Agent": "SynapseXFusion/1.0 (+https://github.com)" } });
    if (!response.ok) {
      throw new Error(`ArXiv API request failed with status ${response.status}`);
    }

    const xmlText = await response.text();
    const parsed = xmlParser.parse(xmlText);
    const feed = parsed?.feed;
    const entries = Array.isArray(feed?.entry) ? feed.entry : (feed?.entry ? [feed.entry] : []);

    const papers: Partial<Paper>[] = entries.map((entry: any) => {
      const id: string = entry.id;
      const arxivId = id?.split("/").pop() || "";
      const authors = Array.isArray(entry.author)
        ? entry.author.map((a: any) => a.name).filter(Boolean)
        : entry.author?.name
          ? [entry.author.name]
          : [];
      const published = entry.published ? new Date(entry.published) : undefined;
      const pdfLink = (Array.isArray(entry.link) ? entry.link : [entry.link || []])
        .find((l: any) => l?.["@_type"] === "application/pdf" || l?.["@_title"] === "pdf");

      return {
        title: sanitizeText(entry.title),
        abstract: sanitizeText(entry.summary),
        authors,
        year: published ? published.getUTCFullYear() : null,
        source: "arxiv",
        sourceId: arxivId,
        url: id,
        pdfUrl: pdfLink?.["@_href"] || (arxivId ? `https://arxiv.org/pdf/${arxivId}.pdf` : undefined),
      } satisfies Partial<Paper>;
    });

    return papers;
  } catch (error) {
    console.error("ArXiv search error:", error);
    return [];
  }
}

export async function fetchArxivById(arxivId: string): Promise<Partial<Paper> | null> {
  try {
  const url = `https://export.arxiv.org/api/query?id_list=${encodeURIComponent(arxivId)}`;
  console.log(`[arXiv] Fetch by ID URL: ${url}`);
    const response = await fetch(url, { headers: { "User-Agent": "SynapseXFusion/1.0 (+https://github.com)" } });
    if (!response.ok) throw new Error(`ArXiv API request failed with status ${response.status}`);
    const xmlText = await response.text();
    const parsed = xmlParser.parse(xmlText);
    const entry = parsed?.feed?.entry;
    if (!entry) return null;

    const id: string = entry.id || `https://arxiv.org/abs/${arxivId}`;
    const authors = Array.isArray(entry.author)
      ? entry.author.map((a: any) => a.name).filter(Boolean)
      : entry.author?.name
        ? [entry.author.name]
        : [];
    const published = entry.published ? new Date(entry.published) : undefined;
    const pdfLink = (Array.isArray(entry.link) ? entry.link : [entry.link || []])
      .find((l: any) => l?.["@_type"] === "application/pdf" || l?.["@_title"] === "pdf");

    return {
      title: sanitizeText(entry.title),
      abstract: sanitizeText(entry.summary),
      authors,
      year: published ? published.getUTCFullYear() : null,
      source: "arxiv",
      sourceId: arxivId,
      url: id,
      pdfUrl: pdfLink?.["@_href"] || (arxivId ? `https://arxiv.org/pdf/${arxivId}.pdf` : undefined),
    } satisfies Partial<Paper>;
  } catch (error) {
    console.error("ArXiv fetch by id error:", error);
    return null;
  }
}
