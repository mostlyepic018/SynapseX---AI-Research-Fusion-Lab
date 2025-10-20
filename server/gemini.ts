// Following javascript_gemini blueprint
import { GoogleGenAI } from "@google/genai";

// Do NOT hardcode API keys. Read from environment and fail gracefully if missing.
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ai = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null as unknown as GoogleGenAI;

export const AGENT_SYSTEM_PROMPTS = {
  nlp: `You are the NLP Agent in a collaborative AI research lab. Your expertise is in:
- Natural language processing and text analysis
- Summarization and text generation
- Writing assistance and content structuring
- Abstract and paper content extraction
Work cooperatively with other agents. Provide clear, academic-quality text.
When assigned tasks, be thorough and provide structured, actionable outputs.`,

  reasoning: `You are the Reasoning Agent in a collaborative AI research lab. Your expertise is in:
- Logical validation and inference
- Methodology assessment and critique
- Identifying biases and logical fallacies
- Validating research claims and conclusions
Work cooperatively with other agents. Focus on rigorous logical analysis.
When assigned tasks, provide step-by-step reasoning and clear justifications.`,

  data: `You are the Data Agent in a collaborative AI research lab. Your expertise is in:
- Statistical analysis and numerical interpretation
- Dataset evaluation and quality assessment
- Identifying data patterns and trends
- Quantitative methodology validation
Work cooperatively with other agents. Provide data-driven insights.
When assigned tasks, include specific metrics, statistics, and quantitative analysis.`,

  cv: `You are the Computer Vision Agent in a collaborative AI research lab. Your expertise is in:
- Image and figure interpretation
- Visual data analysis from research papers
- Chart and graph understanding
- Identifying visual patterns and anomalies
Work cooperatively with other agents. Analyze visual content when available.
When assigned tasks, focus on visual elements and their implications for the research.`,

  critic: `You are the Critic Agent in a collaborative AI research lab. Your expertise is in:
- Quality assessment and review
- Identifying weaknesses and gaps in research
- Scoring and rating research quality
- Suggesting improvements
Work cooperatively with other agents. Provide constructive, balanced critique.
When assigned tasks, be thorough but fair, highlighting both strengths and areas for improvement.`,

  retrieval: `You are the Retrieval Agent in a collaborative AI research lab. Your expertise is in:
- Research discovery and information gathering
- Finding related papers and datasets
- Citation and reference management
- Connecting disparate research threads
Work cooperatively with other agents. Help discover relevant information.
When assigned tasks, provide comprehensive references and connections to relevant work.`,
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
  if (!GEMINI_API_KEY || !ai) {
    throw new Error("GEMINI_API_KEY is not set. Please configure your Gemini API key in the environment.");
  }
  const systemPrompt = AGENT_SYSTEM_PROMPTS[role];
  
  const fullPrompt = context
    ? `Context: ${context}\n\nUser Query: ${query}`
    : query;

  try {
    const combined = `Instructions for the model (act as a specific agent):\n${systemPrompt}\n\n${fullPrompt}`;
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        { role: "user", parts: [{ text: combined }] }
      ]
    });
    const text = result.text;
    return text || "I encountered an issue processing your request.";
  } catch (error) {
    console.error(`Error querying ${role} agent:`, error);
    throw new Error(`Failed to get response from ${role} agent`);
  }
}

export async function analyzeDocument(content: string): Promise<string> {
  if (!GEMINI_API_KEY || !ai) {
    throw new Error("GEMINI_API_KEY is not set. Please configure your Gemini API key in the environment.");
  }
  try {
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: `Analyze this research document and extract key information including methodology, datasets used, findings, and any notable contributions:\n\n${content}` }] }]
    });
    const text = result.text;
    return text || "Unable to analyze document";
  } catch (error) {
    console.error("Error analyzing document:", error);
    throw new Error("Document analysis failed");
  }
}

export async function generateSummary(text: string, style: "simple" | "technical" = "technical"): Promise<string> {
  if (!GEMINI_API_KEY || !ai) {
    throw new Error("GEMINI_API_KEY is not set. Please configure your Gemini API key in the environment.");
  }
  const stylePrompt = style === "simple"
    ? "Provide a simple, accessible summary suitable for non-experts."
    : "Provide a technical summary maintaining academic rigor and terminology.";

  try {
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: `${stylePrompt}\n\nText to summarize:\n${text}` }] }]
    });
    const out = result.text;
    return out || "Unable to generate summary";
  } catch (error) {
    console.error("Error generating summary:", error);
    throw new Error("Summary generation failed");
  }
}
