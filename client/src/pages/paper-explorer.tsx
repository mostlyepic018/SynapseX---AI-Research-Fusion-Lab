import { useState } from "react";
import { PaperCard } from "@/components/paper-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Card } from "@/components/ui/card";
import { Search, Filter, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { searchPapers, createPaper } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type { Paper } from "@/types/schema";

export default function PaperExplorer() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSource, setSelectedSource] = useState<string>("all");
  const { toast } = useToast();

  const { data: allPapers = [], isLoading: isSearching, refetch } = useQuery({
    queryKey: ["/api/papers/search", searchQuery],
    queryFn: () => searchQuery ? searchPapers(searchQuery) : Promise.resolve([]),
    enabled: false,
  });

  const papers = (selectedSource === "all")
    ? allPapers
    : allPapers.filter(p => (p.source || "uploaded") === selectedSource);

  const addToLabMutation = useMutation({
    mutationFn: (paper: Paper) => createPaper({
      title: paper.title,
      abstract: paper.abstract || undefined,
      authors: paper.authors || undefined,
      url: paper.url || undefined,
    }),
    onSuccess: () => {
      toast({
        title: "Paper added to lab",
        description: "The paper has been successfully added to your workspace.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error adding paper",
        description: error.message || "Failed to add paper to lab",
        variant: "destructive",
      });
    },
  });

  const handleSearch = () => {
    if (searchQuery.trim()) {
      refetch();
    }
  };

  const handleAddToLab = (paperId: string) => {
    const paper = papers.find(p => p.id === paperId);
    if (paper) {
      addToLabMutation.mutate(paper);
    }
  };

  return (
    <div className="container max-w-7xl mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">Smart Research Paper Explorer</h1>
        <p className="text-lg text-muted-foreground">
          Search and discover research papers from ArXiv and Semantic Scholar
        </p>
      </div>

      <Separator />

      <Card className="p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search papers by title, keywords, or topic..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-10"
              data-testid="input-paper-search"
            />
          </div>
          <div className="flex gap-2">
            <Select value={selectedSource} onValueChange={setSelectedSource}>
              <SelectTrigger className="w-[180px]" data-testid="select-paper-source">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="arxiv">ArXiv</SelectItem>
                <SelectItem value="semantic_scholar">Semantic Scholar</SelectItem>
                <SelectItem value="uploaded">Uploaded</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleSearch} disabled={isSearching} data-testid="button-search-papers">
              {isSearching ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Search
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isSearching ? (
          <>
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="p-4 space-y-3">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <div className="flex gap-2 pt-2">
                  <Skeleton className="h-8 flex-1" />
                  <Skeleton className="h-8 w-20" />
                </div>
              </Card>
            ))}
          </>
        ) : papers.length > 0 ? (
          papers.map((paper) => (
            <PaperCard key={paper.id} paper={paper} onAddToLab={handleAddToLab} />
          ))
        ) : (
          <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
            <Search className="w-16 h-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No papers found</h3>
            <p className="text-muted-foreground max-w-md">
              Search for research papers using keywords, topics, or specific titles.
              Results from ArXiv and Semantic Scholar will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
