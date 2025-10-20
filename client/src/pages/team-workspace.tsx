import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import mermaid from "mermaid";
import type { Components } from "react-markdown";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, Send, Circle, Link as LinkIcon, Clipboard, FileDown, Upload as UploadIcon } from "lucide-react";
import { useWebSocket } from "@/lib/websocket";
import { sendWorkspaceMessage, agentWorkspaceMessage, getWorkspaceMessages, getPendingTasks, getTasksByWorkspace, listCanvasByWorkspace, createCanvas, updateCanvas, getPapersByWorkspace, ingestPaperUrl, uploadPaperFile, getWorkspaceMembers, addWorkspaceMember, updateMemberStatus } from "@/lib/api";
import { getWorkspaceId } from "@/lib/utils";

interface TeamMember {
  id: string;
  name: string;
  role: "user" | "agent";
  status: "online" | "away" | "offline";
}

export default function TeamWorkspace() {
  const WORKSPACE_ID = getWorkspaceId();
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState<Array<{ sender: string; content: string; time: string }>>([]);
  const [members, setMembers] = useState<TeamMember[]>([
    { id: "you", name: "You", role: "user", status: "online" },
    { id: "nlp", name: "NLP Agent", role: "agent", status: "online" },
    { id: "reasoning", name: "Reasoning Agent", role: "agent", status: "away" },
  ]);
  const [activeTasks, setActiveTasks] = useState<Array<{ id: string; title: string; status: string; agentType: string }>>([]);
  const [canvasId, setCanvasId] = useState<string | null>(null);
  const [docContent, setDocContent] = useState<string>("");
  const [papers, setPapers] = useState<Array<{ id: string; title: string; url?: string | null; abstract?: string | null; content?: string | null }>>([]);
  const [selectedPaperIds, setSelectedPaperIds] = useState<string[]>([]);
  const [shareCopied, setShareCopied] = useState(false);
  const [urlToIngest, setUrlToIngest] = useState("");
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [userId] = useState(() => {
    const k = 'sx_user_id';
    const v = localStorage.getItem(k);
    if (v) return v;
    const id = 'user-' + Math.random().toString(36).slice(2, 8);
    localStorage.setItem(k, id);
    return id;
  });

  const { sendMessage, joinWorkspace } = useWebSocket((msg: any) => {
    if (msg.type === "team_chat") {
      setChat((c) => [
        ...c,
        {
          sender: msg.data.sender,
          content: msg.data.content,
          time: new Date().toLocaleTimeString(),
        },
      ]);
    }
    if (msg.type === 'new_message' || msg.type === 'agent_message') {
      const m = msg.message;
      setChat((c) => [...c, { sender: m.role === 'agent' ? `${(m.agentType || 'Agent').toString().toUpperCase()} Agent` : 'User', content: m.content, time: new Date().toLocaleTimeString() }]);
    }
    if (msg.type === 'task_started' || msg.type === 'task_completed' || msg.type === 'task_failed' || msg.type === 'task_queued') {
      const { task } = msg;
      setActiveTasks((list) => {
        const rest = list.filter((t) => t.id !== task.id);
        const next = { id: task.id, title: task.title, status: task.status, agentType: task.agentType };
        // remove if completed/failed
        if (task.status === 'completed' || task.status === 'failed') return rest;
        return [next, ...rest];
      });
    }
    if (msg.type === 'canvas_updated') {
      // lightweight refresh: if our canvas id matches, refetch content eventually; for UX, just ignore if we’re not holding id
      if (canvasId && msg.canvas?.id === canvasId) {
        // optimistic: do nothing, as we push our content on change
      }
    }
    if (msg.type === 'member_joined') {
      const m = msg.member;
      setMembers((prev) => {
        const has = prev.find(x => x.id === m.userId);
        const entry = { id: m.userId, name: m.userId, role: 'user' as const, status: (m.status || 'online') as any };
        return has ? prev.map(x => x.id === m.userId ? entry : x) : [entry, ...prev];
      });
    }
    if (msg.type === 'member_status_changed') {
      const m = msg.member;
      setMembers((prev) => prev.map(x => x.id === m.userId ? { ...x, status: (m.status || 'online') } as any : x));
    }
  });

  useEffect(() => {
    joinWorkspace(WORKSPACE_ID);
    // Load existing messages from backend
    (async () => {
      try {
        const msgs = await getWorkspaceMessages(WORKSPACE_ID);
        setChat(msgs.map((m) => ({ sender: m.role === 'agent' ? `${(m.agentType || 'Agent').toString().toUpperCase()} Agent` : 'User', content: m.content, time: new Date(m.createdAt as any).toLocaleTimeString() })));
      } catch {}
      try {
        const [pending, allTasks] = await Promise.all([
          getPendingTasks(WORKSPACE_ID),
          getTasksByWorkspace(WORKSPACE_ID)
        ]);
        const inFlight = allTasks.filter(t => t.status === 'pending' || t.status === 'in_progress');
        setActiveTasks(inFlight.map(t => ({ id: t.id, title: t.title, status: t.status, agentType: t.agentType })));
      } catch {}
      try {
        const docs = await listCanvasByWorkspace(WORKSPACE_ID);
        if (docs.length > 0) {
          setCanvasId(docs[0].id);
          setDocContent(docs[0].content || "");
        } else {
          const created = await createCanvas({ title: 'Team Canvas', content: '', workspaceId: WORKSPACE_ID });
          setCanvasId(created.id);
          setDocContent(created.content || "");
        }
      } catch {}
      try {
        const wsMembers = await getWorkspaceMembers(WORKSPACE_ID);
        setMembers((prev) => {
          // keep agents static, add/merge real members
          const staticAgents = prev.filter(p => p.role === 'agent');
          const hum: TeamMember[] = wsMembers.map(m => ({ id: m.userId, name: m.userId, role: 'user', status: m.status }));
          // dedupe by id
          const map = new Map<string, TeamMember>();
          [...hum, ...staticAgents].forEach(m => map.set(m.id, m));
          return Array.from(map.values());
        });
        // ensure current user is added
        if (!wsMembers.find(m => m.userId === userId)) {
          await addWorkspaceMember({ workspaceId: WORKSPACE_ID, userId });
        } else {
          await updateMemberStatus(WORKSPACE_ID, userId, 'online');
        }
      } catch {}
      try {
  const list = await getPapersByWorkspace(WORKSPACE_ID);
  setPapers(list.map(p => ({ id: p.id, title: p.title, url: p.url, abstract: p.abstract || null, content: p.content || null })));
      } catch {}
    })();

    const onVis = async () => {
      try { await updateMemberStatus(WORKSPACE_ID, userId, document.visibilityState === 'visible' ? 'online' : 'away'); } catch {}
    };
    const onBeforeUnload = async () => { try { await updateMemberStatus(WORKSPACE_ID, userId, 'offline'); } catch {} };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, []);

  const handleSend = async () => {
    if (!message.trim()) return;
    const content = message;
    setMessage("");
    // @mention routing: if starts with @AgentName, call agent endpoint
    const mentionMatch = content.trim().match(/^@([a-zA-Z]+)\s*(.*)$/);
    const map: Record<string, string> = { nlp: 'nlp', reasoning: 'reasoning', data: 'data', cv: 'cv', critic: 'critic', retrieval: 'retrieval', nlpagent: 'nlp', reasoningagent: 'reasoning', dataagent: 'data', cvagent: 'cv', criticagent: 'critic', retrievalagent: 'retrieval' };
    if (mentionMatch) {
      const key = mentionMatch[1].toLowerCase();
      const agentType = map[key];
      const query = mentionMatch[2] || content;
      if (agentType) {
        // append local user message for instant UX; server saves user + agent reply
        setChat((c) => [...c, { sender: "You", content: query, time: new Date().toLocaleTimeString() }]);
        // Build a compact context from selected uploads
        let extraContext: string | undefined = undefined;
        if (selectedPaperIds.length > 0) {
          const picked = papers.filter(p => selectedPaperIds.includes(p.id)).slice(0, 5);
          const parts: string[] = [];
          parts.push('Selected uploads to consider:');
          for (const p of picked) {
            let piece = `Title: ${p.title}`;
            if (p.url) piece += `\nURL: ${p.url}`;
            if (p.abstract) piece += `\nAbstract: ${p.abstract}`;
            if (!p.abstract && p.content) piece += `\nExcerpt: ${p.content.slice(0,400)}${p.content.length>400?'…':''}`;
            parts.push(piece);
          }
          extraContext = parts.join('\n\n');
        }
        try { await agentWorkspaceMessage({ workspaceId: WORKSPACE_ID, query, agentType: agentType as any, context: extraContext }); } catch {}
        return;
      }
    }
    // default: plain user message to workspace
    setChat((c) => [...c, { sender: "You", content, time: new Date().toLocaleTimeString() }]);
    try { await sendWorkspaceMessage({ workspaceId: WORKSPACE_ID, content, role: 'user' }); } catch {
      const payload = { type: "team_chat", data: { sender: "You", content } } as any;
      sendMessage(payload);
    }
  };

  const getStatusColor = (status: TeamMember["status"]) => {
    switch (status) {
      case "online":
        return "bg-status-online";
      case "away":
        return "bg-status-away";
      default:
        return "bg-status-offline";
    }
  };

  return (
    <div className="container max-w-7xl mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Team Collaboration Workspace</h1>
            <p className="text-lg text-muted-foreground">Real-time collaboration with team members and AI agents</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={async () => {
              try {
                const url = `${window.location.origin}${window.location.pathname}?ws=${encodeURIComponent(WORKSPACE_ID)}`;
                await navigator.clipboard.writeText(url);
                setShareCopied(true);
                setTimeout(()=>setShareCopied(false), 2000);
              } catch {}
            }} title="Copy shareable link">
              <LinkIcon className="w-4 h-4 mr-2" /> {shareCopied ? 'Link Copied' : 'Share Workspace'}
            </Button>
            <Button variant="outline" onClick={async () => {
              try {
                const blob = new Blob([docContent || ''], { type: 'text/markdown;charset=utf-8' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = `workspace-canvas-${WORKSPACE_ID}.md`;
                a.click();
                URL.revokeObjectURL(a.href);
              } catch {}
            }} title="Download shared document">
              <FileDown className="w-4 h-4 mr-2" /> Download
            </Button>
          </div>
        </div>
      </div>

      <Separator />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-4">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Shared Document</h2>
            <Textarea
              placeholder="Start collaborating on your research document..."
              className="min-h-[300px] font-mono"
              value={docContent}
              onChange={async (e) => {
                const v = e.target.value;
                setDocContent(v);
                if (canvasId) {
                  try { await updateCanvas(canvasId, v, 'you'); } catch {}
                }
              }}
              data-testid="textarea-shared-document"
            />
            <div className="flex items-center gap-2 mt-4">
              <Badge variant="secondary" className="gap-1.5">
                <Circle className="w-2 h-2 fill-current text-primary" />
                Auto-saved
              </Badge>
              <span className="text-sm text-muted-foreground">2 people editing</span>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Team Chat</h2>
            <ScrollArea className="h-[300px] mb-4 p-4 border rounded-lg">
              <div className="space-y-4">
                {chat.map((m, i) => (
                  <div key={i} className="flex gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-muted text-xs">{m.sender.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{m.sender}</span>
                        {m.sender.includes("Agent") && <Badge variant="secondary" className="text-xs">Agent</Badge>}
                        <span className="text-xs text-muted-foreground">{m.time}</span>
                      </div>
                      <div className="text-sm prose prose-invert max-w-none">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            code({ inline, className, children, ...props }: { inline?: boolean; className?: string; children?: any }) {
                              const txt = String(children ?? "");
                              const lang = (className || "").replace("language-", "");
                              if (!inline && (lang === "mermaid" || txt.trim().startsWith("mermaid"))) {
                                const id = `twmd-${i}`;
                                const def = lang === "mermaid" ? txt : txt.replace(/^mermaid\n/, "");
                                setTimeout(async () => {
                                  try {
                                    const el = document.getElementById(id);
                                    if (!el) return;
                                    const res = await mermaid.render(id + "-svg", def);
                                    el.innerHTML = res.svg; // eslint-disable-line react/no-danger
                                  } catch {}
                                }, 0);
                                return <div id={id} className="overflow-auto" />;
                              }
                              return <code className={className} {...props}>{children}</code>;
                            }
                          } as Components}
                        >
                          {m.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="flex gap-2">
              <Input
                placeholder="Type a message or @mention a team member..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                data-testid="input-team-message"
              />
              <Button size="icon" onClick={handleSend} data-testid="button-send-team-message">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Team Members</h3>
            </div>
            <div className="space-y-3">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover-elevate"
                  data-testid={`team-member-${member.id}`}
                >
                  <div className="relative">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="text-xs">
                        {member.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background ${getStatusColor(member.status)}`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{member.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{member.status}</p>
                  </div>
                  {member.role === "agent" && (
                    <Badge variant="secondary" className="text-xs">AI</Badge>
                  )}
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="font-semibold mb-3">Active Tasks</h3>
            <div className="space-y-2 text-sm">
              {activeTasks.length === 0 && (
                <div className="text-muted-foreground text-xs">No active tasks</div>
              )}
              {activeTasks.map(t => (
                <div key={t.id} className="p-2 rounded bg-muted/50">
                  <p className="font-medium mb-1">@{t.agentType.toUpperCase()} {t.title}</p>
                  <Badge variant="secondary" className="text-xs capitalize">{t.status.replace('_',' ')}</Badge>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="font-semibold mb-3">My Uploads</h3>
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input placeholder="Paste research link (PDF or web)" value={urlToIngest} onChange={(e)=>setUrlToIngest(e.target.value)} />
                <Button variant="outline" disabled={!urlToIngest.trim() || uploading} onClick={async ()=>{
                  setUploading(true);
                  try { await ingestPaperUrl({ url: urlToIngest.trim(), workspaceId: WORKSPACE_ID }); const list = await getPapersByWorkspace(WORKSPACE_ID); setPapers(list.map(p=>({id:p.id,title:p.title,url:p.url, abstract: p.abstract || null, content: p.content || null})))} finally { setUploading(false); setUrlToIngest(''); }
                }}>Add Link</Button>
              </div>
              <div className="flex items-center gap-2">
                <Input type="file" accept="application/pdf" onChange={(e)=> setFileToUpload(e.target.files?.[0] || null)} />
                <Button variant="outline" disabled={!fileToUpload || uploading} onClick={async()=>{
                  if (!fileToUpload) return;
                  setUploading(true);
                  try { await uploadPaperFile({ file: fileToUpload, workspaceId: WORKSPACE_ID }); const list = await getPapersByWorkspace(WORKSPACE_ID); setPapers(list.map(p=>({id:p.id,title:p.title,url:p.url, abstract: p.abstract || null, content: p.content || null})))} finally { setUploading(false); setFileToUpload(null); }
                }}>
                  <UploadIcon className="w-4 h-4 mr-2"/> Upload PDF
                </Button>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                <span>{selectedPaperIds.length > 0 ? `${selectedPaperIds.length} selected` : 'No selection'}</span>
                {selectedPaperIds.length > 0 && (
                  <Button variant="ghost" size="sm" className="h-6 px-2" onClick={()=> setSelectedPaperIds([])}>Clear</Button>
                )}
              </div>
              <div className="space-y-2 max-h-48 overflow-auto mt-1">
                {papers.length === 0 && <div className="text-xs text-muted-foreground">No uploads yet</div>}
                {papers.map(p => (
                  <label key={p.id} className="text-sm flex items-start gap-2 p-1 rounded hover:bg-muted/40">
                    <Checkbox
                      checked={selectedPaperIds.includes(p.id)}
                      onCheckedChange={(v)=>{
                        const checked = Boolean(v);
                        setSelectedPaperIds(prev => checked ? Array.from(new Set([...prev, p.id])) : prev.filter(id => id !== p.id));
                      }}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <div className="font-medium leading-tight">{p.title}</div>
                      <div className="text-xs text-muted-foreground line-clamp-2">{p.abstract || (p.content ? p.content.slice(0,120) + (p.content.length>120?'…':'') : '')}</div>
                      {p.url && <a className="ml-0 text-xs text-primary underline" href={p.url} target="_blank" rel="noreferrer">open</a>}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
