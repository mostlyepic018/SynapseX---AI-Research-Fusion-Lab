import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Network, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { useEffect, useState } from "react";
import { getGraphNodes, getGraphEdges } from "@/lib/api";

export default function KnowledgeGraph() {
  const [counts, setCounts] = useState({ nodes: 0, edges: 0 });
  useEffect(() => {
    // In absence of workspace selection UI, use a dummy workspace id
    const wsId = "default";
    Promise.allSettled([getGraphNodes(wsId), getGraphEdges(wsId)]).then(([n, e]) => {
      setCounts({
        nodes: n.status === "fulfilled" ? n.value.length : 0,
        edges: e.status === "fulfilled" ? e.value.length : 0,
      });
    });
  }, []);
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

        <div className="flex items-center justify-center h-full">
          <div className="text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Network className="w-10 h-10 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">Knowledge Graph Visualization</h3>
              <p className="text-muted-foreground max-w-md">
                Interactive graph will display papers, datasets, agents, and their relationships.
                React Flow integration coming in Phase 2.
              </p>
            </div>
          </div>
        </div>
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
            <div className="flex justify-between">
              <span className="text-muted-foreground">Active Agents</span>
              <span className="font-medium">2</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
