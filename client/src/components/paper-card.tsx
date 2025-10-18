import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, ExternalLink, Calendar, Users } from "lucide-react";
import type { Paper } from "@shared/schema";

interface PaperCardProps {
  paper: Paper;
  onAddToLab?: (paperId: string) => void;
  compact?: boolean;
}

export function PaperCard({ paper, onAddToLab, compact = false }: PaperCardProps) {
  const displayAuthors = paper.authors?.slice(0, 3).join(", ");
  const hasMoreAuthors = (paper.authors?.length || 0) > 3;

  return (
    <Card
      className="p-4 hover-elevate transition-all duration-200"
      data-testid={`paper-card-${paper.id}`}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3
              className={`font-semibold ${compact ? "text-base" : "text-lg"} line-clamp-2 mb-2`}
              data-testid={`text-paper-title-${paper.id}`}
            >
              {paper.title}
            </h3>
            
            {displayAuthors && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-2">
                <Users className="w-3.5 h-3.5" />
                <span className="truncate">
                  {displayAuthors}
                  {hasMoreAuthors && ` +${(paper.authors?.length || 0) - 3} more`}
                </span>
              </div>
            )}

            {paper.abstract && !compact && (
              <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                {paper.abstract}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {paper.year && (
            <Badge variant="secondary" className="gap-1">
              <Calendar className="w-3 h-3" />
              {paper.year}
            </Badge>
          )}
          {paper.source && (
            <Badge variant="secondary" className="capitalize">
              {paper.source}
            </Badge>
          )}
        </div>

        <div className="flex gap-2">
          {onAddToLab && (
            <Button
              variant="default"
              size="sm"
              onClick={() => onAddToLab(paper.id)}
              data-testid={`button-add-to-lab-${paper.id}`}
              className="flex-1"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Add to Lab
            </Button>
          )}
          {paper.url && (
            <Button
              variant="outline"
              size="sm"
              asChild
              data-testid={`button-view-paper-${paper.id}`}
            >
              <a href={paper.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-1.5" />
                View
              </a>
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
