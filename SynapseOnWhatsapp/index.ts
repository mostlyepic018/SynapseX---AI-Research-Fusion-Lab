import 'dotenv/config';
import { create, type Whatsapp } from '@wppconnect-team/wppconnect';

// Basic config
const SERVER_BASE_URL = process.env.SERVER_BASE_URL || 'http://localhost:5000';
const DEFAULT_WORKSPACE_ID = process.env.WORKSPACE_ID || '';

// Simple in-memory per-user session state
// For production, back this with a real store
type Step = 'idle' | 'paper_explorer_query' | 'chat_with_paper_ask' | 'chat_with_paper_select' | 'related_research_query';

interface SearchItemBrief {
  id?: string;
  title?: string;
  url?: string | null;
  pdfUrl?: string | null;
}

interface SessionState {
  step: Step;
  data: {
    paperId?: string;
    lastSearch?: SearchItemBrief[];
  };
}
const sessions = new Map<string, SessionState>();
const getSession = (user: string): SessionState => {
  const s = sessions.get(user);
  if (s) return s;
  const init: SessionState = { step: 'idle', data: {} };
  sessions.set(user, init);
  return init;
};

const menu = [
  'Welcome to SynapseX WhatsApp! Choose an option by sending its number:',
  '1) Paper Explorer',
  '2) Related Research Finder',
  '3) Chat with Paper',
  '',
  'You can reply with "menu" anytime to return here.'
].join('\n');

async function handleMenuSelection(client: Whatsapp, from: string, body: string) {
  const normalized = body.trim().toLowerCase();
  const session = getSession(from);

  if (['menu', 'hi', 'hello', 'hey', 'help', 'start'].includes(normalized)) {
    sessions.set(from, { step: 'idle', data: {} });
    await client.sendText(from, menu);
    return;
  }

  if (session.step === 'paper_explorer_query') {
    // Run search
    const q = body.trim();
    if (!q) {
      await client.sendText(from, 'Please send a non-empty query for Paper Explorer.');
      return;
    }
    await sendPaperExplorerResults(client, from, q);
    return;
  }

  if (session.step === 'related_research_query') {
    const topic = body.trim();
    if (!topic) {
      await client.sendText(from, 'Please send a topic for Related Research.');
      return;
    }
    await sendRelatedResearch(client, from, topic);
    sessions.set(from, { step: 'idle', data: {} });
    return;
  }

  if (session.step === 'chat_with_paper_select') {
    // Expecting a paper ID
    const paperId = body.trim();
    if (!paperId) {
      await client.sendText(from, 'Please send a valid paper ID.');
      return;
    }
    session.data.paperId = paperId;
    session.step = 'chat_with_paper_ask';
    await client.sendText(from, 'Great! Now send your question for this paper. If it\'s external (arXiv/S2), I\'ll ingest it first.');
    return;
  }

  if (session.step === 'chat_with_paper_ask') {
    const question = body.trim();
    if (!question) {
      await client.sendText(from, 'Please send a non-empty question.');
      return;
    }
    let paperId = session.data.paperId as string;
    // If the user explicitly asks to ingest, try ingestion first and then ask for a question.
    if (/\bingest\b/i.test(question) && paperId && (paperId.startsWith('arxiv-') || paperId.startsWith('arxiv:') || paperId.startsWith('s2-'))) {
      const arxivRaw = parseArxivRawId(paperId);
      let newId: string | null = await maybeIngestFromLastSearch(from, paperId);
      if (!newId && arxivRaw) newId = await ingestFromArxiv(arxivRaw);
      if (newId) {
        session.data.paperId = newId;
        await client.sendText(from, 'Ingested the paper successfully. Now send your question.');
        return; // stay in ask step
      }
      await client.sendText(from, 'Could not ingest. Try running Paper Explorer first and pick an ID.');
      return;
    }

    // If external result, try to ingest using lastSearch details first; if not, try arXiv fetch by id
    if (paperId && (paperId.startsWith('arxiv-') || paperId.startsWith('s2-') || paperId.startsWith('arxiv:'))) {
      let stored = await maybeIngestFromLastSearch(from, paperId);
      if (!stored) {
        const arxivRaw = parseArxivRawId(paperId);
        if (arxivRaw) stored = await ingestFromArxiv(arxivRaw);
      }
      if (stored) paperId = stored;
    }

    await sendChatWithPaper(client, from, paperId, question);
    sessions.set(from, { step: 'idle', data: {} });
    return;
  }

  // If idle, parse top-level menu numbers
  switch (normalized) {
    case '1':
    case 'paper explorer':
  sessions.set(from, { step: 'paper_explorer_query', data: getSession(from).data });
      await client.sendText(from, 'Send your search query (e.g., "Graph Neural Networks"):');
      break;
    case '2':
    case 'related research finder':
      sessions.set(from, { step: 'related_research_query', data: {} });
      await client.sendText(from, 'Send a topic to find related research:');
      break;
    case '3':
    case 'chat with paper':
  sessions.set(from, { step: 'chat_with_paper_select', data: getSession(from).data });
      await client.sendText(from, 'Send the Paper ID to chat with (you can find it via Paper Explorer).');
      break;
    default:
      await client.sendText(from, menu);
  }
}

