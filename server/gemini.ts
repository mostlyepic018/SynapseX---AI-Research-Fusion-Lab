// Following javascript_gemini blueprint
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const AGENT_SYSTEM_PROMPTS = {
  nlp: `You are the NLP Agent in a collaborative AI research lab. Your expertise is in:
- Natural language processing and text analysis
- Summarization and text generation
- Writing assistance and content structuring
- Abstract and paper content extraction
Work cooperatively with other agents. Provide clear, academic-quality text.`,

  reasoning: `You are the Reasoning Agent in a collaborative AI research lab. Your expertise is in:
- Logical validation and inference
- Methodology assessment and critique
- Identifying biases and logical fallacies
- Validating research claims and conclusions
Work cooperatively with other agents. Focus on rigorous logical analysis.`,

  data: `You are the Data Agent in a collaborative AI research lab. Your expertise is in:
- Statistical analysis and numerical interpretation
- Dataset evaluation and quality assessment
- Identifying data patterns and trends
- Quantitative methodology validation
Work cooperatively with other agents. Provide data-driven insights.`,

  cv: `You are the Computer Vision Agent in a collaborative AI research lab. Your expertise is in:
- Image and figure interpretation
- Visual data analysis from research papers
- Chart and graph understanding
- Identifying visual patterns and anomalies
Work cooperatively with other agents. Analyze visual content when available.`,

  critic: `You are the Critic Agent in a collaborative AI research lab. Your expertise is in:
- Quality assessment and review
- Identifying weaknesses and gaps in research
- Scoring and rating research quality
- Suggesting improvements
Work cooperatively with other agents. Provide constructive, balanced critique.`,

  retrieval: `You are the Retrieval Agent in a collaborative AI research lab. Your expertise is in:
- Research discovery and information gathering
- Finding related papers and datasets
- Citation and reference management
- Connecting disparate research threads
Work cooperatively with other agents. Help discover relevant information.`,
};

export type AgentRole = keyof typeof AGENT_SYSTEM_PROMPTS;

interface AgentQueryOptions {
  role: AgentRole;
  query: string;
  context?: string;
}

export async function queryAgent({
  role,
  query,
  context,
}: AgentQueryOptions): Promise<string> {
  const systemPrompt = AGENT_SYSTEM_PROMPTS[role];
  
  const fullPrompt = context
    ? `Context: ${context}\n\nUser Query: ${query}`
    : query;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: systemPrompt,
      },
      contents: fullPrompt,
    });

    return response.text || "I encountered an issue processing your request.";
  } catch (error) {
    console.error(`Error querying ${role} agent:`, error);
    throw new Error(`Failed to get response from ${role} agent`);
  }
}

export async function analyzeDocument(content: string): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Analyze this research document and extract key information including methodology, datasets used, findings, and any notable contributions:\n\n${content}`,
    });

    return response.text || "Unable to analyze document";
  } catch (error) {
    console.error("Error analyzing document:", error);
    throw new Error("Document analysis failed");
  }
}

export async function generateSummary(text: string, style: "simple" | "technical" = "technical"): Promise<string> {
  const stylePrompt = style === "simple"
    ? "Provide a simple, accessible summary suitable for non-experts."
    : "Provide a technical summary maintaining academic rigor and terminology.";

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `${stylePrompt}\n\nText to summarize:\n${text}`,
    });

    return response.text || "Unable to generate summary";
  } catch (error) {
    console.error("Error generating summary:", error);
    throw new Error("Summary generation failed");
  }
}
