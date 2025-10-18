export const AGENT_TYPES = {
  NLP: 'nlp',
  REASONING: 'reasoning',
  DATA: 'data',
  CV: 'cv',
  CRITIC: 'critic',
  RETRIEVAL: 'retrieval',
} as const;

export type AgentType = typeof AGENT_TYPES[keyof typeof AGENT_TYPES];

export interface Paper {
  id: string;
  title: string;
  abstract?: string | null;
  authors?: string[] | null;
  year?: number | null;
  source?: string | null;
  sourceId?: string | null;
  url?: string | null;
  pdfUrl?: string | null;
  content?: string | null;
  sections?: any;
  workspaceId?: string | null;
  uploadedBy?: string | null;
  createdAt: string | Date;
}

export interface Message {
  id: string;
  content: string;
  role: 'user' | 'agent';
  agentType: AgentType | null;
  paperId?: string | null;
  workspaceId?: string | null;
  userId?: string | null;
  createdAt: string | Date;
}
