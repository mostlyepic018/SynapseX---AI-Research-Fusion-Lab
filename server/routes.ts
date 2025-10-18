import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { queryAgent, analyzeDocument, generateSummary, type AgentRole } from "./gemini";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
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
      const { q } = req.query;
      
      if (!q || typeof q !== "string") {
        return res.status(400).json({ error: "Query parameter 'q' is required" });
      }

      // Search local database first
      const localPapers = await storage.searchPapers(q);

      // Also search ArXiv for external papers
      const { searchArXiv } = await import("./arxiv");
      const arxivResults = await searchArXiv(q, 10);

      // Combine results (local papers first, then ArXiv)
      const combinedResults = [
        ...localPapers,
        ...arxivResults.map(paper => ({
          id: `arxiv-${paper.sourceId || Math.random().toString(36).substring(7)}`,
          ...paper,
          workspaceId: null,
          uploadedBy: null,
          content: null,
          sections: null,
          createdAt: new Date(),
        } as any))
      ];

      res.json(combinedResults);
    } catch (error: any) {
      console.error("Paper search error:", error);
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

      res.json(paper);
    } catch (error: any) {
      console.error("Paper upload error:", error);
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
      const { topic } = req.body;

      if (!topic) {
        return res.status(400).json({ error: "Topic is required" });
      }

      const relatedInfo = await queryAgent({
        role: "retrieval",
        query: `Find and describe research papers related to: ${topic}. Provide paper titles, key concepts, and how they connect.`,
      });

      res.json({ topic, relatedInfo });
    } catch (error: any) {
      console.error("Related research error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Paper generator endpoint
  app.post("/api/paper/generate", async (req, res) => {
    try {
      const { topic, workspaceId } = req.body;

      if (!topic) {
        return res.status(400).json({ error: "Topic is required" });
      }

      const content = await queryAgent({
        role: "nlp",
        query: `Generate a research paper outline for: ${topic}. Include sections: Abstract, Introduction, Methodology, Results, and Conclusion.`,
      });

      const document = await storage.createDocument({
        title: `Generated Paper: ${topic}`,
        content,
        version: 1,
        workspaceId: workspaceId || null,
        createdBy: null,
      });

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

  // Create HTTP server
  const httpServer = createServer(app);

  // Following javascript_websocket blueprint - WebSocket server for real-time collaboration
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  const clients = new Map<string, WebSocket>();

  wss.on('connection', (ws: WebSocket) => {
    const clientId = Math.random().toString(36).substring(7);
    clients.set(clientId, ws);

    console.log(`Client connected: ${clientId}`);

    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        
        // Broadcast to all connected clients except sender
        clients.forEach((client, id) => {
          if (id !== clientId && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
          }
        });
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      clients.delete(clientId);
      console.log(`Client disconnected: ${clientId}`);
    });

    ws.on('error', (error) => {
      console.error(`WebSocket error for client ${clientId}:`, error);
    });
  });

  return httpServer;
}
