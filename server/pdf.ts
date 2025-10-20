import * as pdfParseNs from "pdf-parse";
const pdfParse: (dataBuffer: Buffer) => Promise<{ text: string }> = (pdfParseNs as any).default || (pdfParseNs as any);

// Extract text content from a PDF buffer
export async function extractPdfText(buffer: Buffer): Promise<string> {
  const result = await pdfParse(buffer);
  // Normalize whitespace a bit
  return (result.text || "").replace(/[\t\r]+/g, " ").replace(/\s+\n/g, "\n").trim();
}

// Fetch a remote URL into a Buffer
export async function fetchToBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// Very simple HTML-to-text fallback when a non-PDF page is provided
export function htmlToText(html: string): string {
  // Remove scripts/styles
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<\/?(br|p|div|h[1-6]|li|ul|ol|section|article)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
  return cleaned.split("\n").map(s => s.trim()).filter(Boolean).join("\n");
}

// Naive sectionizer for typical research paper headings
export function splitIntoSections(text: string) {
  const sections: Record<string, string> = {};
  const headings = ["abstract", "introduction", "method", "methodology", "experiments", "results", "discussion", "conclusion", "references"];
  const lines = text.split(/\n+/);
  let current = "body";
  sections[current] = "";
  for (const line of lines) {
    const hit = headings.find(h => {
      const exact = new RegExp(`^\s*(?:\d+\.?\s*)?(?:${h}|${h}s)\s*$`, 'i');
      return exact.test(line);
    });
    if (hit) {
      current = hit;
      if (!sections[current]) sections[current] = "";
      continue;
    }
    sections[current] = (sections[current] || "") + (sections[current] ? "\n" : "") + line;
  }
  return sections;
}
