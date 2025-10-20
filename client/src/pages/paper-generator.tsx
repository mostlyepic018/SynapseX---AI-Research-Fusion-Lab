import { useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Save, Download, History, Bold, Italic, Heading } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { useMutation } from "@tanstack/react-query";
import { createDocument, generatePaper, getDocumentHistory, type PaperFormat, updateDocument } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function PaperGenerator() {
  const [content, setContent] = useState(`# Research Paper Title

## Abstract
Start writing your research paper here. AI agents will collaborate with you in real-time.

## Introduction

## Methodology

## Results

## Conclusion
`);
  const [topic, setTopic] = useState("");
  const [format, setFormat] = useState<PaperFormat>("generic");
  const [docId, setDocId] = useState<string | null>(null);
  const [version, setVersion] = useState<number>(1);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyItems, setHistoryItems] = useState<Array<{ id: string; version: number; title: string; content: string; createdAt: string }>>([]);
  const printRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const generateMutation = useMutation({
    mutationFn: () => generatePaper({ topic, format }),
    onSuccess: (doc: any) => {
      setContent(doc.content || content);
      setDocId(doc.id);
      setVersion(doc.version || 1);
      toast({ title: "Generated", description: `Created: ${doc.title}` });
    },
    onError: (error: any) => {
      toast({ title: "Generation failed", description: error.message, variant: "destructive" });
    }
  });

  async function handleSave() {
    try {
      if (!docId) {
        const title = topic ? `Generated Paper: ${topic}` : "Untitled Document";
        const doc = await createDocument({ title, content });
        setDocId(doc.id);
        setVersion(doc.version || 1);
        toast({ title: "Saved", description: "Document created" });
      } else {
        const updated = await updateDocument(docId, { content, bumpVersion: true });
        setVersion(updated.version || (version + 1));
        toast({ title: "Saved", description: `Version ${updated.version} created` });
      }
    } catch (e: any) {
      toast({ title: "Save failed", description: e?.message || String(e), variant: "destructive" });
    }
  }

  async function openHistory() {
    if (!docId) {
      toast({ title: "No history yet", description: "Save the document first to start version history" });
      return;
    }
    try {
      const items = await getDocumentHistory(docId);
      setHistoryItems(items.map((i: any) => ({ id: i.id, version: i.version, title: i.title, content: i.content, createdAt: typeof i.createdAt === 'string' ? i.createdAt : new Date(i.createdAt).toISOString() })));
      setHistoryOpen(true);
    } catch (e: any) {
      toast({ title: "Failed to load history", description: e?.message || String(e), variant: "destructive" });
    }
  }

  function handleExportPdf() {
    // Minimal, cross-browser approach: print the preview area. Users can save as PDF.
    const printContents = printRef.current?.innerHTML || '';
    const w = window.open('', '_blank', 'width=1024,height=768');
    if (!w) return;
    const doc = w.document;
    doc.open();
    doc.write(`<!doctype html><html><head><title>Paper Export</title><style>
      body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; padding: 24px; }
      .prose { max-width: 100%; }
      h1,h2,h3 { page-break-after: avoid; }
      pre, code { white-space: pre-wrap; }
    </style></head><body>${printContents}</body></html>`);
    doc.close();
    w.focus();
    w.print();
    // Optional: close after print
    w.onafterprint = () => w.close();
  }

  return (
    <>
    <div className="container max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Dynamic Paper Generator</h1>
          <p className="text-lg text-muted-foreground">
            Collaborative writing with AI agents in real-time
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={openHistory} data-testid="button-view-history">
            <History className="w-4 h-4 mr-2" />
            History
          </Button>
          <Button variant="outline" onClick={handleExportPdf} data-testid="button-download-paper">
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
          <Button onClick={handleSave} data-testid="button-save-paper">
            <Save className="w-4 h-4 mr-2" />
            Save{version ? ` (v${version})` : ''}
          </Button>
        </div>
      </div>

      <Separator />

      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex-1 flex gap-2 items-center">
            <Input placeholder="Topic to generate" value={topic} onChange={(e) => setTopic(e.target.value)} data-testid="input-generate-topic" />
            <Select value={format} onValueChange={(v) => setFormat(v as PaperFormat)}>
              <SelectTrigger className="w-[180px]" data-testid="select-paper-format">
                <SelectValue placeholder="Format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="generic">Generic</SelectItem>
                <SelectItem value="ieee">IEEE</SelectItem>
                <SelectItem value="acm">ACM</SelectItem>
                <SelectItem value="neurips">NeurIPS</SelectItem>
                <SelectItem value="arxiv">arXiv</SelectItem>
                <SelectItem value="nature">Nature</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => topic.trim() && generateMutation.mutate()} disabled={!topic.trim() || generateMutation.isPending} data-testid="button-generate-topic">
            {generateMutation.isPending ? "Generating..." : "Generate"}
          </Button>
        </div>
      </Card>

      <div className="flex items-center gap-2 mb-4">
        <Badge variant="secondary" className="bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
          <div className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse" />
          NLP Agent writing
        </Badge>
  <Badge variant="secondary">Version {version}.0</Badge>
        <Badge variant="secondary">Format: {format.toUpperCase()}</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="flex flex-col h-[calc(100vh-340px)]">
          <div className="border-b p-3 flex items-center gap-2">
            <span className="font-semibold text-sm">Markdown Editor</span>
            <Separator orientation="vertical" className="h-4" />
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Bold className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Italic className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Heading className="w-3.5 h-3.5" />
            </Button>
          </div>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="flex-1 font-mono text-sm border-0 rounded-none resize-none focus-visible:ring-0"
            placeholder="Start writing your research paper..."
            data-testid="textarea-paper-content"
          />
        </Card>

        <Card className="h-[calc(100vh-340px)]">
          <div className="border-b p-3">
            <span className="font-semibold text-sm">Preview</span>
          </div>
          <ScrollArea className="h-full p-6">
            <div ref={printRef} className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            </div>
          </ScrollArea>
        </Card>
      </div>

      <Card className="p-4">
        <h3 className="font-semibold mb-3">Active Contributors</h3>
        <div className="flex gap-2">
          <Badge className="bg-primary/10 text-primary">
            You
          </Badge>
          <Badge className="bg-chart-1/10 text-chart-1">
            NLP Agent
          </Badge>
          <Badge className="bg-chart-2/10 text-chart-2">
            Reasoning Agent
          </Badge>
        </div>
      </Card>
  </div>

  <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Document History {docId ? `(#${docId.slice(0,6)})` : ''}</DialogTitle>
        </DialogHeader>
        {historyItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">No versions yet. Save to create version history.</p>
        ) : (
          <div className="space-y-3 max-h-[60vh] overflow-auto">
            {historyItems.map(h => (
              <div key={h.id} className="border rounded-md p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium">Version {h.version}</div>
                  <div className="text-xs text-muted-foreground">{new Date(h.createdAt).toLocaleString()}</div>
                </div>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{h.content.slice(0, 1000)}</ReactMarkdown>
                </div>
                <div className="mt-2">
                  <Button variant="outline" size="sm" onClick={() => { setContent(h.content); setHistoryOpen(false); toast({ title: "Restored", description: `Loaded version ${h.version} into editor (unsaved)` }); }}>Load into editor</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
}
