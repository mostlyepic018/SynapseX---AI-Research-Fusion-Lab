import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, Database, Eye, Lightbulb, MessageSquare, Search } from "lucide-react";
import type { AgentType } from "@shared/schema";

const agentIcons = {
  nlp: MessageSquare,
  reasoning: Lightbulb,
  data: Database,
  cv: Eye,
  critic: Brain,
  retrieval: Search,
};

const agentNames = {
  nlp: "NLP Agent",
  reasoning: "Reasoning Agent",
  data: "Data Agent",
  cv: "Computer Vision Agent",
  critic: "Critic Agent",
  retrieval: "Retrieval Agent",
};

const agentDescriptions = {
  nlp: "Writing, summarization, and language processing",
  reasoning: "Logical validation and inference",
  data: "Numerical analysis and visualization",
  cv: "Image and visual data interpretation",
  critic: "Review, scoring, and quality assessment",
  retrieval: "Research discovery and information gathering",
};

type AgentStatus = "active" | "idle" | "reasoning";

interface AgentCardProps {
  agentType: AgentType;
  status: AgentStatus;
  taskSummary?: string;
  onPing?: () => void;
  onAssignTask?: () => void;
}

export function AgentCard({
  agentType,
  status,
  taskSummary,
  onPing,
  onAssignTask,
}: AgentCardProps) {
  const Icon = agentIcons[agentType];
  const name = agentNames[agentType];
  const description = agentDescriptions[agentType];

  const statusConfig = {
    active: {
      color: "bg-emerald-500",
      label: "Active",
      animation: "animate-pulse-glow-green",
      badge: "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300",
    },
    idle: {
      color: "bg-slate-400",
      label: "Idle",
      animation: "",
      badge: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400",
    },
    reasoning: {
      color: "bg-amber-500",
      label: "Reasoning",
      animation: "animate-pulse-glow-amber",
      badge: "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300",
    },
  };

  const config = statusConfig[status];

  return (
    <Card
      className={`p-6 hover-elevate transition-all duration-300 ${config.animation}`}
      data-testid={`agent-card-${agentType}`}
    >
      <div className="flex items-start gap-4">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10">
          <Icon className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-semibold" data-testid={`text-agent-name-${agentType}`}>
              {name}
            </h3>
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${config.color}`} />
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-3">{description}</p>
          <Badge variant="secondary" className={config.badge}>
            {config.label}
          </Badge>
        </div>
      </div>

      {taskSummary && (
        <div className="mt-4 p-3 rounded-lg bg-muted/50">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Current Task: </span>
            {taskSummary}
          </p>
        </div>
      )}

      <div className="flex gap-2 mt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={onPing}
          data-testid={`button-ping-${agentType}`}
          className="flex-1"
        >
          Ping Agent
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={onAssignTask}
          data-testid={`button-assign-${agentType}`}
          className="flex-1"
        >
          Assign Task
        </Button>
      </div>
    </Card>
  );
}