async function sendPaperExplorerResults(client: Whatsapp, to: string, query: string) {
  try {
    const url = new URL('/api/papers/search', SERVER_BASE_URL);
    url.searchParams.set('q', query);
    url.searchParams.set('max', '5');
    const resp = await fetch(url.toString());
    if (!resp.ok) throw new Error(`Server ${resp.status}`);
    const items: any[] = await resp.json();

    if (!items || items.length === 0) {
      await client.sendText(to, 'No papers found. Try a different query.');
      return;
    }

    // store brief results in session for potential ingestion later
    const session = getSession(to);
    session.data.lastSearch = items.slice(0, 5).map(p => ({ id: p.id, title: p.title, url: p.url ?? null, pdfUrl: p.pdfUrl ?? null }));

    const lines: string[] = [];
    lines.push(`Top ${Math.min(5, items.length)} results for: ${query}`);
    for (const p of items.slice(0, 5)) {
      const id = p.id || p.sourceId || '';
      const title = p.title || 'Untitled';
      const src = p.source || 'local';
      const year = p.year ? ` (${p.year})` : '';
      const url = p.url || p.pdfUrl || '';
      lines.push(`• ID: ${id}`);
      lines.push(`  ${title}${year}`);
      lines.push(`  Source: ${src}${url ? ` | ${url}` : ''}`);
      lines.push('');
    }

    lines.push('Reply "menu" to go back. To chat with a paper, pick an ID and choose option 3.');
    await client.sendText(to, lines.join('\n'));
  } catch (err: any) {
    await client.sendText(to, `Paper Explorer error: ${err.message || err}`);
  }
}

