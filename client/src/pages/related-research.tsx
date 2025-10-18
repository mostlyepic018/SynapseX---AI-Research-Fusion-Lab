import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { GitBranch, Search, Download } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function RelatedResearch() {
  const [topic, setTopic] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = () => {
    setIsSearching(true);
    setTimeout(() => setIsSearching(false), 1500);
  };

  return (
    <div className="container max-w-6xl mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">Related Research Finder</h1>
        <p className="text-lg text-muted-foreground">
          Discover semantically connected papers and visualize research relationships
        </p>
      </div>

      <Separator />

      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Enter your research topic or paste abstract
            </label>
            <Textarea
              placeholder="E.g., 'Deep learning for medical image segmentation' or paste a paper abstract..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="min-h-[120px]"
              data-testid="textarea-research-topic"
            />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleSearch}
              disabled={!topic.trim() || isSearching}
              data-testid="button-find-related"
            >
              <Search className="w-4 h-4 mr-2" />
              Find Related Research
            </Button>
            <Button variant="outline" disabled data-testid="button-export-review">
              <Download className="w-4 h-4 mr-2" />
              Export Literature Review
            </Button>
          </div>
        </div>
      </Card>

      {isSearching ? (
        <div className="space-y-4">
          <Card className="p-6">
            <Skeleton className="h-[400px] w-full rounded-lg" />
          </Card>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="p-4 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <Card className="p-12">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <GitBranch className="w-10 h-10 text-primary" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">Discover Research Connections</h3>
              <p className="text-muted-foreground max-w-md">
                Enter a topic to find semantically related papers. The AI will analyze connections
                and generate an interactive network visualization.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
