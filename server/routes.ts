import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { getStorage } from "./storage";
import { queryAgent, analyzeDocument, generateSummary, type AgentRole } from "./gemini";
import { queueManager } from "./task-queue";
import { z } from "zod";
import multer from "multer";
import { extractPdfText, fetchToBuffer, htmlToText, splitIntoSections } from "./pdf";
import { buildWorkspacePapersContext } from "./context";

export async function registerRoutes(app: Express): Promise<Server> {
  const storage = await getStorage();
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });
  // Health checks
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });
  app.get('/api/health/ai', (_req, res) => {
    const hasKey = !!process.env.GEMINI_API_KEY;
    res.json({ status: hasKey ? 'ok' : 'missing_key' });
  });
  // Agent endpoints
  app.post("/api/agents/ask", async (req, res) => {
    try {
      const { role, query, context, paperId, workspaceId } = req.body;
      
      if (!role || !query) {
        return res.status(400).json({ error: "Role and query are required" });
      }

      const response = await queryAgent({ role, query, context });

      // Log the agent interaction
      await storage.createAgentLog({
        agentType: role,
        query,
        response,
        context: context || null,
        paperId: paperId || null,
        workspaceId: workspaceId || null,
        userId: null,
      });

      res.json({ agent: role, response });
    } catch (error: any) {
      console.error("Agent query error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Paper search endpoint - searches both local database and ArXiv
  app.get("/api/papers/search", async (req, res) => {
    try {
      const { q, start, max, sortBy, sortOrder } = req.query as any;
      
      if (!q || typeof q !== "string") {
        return res.status(400).json({ error: "Query parameter 'q' is required" });
      }

      // Search local database first
      const localPapers = await storage.searchPapers(q);

  // Also search external sources: ArXiv + Semantic Scholar
  const { searchArXiv } = await import("./arxiv");
  const { searchSemanticScholar } = await import("./semantic-scholar");
      // Default to latest submissions first unless explicitly asked for relevance
      const effectiveSortBy = typeof sortBy === 'string' ? (sortBy as any) : 'submittedDate';
      const effectiveSortOrder = typeof sortOrder === 'string' ? (sortOrder as any) : 'descending';
      const arxivResults = await searchArXiv(q, Number(max) || 10, {
        start: Number(start) || 0,
        sortBy: effectiveSortBy,
        sortOrder: effectiveSortOrder,
      });
      const s2Results = await searchSemanticScholar(q, Number(max) || 10);

      // Combine results (local papers first, then ArXiv)
      const arxivItems = arxivResults.map(paper => ({
        id: `arxiv-${paper.sourceId || Math.random().toString(36).substring(7)}`,
        ...paper,
        workspaceId: null,
        uploadedBy: null,
        content: null,
        sections: null,
        createdAt: new Date(),
      } as any));

      const s2Items = s2Results.map(paper => ({
        id: `s2-${paper.sourceId || Math.random().toString(36).substring(7)}`,
        ...paper,
        workspaceId: null,
        uploadedBy: null,
        content: null,
        sections: null,
        createdAt: new Date(),
      } as any));

      // Preserve requested order: if date-based sort, sort newest first across all sources; otherwise keep relevance
      let combinedResults: any[];
      const sortParam = effectiveSortBy;
      const effectiveMax = Number(max) || 10;
      if (sortParam === 'submittedDate' || sortParam === 'lastUpdatedDate') {
        combinedResults = [...localPapers, ...arxivItems, ...s2Items].sort((a: any, b: any) => {
          const aDate = a?.year ? new Date(`${a.year}-12-31`).getTime() : (a?.createdAt ? new Date(a.createdAt).getTime() : 0);
          const bDate = b?.year ? new Date(`${b.year}-12-31`).getTime() : (b?.createdAt ? new Date(b.createdAt).getTime() : 0);
          return bDate - aDate; // descending
        }).slice(0, effectiveMax);
      } else {
        // Relevance: combine all, score, then sort by score desc
        combinedResults = [...arxivItems, ...s2Items, ...localPapers];
  const queryLower = (typeof q === 'string' ? q : String(q ?? '')).toLowerCase();
  const qTokens: Set<string> = new Set(queryLower.split(/\W+/).filter((w: string) => w.length > 2));
        const score = (p: any) => {
          const title = String(p.title || '').toLowerCase();
          const abstract = String(p.abstract || '').toLowerCase();
          const textTokens: Set<string> = new Set((title + ' ' + abstract).split(/\W+/).filter((w: string) => w.length > 2));
          let overlap = 0;
          qTokens.forEach((t: string) => { if (textTokens.has(t)) overlap++; });
          const jaccard = qTokens.size ? overlap / new Set<string>([...qTokens, ...textTokens]).size : 0;
          const exactTitleBoost = title.includes(queryLower) ? 0.5 : 0;
          const startsWithBoost = title.startsWith(queryLower) ? 0.25 : 0;
          const tokenBoost = overlap * 0.1;
          return jaccard + exactTitleBoost + startsWithBoost + tokenBoost;
        };
        combinedResults = combinedResults
          .map(p => ({ ...p, _score: score(p) }))
          .sort((a, b) => {
            const diff = (b._score ?? 0) - (a._score ?? 0);
            if (Math.abs(diff) > 1e-9) return diff;
            // Tie-breaker: newer first
            const aDate = a?.year ? new Date(`${a.year}-12-31`).getTime() : (a?.createdAt ? new Date(a.createdAt).getTime() : 0);
            const bDate = b?.year ? new Date(`${b.year}-12-31`).getTime() : (b?.createdAt ? new Date(b.createdAt).getTime() : 0);
            return bDate - aDate;
          })
          .slice(0, effectiveMax)
          .map(({ _score, ...rest }) => rest);
      }

      // Deduplicate by normalized title + sourceId
      const seen = new Set<string>();
      combinedResults = combinedResults.filter((p: any) => {
        const normTitle = (p.title || '').toLowerCase().replace(/\s+/g, ' ').trim();
        const key = `${p.source || 'local'}:${p.sourceId || ''}:${normTitle}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

  res.json(combinedResults);
    } catch (error: any) {
      console.error("Paper search error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Fetch a single paper by ArXiv ID (external only, not stored)
  app.get("/api/papers/arxiv/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { fetchArxivById } = await import("./arxiv");
      const paper = await fetchArxivById(id);
      if (!paper) return res.status(404).json({ error: "ArXiv paper not found" });
      res.json({
        id: `arxiv-${id}`,
        ...paper,
        workspaceId: null,
        uploadedBy: null,
        content: null,
        sections: null,
        createdAt: new Date(),
      });
    } catch (error: any) {
      console.error("Fetch arXiv paper error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get papers by workspace
  app.get("/api/papers/workspace/:workspaceId", async (req, res) => {
    try {
      const { workspaceId } = req.params;
      const papers = await storage.getPapersByWorkspace(workspaceId);
      res.json(papers);
    } catch (error: any) {
      console.error("Get papers error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Upload/create paper
  app.post("/api/papers/upload", async (req, res) => {
    try {
      const { title, abstract, authors, url, workspaceId } = req.body;

      if (!title) {
        return res.status(400).json({ error: "Title is required" });
      }

      const paper = await storage.createPaper({
        title,
        abstract: abstract || null,
        authors: authors || null,
        year: null,
        source: "uploaded",
        sourceId: null,
        url: url || null,
        pdfUrl: null,
        content: null,
        sections: null,
        workspaceId: workspaceId || null,
        uploadedBy: null,
      });

      // Notify workspace listeners
      if (paper.workspaceId) {
        broadcastToWorkspace(paper.workspaceId, {
          type: 'paper_added',
          paper,
          timestamp: new Date().toISOString(),
        });
      }

      res.json(paper);
    } catch (error: any) {
      console.error("Paper upload error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Ingest paper by URL (PDF or HTML)
  app.post("/api/papers/ingest-url", async (req, res) => {
    try {
      const { url, workspaceId, title: titleOverride } = req.body as { url?: string; workspaceId?: string; title?: string };
      if (!url) return res.status(400).json({ error: "url is required" });

      // Fetch bytes and try to determine type
      const response = await fetch(url);
      if (!response.ok) return res.status(400).json({ error: `Failed to fetch: ${response.status}` });
      const contentType = response.headers.get("content-type") || "";
      const buf = Buffer.from(await response.arrayBuffer());

      let content = "";
      let title = titleOverride || undefined;
      if (contentType.includes("pdf") || url.toLowerCase().endsWith(".pdf")) {
        content = await extractPdfText(buf);
      } else {
        const html = buf.toString("utf8");
        content = htmlToText(html);
        const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (!title && m) title = m[1].trim();
      }

      if (!content || content.trim().length < 50) {
        return res.status(400).json({ error: "Unable to extract meaningful text from provided URL" });
      }

      const sections = splitIntoSections(content);
      const paper = await storage.createPaper({
        title: title || url,
        abstract: (sections["abstract"] || null),
        authors: null,
        year: null,
        source: "uploaded",
        sourceId: null,
        url,
        pdfUrl: contentType.includes("pdf") || url.toLowerCase().endsWith(".pdf") ? url : null,
        content,
        sections: sections as any,
        workspaceId: workspaceId || null,
        uploadedBy: null,
      });

      if (paper.workspaceId) {
        broadcastToWorkspace(paper.workspaceId, {
          type: 'paper_added',
          paper,
          timestamp: new Date().toISOString(),
        });
      }

      // optionally analyze and log
      try {
        const analysis = await analyzeDocument(content);
        await storage.createAgentLog({
          agentType: "nlp",
          query: `Analyze ingested document ${paper.id}`,
          response: analysis,
          context: null,
          paperId: paper.id,
          workspaceId: paper.workspaceId,
          userId: null,
        });
      } catch (e) {
        console.warn("Document analysis failed (non-fatal)", e);
      }

      res.json(paper);
    } catch (error: any) {
      console.error("Ingest URL error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Upload a PDF (multipart/form-data) field name: file
  app.post("/api/papers/upload-file", upload.single("file"), async (req, res) => {
    try {
      const file = (req as any).file as Express.Multer.File | undefined;
      const { workspaceId, title: titleOverride, url } = req.body as { workspaceId?: string; title?: string; url?: string };
      if (!file) return res.status(400).json({ error: "file is required" });

      const content = await extractPdfText(file.buffer);
      if (!content || content.trim().length < 50) {
        return res.status(400).json({ error: "Unable to extract text from PDF" });
      }

      const sections = splitIntoSections(content);
      const paper = await storage.createPaper({
        title: titleOverride || file.originalname.replace(/\.pdf$/i, ""),
        abstract: (sections["abstract"] || null),
        authors: null,
        year: null,
        source: "uploaded",
        sourceId: null,
        url: url || null,
        pdfUrl: null,
        content,
        sections: sections as any,
        workspaceId: workspaceId || null,
        uploadedBy: null,
      });

      if (paper.workspaceId) {
        broadcastToWorkspace(paper.workspaceId, {
          type: 'paper_added',
          paper,
          timestamp: new Date().toISOString(),
        });
      }

      // optionally analyze and log
      try {
        const analysis = await analyzeDocument(content);
        await storage.createAgentLog({
          agentType: "nlp",
          query: `Analyze uploaded PDF ${paper.id}`,
          response: analysis,
          context: null,
          paperId: paper.id,
          workspaceId: paper.workspaceId,
          userId: null,
        });
      } catch (e) {
        console.warn("Document analysis failed (non-fatal)", e);
      }

      res.json(paper);
    } catch (error: any) {
      console.error("Upload PDF error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Chat with paper endpoint
  app.post("/api/chat/paper", async (req, res) => {
    try {
      const { paperId, question, agentType = "reasoning" } = req.body;

      if (!paperId || !question) {
        return res.status(400).json({ error: "Paper ID and question are required" });
      }

      const paper = await storage.getPaper(paperId);
      if (!paper) {
        return res.status(404).json({ error: "Paper not found" });
      }

      const context = `Paper Title: ${paper.title}\n\nAbstract: ${paper.abstract || "Not available"}\n\nContent: ${paper.content || "Full text not available"}`;
      
      const answer = await queryAgent({
        role: agentType as AgentRole,
        query: question,
        context,
      });

      // Save message to database
      const message = await storage.createMessage({
        content: question,
        role: "user",
        agentType: null,
        paperId,
        workspaceId: paper.workspaceId,
        userId: null,
      });

      const agentMessage = await storage.createMessage({
        content: answer,
        role: "agent",
        agentType,
        paperId,
        workspaceId: paper.workspaceId,
        userId: null,
      });

      res.json({ answer, agentMessage });
    } catch (error: any) {
      console.error("Chat with paper error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get messages for a paper
  app.get("/api/messages/paper/:paperId", async (req, res) => {
    try {
      const { paperId } = req.params;
      const messages = await storage.getMessagesByPaper(paperId);
      res.json(messages);
    } catch (error: any) {
      console.error("Get messages error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Related research finder
  app.post("/api/research/related", async (req, res) => {
    try {
      const { topic, max = 12 } = req.body as { topic?: string; max?: number };

      if (!topic || typeof topic !== "string" || topic.trim().length < 3) {
        return res.status(400).json({ error: "Topic is required" });
      }

      // 1) Gather candidates from: local storage, arXiv, Semantic Scholar
      const [local, arxiv, s2] = await Promise.all([
        storage.searchPapers(topic).catch(() => []),
        (async () => { const { searchArXiv } = await import("./arxiv"); return searchArXiv(topic, Math.ceil(max/2)); })(),
        (async () => { const mod = await import("./semantic-scholar"); return mod.searchSemanticScholar(topic, Math.ceil(max/2)); })(),
      ]);

      // Merge and de-duplicate by title (rough heuristic)
      const seen = new Set<string>();
      const candidates = [...local, ...arxiv, ...s2]
        .filter(p => p?.title)
        .filter(p => {
          const key = (p.title || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
          if (seen.has(key)) return false;
          seen.add(key); return true;
        })
        .slice(0, Math.max(6, max));

      // 2) Compute simple semantic similarity using keyword overlap from title + abstract
      function keywords(text?: string | null) {
        return new Set((text || "").toLowerCase().replace(/[^a-z0-9\s]+/g, " ")
          .split(/\s+/).filter(w => w.length > 3 && !STOP.has(w)));
      }
      const STOP = new Set(["with","from","that","this","have","using","into","through","about","their","there","were","where","which","been","being","within","without","such","into","onto","over","under","your","ours","they","them","than","then","thus","into","onto","also","both","between","among","most","more","less","very","much","many","like","into","onto","into","onto","into","onto","for","the","and","are","not","but","can","will","shall","should","would","could","may","might","into","onto","onto","into","onto","onto","into","onto","into","onto","from","into","onto","into","onto","onto","into","onto"]);

      const docs = candidates.map((p, idx) => ({
        idx,
        paper: p as any,
        kw: keywords(`${p.title || ""} ${p.abstract || ""}`),
      }));

      const edges: { source: number; target: number; weight: number; label: string }[] = [];
      for (let i = 0; i < docs.length; i++) {
        for (let j = i + 1; j < docs.length; j++) {
          const a = docs[i].kw, b = docs[j].kw;
          const inter = [...a].filter(x => b.has(x));
          const union = new Set([...a, ...b]);
          const jaccard = union.size ? inter.length / union.size : 0;
          if (jaccard >= 0.06) {
            edges.push({ source: i, target: j, weight: Number(jaccard.toFixed(3)), label: `${(jaccard*100).toFixed(1)}% overlap` });
          }
        }
      }

      // 3) Build response graph nodes/edges
      const nodes = candidates.map((p, i) => ({
        id: `p${i}`,
        type: "paper",
        label: p.title || `Paper ${i+1}`,
        data: {
          abstract: p.abstract || null,
          authors: p.authors || null,
          year: (p as any).year ?? null,
          source: (p as any).source || null,
          url: p.url || null,
          pdfUrl: (p as any).pdfUrl || null,
        },
      }));
      const graphEdges = edges.map((e, k) => ({
        id: `e${k}`,
        sourceId: `p${e.source}`,
        targetId: `p${e.target}`,
        type: "citation",
        label: e.label,
      }));

      // 4) Ask Retrieval agent to summarize connections
      const context = `Topic: ${topic}\nPapers:\n${candidates.map((p,i)=>`${i+1}. ${p.title} (${(p as any).year || "n/a"})`).join("\n")}`;
      let relatedInfo: string;
      try {
        relatedInfo = await queryAgent({
          role: "retrieval",
          query: `Summarize key themes and connections among these papers relevant to: ${topic}. Provide clusters and notable links.`,
          context,
        });
      } catch (e) {
        // Fallback: basic textual overview if LLM is unavailable
        const bullets = candidates.map((p, i) => `- ${i + 1}) ${p.title} ${(p as any).year ? `(${(p as any).year})` : ""}`).join("\n");
        const connections = graphEdges
          .map(e => `• ${nodes.find(n=>n.id===e.sourceId)?.label} ↔ ${nodes.find(n=>n.id===e.targetId)?.label} (${e.label})`)
          .join("\n");
        relatedInfo = `Related works for: ${topic}\n\nPapers:\n${bullets}\n\nConnections (keyword overlap):\n${connections || "No strong overlaps detected."}`;
      }

      res.json({
        topic,
        relatedInfo, // maintains backward compatibility with current client
        graph: { nodes, edges: graphEdges },
        totalPapers: candidates.length,
      });
    } catch (error: any) {
      console.error("Related research error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Paper generator endpoint
  app.post("/api/paper/generate", async (req, res) => {
    try {
      const { topic, workspaceId, format = 'generic' } = req.body as { topic: string; workspaceId?: string; format?: string };

      if (!topic) {
        return res.status(400).json({ error: "Topic is required" });
      }

      function promptForFormat(fmt: string) {
        switch (fmt) {
          case 'ieee':
            return `You are drafting in IEEE format. Output only Markdown for the paper, no preamble or commentary. Use clear headings and lists as appropriate. Title: ${topic}\n\nRequired sections: Abstract, Keywords, Introduction, Related Work, Methodology, Experiments, Results, Discussion, Conclusion, References.`;
          case 'acm':
            return `You are drafting in ACM format. Output only Markdown for the paper. Title: ${topic}\n\nRequired sections: CCS Concepts, Keywords, Abstract, Introduction, Related Work, Methods, Evaluation, Results, Discussion, Conclusion, Acknowledgments, References.`;
          case 'neurips':
            return `You are drafting in NeurIPS style. Output only Markdown. Title: ${topic}\n\nRequired sections: Abstract, Introduction, Related Work, Method, Experiments, Results, Conclusion, Broader Impact, References.`;
          case 'arxiv':
            return `You are drafting for arXiv. Output only Markdown. Title: ${topic}\n\nRequired sections: Abstract, Introduction, Related Work, Methods, Experiments, Results, Conclusion, Acknowledgments, References.`;
          case 'nature':
            return `You are drafting for Nature. Output only Markdown. Title: ${topic}\n\nRequired sections: Abstract, Introduction, Results, Discussion, Methods, Data availability, Code availability, Acknowledgments, References.`;
          default:
            return `Draft a concise, structured research paper in Markdown with the following sections only: Abstract, Introduction, Methodology, Results, Conclusion. Title: ${topic}. Output only Markdown.`;
        }
      }

      const content = await queryAgent({
        role: "nlp",
        query: promptForFormat(format),
      });

      const document = await storage.createDocument({
        title: `Generated Paper: ${topic}`,
        content,
        version: 1,
        workspaceId: workspaceId || null,
        createdBy: null,
      });

      // Broadcast to workspace collaborators if available
      if (workspaceId) {
        broadcastToWorkspace(workspaceId, {
          type: 'document_generated',
          document,
          format,
          timestamp: new Date().toISOString(),
        });
      }

      res.json(document);
    } catch (error: any) {
      console.error("Paper generation error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get documents by workspace
  app.get("/api/documents/workspace/:workspaceId", async (req, res) => {
    try {
      const { workspaceId } = req.params;
      const documents = await storage.getDocumentsByWorkspace(workspaceId);
      res.json(documents);
    } catch (error: any) {
      console.error("Get documents error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create a document manually (not via generator)
  app.post("/api/documents", async (req, res) => {
    try {
      const { title, content, workspaceId } = req.body as { title?: string; content?: string; workspaceId?: string };
      if (!title || !content) return res.status(400).json({ error: "title and content are required" });
      const doc = await storage.createDocument({ title, content, version: 1, workspaceId: workspaceId || null, createdBy: null });
      res.json(doc);
    } catch (error: any) {
      console.error("Create document error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update/save a generated document
  app.patch("/api/documents/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { title, content, bumpVersion } = req.body as { title?: string; content?: string; bumpVersion?: boolean };
      if (title === undefined && content === undefined) {
        return res.status(400).json({ error: "Nothing to update" });
      }
      const updated = await storage.updateDocument(id, { title, content, bumpVersion: !!bumpVersion });
      res.json(updated);
    } catch (error: any) {
      console.error("Update document error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // List history versions for a document
  app.get("/api/documents/:id/history", async (req, res) => {
    try {
      const { id } = req.params;
      const history = await storage.listDocumentVersions(id);
      res.json(history);
    } catch (error: any) {
      console.error("List document history error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Knowledge graph endpoints
  app.get("/api/graph/nodes/:workspaceId", async (req, res) => {
    try {
      const { workspaceId } = req.params;
      const nodes = await storage.getNodesByWorkspace(workspaceId);
      res.json(nodes);
    } catch (error: any) {
      console.error("Get nodes error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/graph/edges/:workspaceId", async (req, res) => {
    try {
      const { workspaceId } = req.params;
      const edges = await storage.getEdgesByWorkspace(workspaceId);
      res.json(edges);
    } catch (error: any) {
      console.error("Get edges error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create node
  app.post("/api/graph/nodes", async (req, res) => {
    try {
      const { type, label, data, workspaceId } = req.body as { type?: string; label?: string; data?: any; workspaceId?: string };
      if (!type || !label || !workspaceId) return res.status(400).json({ error: "type, label, workspaceId are required" });
      const node = await storage.createNode({ type, label, data: data || null, workspaceId });
      res.json(node);
    } catch (error: any) {
      console.error("Create node error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create edge
  app.post("/api/graph/edges", async (req, res) => {
    try {
      const { sourceId, targetId, type, label, workspaceId } = req.body as { sourceId?: string; targetId?: string; type?: string; label?: string; workspaceId?: string };
      if (!sourceId || !targetId || !type || !workspaceId) return res.status(400).json({ error: "sourceId, targetId, type, workspaceId are required" });
      const edge = await storage.createEdge({ sourceId, targetId, type, label: label || null, workspaceId });
      res.json(edge);
    } catch (error: any) {
      console.error("Create edge error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Generate a fused knowledge graph for a workspace
  app.post("/api/graph/generate/:workspaceId", async (req, res) => {
    try {
      const { workspaceId } = req.params;

      // Fetch workspace artifacts
      const [papers, messages, tasks] = await Promise.all([
        storage.getPapersByWorkspace(workspaceId).catch(() => []),
        storage.getMessagesByWorkspace(workspaceId).catch(() => []),
        storage.getTasksByWorkspace(workspaceId).catch(() => []),
      ]);

      // Start with existing nodes/edges to avoid duplicates
      const existingNodes = await storage.getNodesByWorkspace(workspaceId).catch(() => []);
      const existingEdges = await storage.getEdgesByWorkspace(workspaceId).catch(() => []);
      const nodeByKey = new Map<string, any>();
      for (const n of existingNodes) nodeByKey.set(`${n.type}:${(n.label||'').toLowerCase()}`, n);

      const nodes: any[] = [...existingNodes];
      const edges: any[] = [...existingEdges];

      function ensureNode(type: string, label: string, data?: any) {
        const key = `${type}:${label.toLowerCase()}`;
        const found = nodeByKey.get(key);
        if (found) return found;
        return null;
      }

      // Create nodes for papers
      for (const p of papers) {
        const label = p.title || `Paper ${p.id.slice(0, 6)}`;
        let node = ensureNode('paper', label);
        if (!node) {
          node = await storage.createNode({
            type: 'paper',
            label,
            data: { abstract: p.abstract || null, year: p.year || null, source: p.source || null, url: p.url || null },
            workspaceId,
          });
          nodes.push(node);
          nodeByKey.set(`paper:${label.toLowerCase()}`, node);
        }
      }

      // Create nodes for agents observed in messages/tasks
      const agentLabels = new Set<string>();
      for (const m of messages) if (m.agentType) agentLabels.add(m.agentType);
      for (const t of tasks) if (t.agentType) agentLabels.add(t.agentType);
      for (const a of agentLabels) {
        const label = a;
        let node = ensureNode('agent', label);
        if (!node) {
          node = await storage.createNode({ type: 'agent', label, data: null, workspaceId });
          nodes.push(node);
          nodeByKey.set(`agent:${label.toLowerCase()}`, node);
        }
      }

      // Create concept nodes via simple keyword extraction from paper titles
      function extractConcepts(title?: string | null): string[] {
        if (!title) return [];
        return title
          .split(/[:;\-–—]|\s\|\s/) // split on separators
          .join(' ')
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, ' ')
          .split(/\s+/)
          .filter(w => w.length > 4 && !STOP_WORDS.has(w))
          .slice(0, 6);
      }
      const STOP_WORDS = new Set(["about","after","before","which","their","there","these","those","where","while","using","based","approach","method","study","paper","with","from","that","this","have","into","through","among","between","under","over","your","ours","they","them","then","thus","also","both","most","more","less","very","much","many","like","for","the","and","are","not","but","can","will","shall","should","would","could","may","might"]);

      const conceptMap = new Map<string, any>();
      for (const p of papers) {
        const concepts = extractConcepts(p.title);
        for (const c of concepts) {
          if (!conceptMap.has(c)) {
            let node = ensureNode('concept', c);
            if (!node) {
              node = await storage.createNode({ type: 'concept', label: c, data: null, workspaceId });
              nodes.push(node);
              nodeByKey.set(`concept:${c.toLowerCase()}`, node);
            }
            conceptMap.set(c, node);
          }
        }
      }

      // Helper to check duplicate edges
      const edgeKey = (s: string, t: string, type: string) => `${s}->${t}#${type}`;
      const existingEdgeKeys = new Set(existingEdges.map(e => edgeKey(e.sourceId, e.targetId, e.type)));

      async function ensureEdge(sourceId: string, targetId: string, type: string, label?: string | null) {
        const k = edgeKey(sourceId, targetId, type);
        if (existingEdgeKeys.has(k)) return;
        const edge = await storage.createEdge({ sourceId, targetId, type, label: label || null, workspaceId });
        edges.push(edge);
        existingEdgeKeys.add(k);
      }

      // Link papers to concepts
      for (const p of papers) {
        const paperNode = nodes.find(n => n.type === 'paper' && n.label === (p.title || ''));
        if (!paperNode) continue;
        const concepts = extractConcepts(p.title);
        for (const c of concepts) {
          const conceptNode = conceptMap.get(c);
          if (conceptNode) await ensureEdge(paperNode.id, conceptNode.id, 'concept', 'mentions');
        }
      }

      // Link agents to papers/tasks they interacted with
      for (const m of messages) {
        if (m.agentType && m.paperId) {
          const agentNode = nodes.find(n => n.type === 'agent' && n.label === m.agentType);
          const paper = papers.find(p => p.id === m.paperId);
          const paperNode = paper ? nodes.find(n => n.type === 'paper' && n.label === (paper.title || '')) : undefined;
          if (agentNode && paperNode) await ensureEdge(agentNode.id, paperNode.id, 'reasoning', 'discussed');
        }
      }
      for (const t of tasks) {
        if (t.agentType && t.paperId) {
          const agentNode = nodes.find(n => n.type === 'agent' && n.label === t.agentType);
          const paper = papers.find(p => p.id === t.paperId);
          const paperNode = paper ? nodes.find(n => n.type === 'paper' && n.label === (paper.title || '')) : undefined;
          if (agentNode && paperNode) await ensureEdge(agentNode.id, paperNode.id, 'collaboration', 'assigned');
        }
      }

      // Basic citation-like edges using keyword overlap of titles between papers
      const paperNodes = nodes.filter(n => n.type === 'paper');
      function kwset(s: string) { return new Set(s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 3 && !STOP_WORDS.has(w))); }
      for (let i = 0; i < paperNodes.length; i++) {
        for (let j = i + 1; j < paperNodes.length; j++) {
          const a = paperNodes[i], b = paperNodes[j];
          const A = kwset(a.label), B = kwset(b.label);
          const inter = [...A].filter(x => B.has(x));
          const union = new Set([...A, ...B]);
          const jaccard = union.size ? inter.length / union.size : 0;
          if (jaccard >= 0.08) {
            await ensureEdge(a.id, b.id, 'citation', `${(jaccard * 100).toFixed(1)}% overlap`);
          }
        }
      }

      res.json({ nodes, edges });
    } catch (error: any) {
      console.error("Generate graph error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============= TASK MANAGEMENT ENDPOINTS =============
  
  // Create a new task (assign to agent)
  app.post("/api/tasks", async (req, res) => {
    try {
      const { title, description, agentType, priority, workspaceId, paperId, context } = req.body;

      if (!title || !description || !agentType || !workspaceId) {
        return res.status(400).json({ error: "Title, description, agentType, and workspaceId are required" });
      }

      const task = await storage.createTask({
        title,
        description,
        agentType,
        priority: priority || "medium",
        status: "pending",
        workspaceId,
        paperId: paperId || null,
        context: context || null,
        assignedBy: null,
      });

      // Add task to queue for processing
      queueManager.addToQueue(task, (message) => {
        broadcastToWorkspace(workspaceId, message);
      });

      res.json(task);
    } catch (error: any) {
      console.error("Create task error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get all tasks for a workspace
  app.get("/api/tasks/workspace/:workspaceId", async (req, res) => {
    try {
      const { workspaceId } = req.params;
      const tasks = await storage.getTasksByWorkspace(workspaceId);
      res.json(tasks);
    } catch (error: any) {
      console.error("Get tasks error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get pending tasks (task queue)
  app.get("/api/tasks/queue/:workspaceId", async (req, res) => {
    try {
      const { workspaceId } = req.params;
      const tasks = await storage.getPendingTasks(workspaceId);
      res.json(tasks);
    } catch (error: any) {
      console.error("Get pending tasks error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get a specific task
  app.get("/api/tasks/:taskId", async (req, res) => {
    try {
      const { taskId } = req.params;
      const task = await storage.getTask(taskId);
      
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      res.json(task);
    } catch (error: any) {
      console.error("Get task error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============= WORKSPACE MEMBER ENDPOINTS =============

  // Add member to workspace
  app.post("/api/workspace/members", async (req, res) => {
    try {
      const { workspaceId, userId, role } = req.body;

      if (!workspaceId || !userId) {
        return res.status(400).json({ error: "WorkspaceId and userId are required" });
      }

      const member = await storage.createWorkspaceMember({
        workspaceId,
        userId,
        role: role || "member",
        status: "online",
      });

      broadcastToWorkspace(workspaceId, {
        type: "member_joined",
        member,
        timestamp: new Date().toISOString(),
      });

      res.json(member);
    } catch (error: any) {
      console.error("Add member error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get workspace members
  app.get("/api/workspace/members/:workspaceId", async (req, res) => {
    try {
      const { workspaceId } = req.params;
      const members = await storage.getWorkspaceMembers(workspaceId);
      res.json(members);
    } catch (error: any) {
      console.error("Get members error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update member status (online/offline/away)
  app.patch("/api/workspace/members/:workspaceId/:userId/status", async (req, res) => {
    try {
      const { workspaceId, userId } = req.params;
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({ error: "Status is required" });
      }

      const member = await storage.updateMemberStatus(workspaceId, userId, status);

      broadcastToWorkspace(workspaceId, {
        type: "member_status_changed",
        member,
        timestamp: new Date().toISOString(),
      });

      res.json(member);
    } catch (error: any) {
      console.error("Update member status error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============= CANVAS DOCUMENT ENDPOINTS =============

  // Create canvas document
  app.post("/api/canvas", async (req, res) => {
    try {
      const { title, content, workspaceId } = req.body;

      if (!title || !workspaceId) {
        return res.status(400).json({ error: "Title and workspaceId are required" });
      }

      const canvas = await storage.createCanvasDocument({
        title,
        content: content || "",
        workspaceId,
        lastEditedBy: null,
      });

      res.json(canvas);
    } catch (error: any) {
      console.error("Create canvas error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get canvas documents for workspace
  app.get("/api/canvas/workspace/:workspaceId", async (req, res) => {
    try {
      const { workspaceId } = req.params;
      const canvases = await storage.getCanvasDocumentsByWorkspace(workspaceId);
      res.json(canvases);
    } catch (error: any) {
      console.error("Get canvas documents error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get specific canvas document
  app.get("/api/canvas/:canvasId", async (req, res) => {
    try {
      const { canvasId } = req.params;
      const canvas = await storage.getCanvasDocument(canvasId);
      
      if (!canvas) {
        return res.status(404).json({ error: "Canvas document not found" });
      }

      res.json(canvas);
    } catch (error: any) {
      console.error("Get canvas error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update canvas document
  app.patch("/api/canvas/:canvasId", async (req, res) => {
    try {
      const { canvasId } = req.params;
      const { content, userId } = req.body;

      if (content === undefined) {
        return res.status(400).json({ error: "Content is required" });
      }

      const canvas = await storage.updateCanvasDocument(canvasId, content, userId || null);

      // Broadcast canvas update to workspace
      broadcastToWorkspace(canvas.workspaceId, {
        type: "canvas_updated",
        canvas: {
          id: canvas.id,
          title: canvas.title,
          lastEditedBy: canvas.lastEditedBy,
          updatedAt: canvas.updatedAt,
        },
        timestamp: new Date().toISOString(),
      });

      res.json(canvas);
    } catch (error: any) {
      console.error("Update canvas error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============= TEAM WORKSPACE CHAT ENDPOINTS =============

  // Get workspace chat messages
  app.get("/api/workspace/messages/:workspaceId", async (req, res) => {
    try {
      const { workspaceId } = req.params;
      const messages = await storage.getMessagesByWorkspace(workspaceId);
      res.json(messages);
    } catch (error: any) {
      console.error("Get workspace messages error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Send message in workspace (human or agent)
  app.post("/api/workspace/messages", async (req, res) => {
    try {
      const { workspaceId, content, role, agentType, userId } = req.body;

      if (!workspaceId || !content || !role) {
        return res.status(400).json({ error: "WorkspaceId, content, and role are required" });
      }

      const message = await storage.createMessage({
        content,
        role,
        agentType: agentType || null,
        paperId: null,
        workspaceId,
        userId: userId || null,
      });

      // Broadcast message to all workspace members
      broadcastToWorkspace(workspaceId, {
        type: "new_message",
        message,
        timestamp: new Date().toISOString(),
      });

      res.json(message);
    } catch (error: any) {
      console.error("Send workspace message error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Agent participates in workspace chat
  app.post("/api/workspace/messages/agent", async (req, res) => {
    try {
      const { workspaceId, query, agentType, context } = req.body;

      if (!workspaceId || !query || !agentType) {
        return res.status(400).json({ error: "WorkspaceId, query, and agentType are required" });
      }

      // Build augmented context from workspace uploads
      const uploadsCtx = await buildWorkspacePapersContext(workspaceId);
      const combinedContext = [context, uploadsCtx].filter(Boolean).join("\n\n");
      // Get agent response
      const response = await queryAgent({
        role: agentType as AgentRole,
        query,
        context: combinedContext || undefined,
      });

      // Save user query
      await storage.createMessage({
        content: query,
        role: "user",
        agentType: null,
        paperId: null,
        workspaceId,
        userId: null,
      });

      // Save agent response
      const agentMessage = await storage.createMessage({
        content: response,
        role: "agent",
        agentType,
        paperId: null,
        workspaceId,
        userId: null,
      });

      // Broadcast agent message
      broadcastToWorkspace(workspaceId, {
        type: "agent_message",
        message: agentMessage,
        timestamp: new Date().toISOString(),
      });

      res.json({ query, response, message: agentMessage });
    } catch (error: any) {
      console.error("Agent workspace message error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============= WEBSOCKET SETUP =============

  // ============= WEBSOCKET SETUP =============

  // Create HTTP server
  const httpServer = createServer(app);

  // Following javascript_websocket blueprint - WebSocket server for real-time collaboration
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  interface ClientInfo {
    ws: WebSocket;
    workspaceId?: string;
  }

  const clients = new Map<string, ClientInfo>();

  // Broadcast to all clients in a specific workspace
  function broadcastToWorkspace(workspaceId: string, message: any) {
    const messageStr = JSON.stringify(message);
    clients.forEach((clientInfo) => {
      if (clientInfo.workspaceId === workspaceId && clientInfo.ws.readyState === WebSocket.OPEN) {
        clientInfo.ws.send(messageStr);
      }
    });
  }

  wss.on('connection', (ws: WebSocket) => {
    const clientId = Math.random().toString(36).substring(7);
    clients.set(clientId, { ws });

    console.log(`[WebSocket] Client connected: ${clientId}`);

    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        
        // Handle workspace join
        if (message.type === 'join_workspace') {
          const clientInfo = clients.get(clientId);
          if (clientInfo) {
            clientInfo.workspaceId = message.workspaceId;
            console.log(`[WebSocket] Client ${clientId} joined workspace ${message.workspaceId}`);
          }
          return;
        }

        // Handle workspace leave
        if (message.type === 'leave_workspace') {
          const clientInfo = clients.get(clientId);
          if (clientInfo) {
            clientInfo.workspaceId = undefined;
            console.log(`[WebSocket] Client ${clientId} left workspace`);
          }
          return;
        }

        // Broadcast to workspace members
        const clientInfo = clients.get(clientId);
        if (clientInfo?.workspaceId) {
          broadcastToWorkspace(clientInfo.workspaceId, {
            ...message,
            clientId,
            timestamp: message.timestamp || new Date().toISOString(),
          });
        } else {
          // Fallback: broadcast to all if no workspace specified
          clients.forEach((client, id) => {
            if (id !== clientId && client.ws.readyState === WebSocket.OPEN) {
              client.ws.send(JSON.stringify(message));
            }
          });
        }
      } catch (error) {
        console.error('[WebSocket] Message error:', error);
      }
    });

    ws.on('close', () => {
      clients.delete(clientId);
      console.log(`[WebSocket] Client disconnected: ${clientId}`);
    });

    ws.on('error', (error) => {
      console.error(`[WebSocket] Error for client ${clientId}:`, error);
    });
  });

  return httpServer;
}