// Try to ingest an external paper using last search cache; returns new local paper ID if successful
async function maybeIngestFromLastSearch(user: string, externalId: string): Promise<string | null> {
  const session = getSession(user);
  const list = session.data.lastSearch || [];
  const found = list.find(x => x.id === externalId);
  if (!found) return null;
  const candidateUrl = found.pdfUrl || found.url;
  if (!candidateUrl) return null;

  const resp = await fetch(`${SERVER_BASE_URL}/api/papers/ingest-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: candidateUrl, workspaceId: DEFAULT_WORKSPACE_ID || undefined, title: found.title || undefined })
  });
  if (!resp.ok) return null;
  const paper = await resp.json();
  return paper?.id || null;
}

async function sendRelatedResearch(client: Whatsapp, to: string, topic: string) {
  try {
    const resp = await fetch(`${SERVER_BASE_URL}/api/research/related`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, max: 8 })
    });
    if (!resp.ok) throw new Error(`Server ${resp.status}`);
    const data: any = await resp.json();

    const lines: string[] = [];
    lines.push(`Related research for: ${topic}`);
    if (data.relatedInfo) {
      // WhatsApp messages should be short-ish; trim
      const summary = String(data.relatedInfo);
      lines.push(summary.length > 1200 ? summary.slice(0, 1200) + '…' : summary);
    }

    // Optional: list a few nodes
    if (data.graph?.nodes?.length) {
      lines.push('');
      lines.push('Papers:');
      for (const n of data.graph.nodes.slice(0, 5)) {
        lines.push(`• ${n.label}`);
      }
    }

    await client.sendText(to, lines.join('\n'));
  } catch (err: any) {
    await client.sendText(to, `Related research error: ${err.message || err}`);
  }
}

async function sendChatWithPaper(client: Whatsapp, to: string, paperId: string, question: string) {
  try {
    const resp = await fetch(`${SERVER_BASE_URL}/api/chat/paper`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paperId, question, agentType: 'reasoning' })
    });
    if (!resp.ok) throw new Error(`Server ${resp.status}`);
    const data: any = await resp.json();

    const answer = String(data.answer || 'No answer');
    await client.sendText(to, answer.length > 1600 ? answer.slice(0, 1600) + '…' : answer);
  } catch (err: any) {
    await client.sendText(to, `Chat error: ${err.message || err}`);
  }
}

// Helpers for ingesting arXiv papers without prior search
function parseArxivRawId(input: string): string | null {
  const s = input.trim().toLowerCase();
  // Accept forms like 'arxiv-<id>' or 'arxiv:<id>' or raw '<id>'
  if (s.startsWith('arxiv-')) return input.slice(6);
  if (s.startsWith('arxiv:')) return input.slice(6);
  // If it contains a slash or dot or 'v' version it's likely an arXiv id; return as-is
  if (/^(\d{4}\.\d{4,5}(v\d+)?|[a-z\-]+\/\d{7}(v\d+)?)$/i.test(input)) return input;
  return null;
}

async function ingestFromArxiv(arxivId: string): Promise<string | null> {
  try {
    // Try to fetch metadata first to get a stable PDF URL
    const metaResp = await fetch(`${SERVER_BASE_URL}/api/papers/arxiv/${encodeURIComponent(arxivId)}`);
    let pdfUrl: string | undefined;
    let title: string | undefined;
    if (metaResp.ok) {
      const meta: any = await metaResp.json();
      pdfUrl = meta.pdfUrl || (meta.sourceId ? `https://arxiv.org/pdf/${meta.sourceId}.pdf` : undefined);
      title = meta.title;
    } else {
      // Fallback: construct a direct PDF URL and try ingestion anyway
      pdfUrl = `https://arxiv.org/pdf/${arxivId}.pdf`;
    }

    if (!pdfUrl) return null;

    const ingest = await fetch(`${SERVER_BASE_URL}/api/papers/ingest-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: pdfUrl, title, workspaceId: DEFAULT_WORKSPACE_ID || undefined })
    });
    if (!ingest.ok) return null;
    const paper = await ingest.json();
    return paper?.id || null;
  } catch {
    return null;
  }
}

async function start() {
  const client = await create({
    session: 'synapse-on-whatsapp',
    headless: true,
    catchQR: (_base64Qr: string) => {
      // The library will also log a QR code URL; here we just note receipt
      console.log('QR code received. Please scan with WhatsApp.');
    },
  });

  client.onMessage(async (message: any) => {
    try {
      // Only respond to text chats, ignore groups by default
      if (!message.body || !message.from) return;
      if (message.isGroupMsg) return; // keep simple for now

      await handleMenuSelection(client, message.from, message.body);
    } catch (e) {
      console.error('onMessage error', e);
    }
  });

  console.log('SynapseOnWhatsapp is running. Send any message to receive the menu.');
}

start().catch((e) => {
  console.error('Failed to start WhatsApp bot:', e);
  process.exit(1);
});
