import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Network, ZoomIn, ZoomOut, Maximize2, RefreshCw, Sparkles, Beaker } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import ResearchGraph from "@/components/research-graph";
import { getGraphNodes, getGraphEdges, generateKnowledgeGraph, createGraphNode, createGraphEdge, type GraphNode, type GraphEdge } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { getWorkspaceId } from "@/lib/utils";

export default function KnowledgeGraph() {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const counts = useMemo(() => ({ nodes: nodes.length, edges: edges.length }), [nodes, edges]);

  const wsId = getWorkspaceId();

  const loadGraph = useCallback(async () => {
    setLoading(true);
    try {
      const [n, e] = await Promise.all([getGraphNodes(wsId), getGraphEdges(wsId)]);
      setNodes(n);
      setEdges(e);
    } catch (err: any) {
      toast({ title: "Failed to load graph", description: err?.message || String(err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast, wsId]);

  useEffect(() => {
    loadGraph();
  }, [loadGraph]);

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    try {
      await generateKnowledgeGraph(wsId);
      await loadGraph();
      toast({ title: "Graph generated", description: "Knowledge fusion graph has been updated." });
    } catch (err: any) {
      toast({ title: "Generation failed", description: err?.message || String(err), variant: "destructive" });
      setLoading(false);
    }
  }, [loadGraph, toast, wsId]);

  const handleSeedDemo = useCallback(async () => {
    setLoading(true);
    try {
      // Ensure latest graph in state
      await loadGraph();

      const byKey = new Map(nodes.map(n => [`${n.type}:${n.label}`.toLowerCase(), n] as const));
      const ensureNode = async (type: string, label: string, data?: any) => {
        const k = `${type}:${label}`.toLowerCase();
        const found = byKey.get(k);
        if (found) return found;
        const created = await createGraphNode({ type, label, data, workspaceId: wsId });
        byKey.set(k, created);
        return created;
      };

      // Demo nodes
      const p1 = await ensureNode('paper', 'Graph Neural Networks', { year: 2018, source: 'arxiv' });
      const p2 = await ensureNode('paper', 'Attention is All You Need', { year: 2017, source: 'arxiv' });
      const p3 = await ensureNode('paper', 'Graph Attention Networks', { year: 2018, source: 'arxiv' });
      const a1 = await ensureNode('agent', 'reasoning');
      const c1 = await ensureNode('concept', 'message passing');
      const c2 = await ensureNode('concept', 'node embeddings');

      // Refresh edges list
      const currentEdges = await getGraphEdges(wsId);
      const edgeKey = (s: string, t: string, ty?: string) => `${s}->${t}#${ty || ''}`;
      const edgeSet = new Set(currentEdges.map(e => edgeKey(e.sourceId, e.targetId, e.type)));
      const ensureEdge = async (sourceId: string, targetId: string, type: string, label?: string) => {
        const k = edgeKey(sourceId, targetId, type);
        if (edgeSet.has(k)) return;
        await createGraphEdge({ sourceId, targetId, type, label, workspaceId: wsId });
        edgeSet.add(k);
      };

      // Demo edges
      await ensureEdge(p1.id, c1.id, 'concept', 'mentions');
      await ensureEdge(p1.id, c2.id, 'concept', 'mentions');
      await ensureEdge(p3.id, p1.id, 'citation', 'builds on');
      await ensureEdge(p3.id, p2.id, 'citation', 'inspired by');
      await ensureEdge(a1.id, p1.id, 'reasoning', 'discussed');

      await loadGraph();
      toast({ title: 'Sample graph seeded', description: 'Demo nodes and edges were added.' });
    } catch (err: any) {
      toast({ title: 'Seeding failed', description: err?.message || String(err), variant: 'destructive' });
      setLoading(false);
    }
  }, [loadGraph, nodes, toast, wsId]);
  return (
    <div className="container max-w-7xl mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">Knowledge Fusion Graph</h1>
        <p className="text-lg text-muted-foreground">
          Interactive visualization of research connections, agents, and insights
        </p>
      </div>

      <Separator />

      <Card className="relative h-[calc(100vh-280px)] bg-muted/30">
        <div className="absolute top-4 right-4 z-10 flex gap-2">
          <Button size="sm" variant="default" onClick={handleGenerate} disabled={loading} data-testid="button-generate-graph">
            {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
            {loading ? "Building..." : "Generate Graph"}
          </Button>
          <Button size="sm" variant="outline" onClick={handleSeedDemo} disabled={loading} data-testid="button-seed-graph">
            <Beaker className="w-4 h-4 mr-2" /> Seed sample
          </Button>
          <Button size="icon" variant="outline" data-testid="button-zoom-in">
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button size="icon" variant="outline" data-testid="button-zoom-out">
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button size="icon" variant="outline" data-testid="button-fullscreen">
            <Maximize2 className="w-4 h-4" />
          </Button>
        </div>

        {nodes.length > 0 || edges.length > 0 ? (
          <div className="p-2 h-full">
            <ResearchGraph nodes={nodes} edges={edges} height={Math.max(420, typeof window !== 'undefined' ? window.innerHeight - 320 : 520)} />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Network className="w-10 h-10 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">No graph yet</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Generate the knowledge fusion graph from your workspace papers, tasks, and messages.
                </p>
              </div>
              <div>
                <Button onClick={handleGenerate} disabled={loading}>
                  {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  {loading ? "Building graph..." : "Generate Graph"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <h3 className="font-semibold mb-2">Node Types</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary" />
              <span>Research Papers</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-chart-2" />
              <span>AI Agents</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-chart-3" />
              <span>Datasets</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-chart-4" />
              <span>Key Concepts</span>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold mb-2">Edge Types</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="h-px w-6 bg-primary" />
              <span>Citations</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-px w-6 bg-chart-2 border-dashed" />
              <span>Reasoning</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-px w-6 bg-chart-3" />
              <span>Validation</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-px w-6 bg-chart-4" />
              <span>Collaboration</span>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold mb-2">Statistics</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Nodes</span>
              <span className="font-medium">{counts.nodes}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Edges</span>
              <span className="font-medium">{counts.edges}</span>
            </div>
            {/* Placeholder for additional stats; can compute active agents from nodes later */}
          </div>
        </Card>
      </div>
    </div>
  );
}
