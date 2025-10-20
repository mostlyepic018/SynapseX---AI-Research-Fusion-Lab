import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Brain, Database, Eye, Lightbulb, MessageSquare, Search } from "lucide-react";
import type { AgentType } from "@/types/schema";

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

interface AssignTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentType: AgentType | null;
  onSubmit: (task: TaskAssignment) => void;
}

export interface TaskAssignment {
  agentType: AgentType;
  taskTitle: string;
  taskDescription: string;
  priority: "low" | "medium" | "high";
  paperId?: string;
}

export function AssignTaskDialog({
  open,
  onOpenChange,
  agentType,
  onSubmit,
}: AssignTaskDialogProps) {
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const priorityValue: "low" | "medium" | "high" = (priority === "low" || priority === "medium" || priority === "high") ? priority : "medium";

  const handleSubmit = () => {
    if (!agentType || !taskTitle.trim()) return;

    onSubmit({
      agentType,
      taskTitle: taskTitle.trim(),
      taskDescription: taskDescription.trim(),
      priority,
    });

    // Reset form
    setTaskTitle("");
    setTaskDescription("");
    setPriority("medium");
    onOpenChange(false);
  };

  const Icon = agentType ? agentIcons[agentType] : Brain;
  const agentName = agentType ? agentNames[agentType] : "Agent";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <span>Assign Task to {agentName}</span>
          </DialogTitle>
          <DialogDescription>
            Create a new task for the AI agent to work on. The agent will start processing
            immediately after assignment.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="task-title">Task Title *</Label>
            <Input
              id="task-title"
              placeholder="e.g., Analyze methodology in Section 3"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              data-testid="input-task-title"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="task-description">Task Description</Label>
            <Textarea
              id="task-description"
              placeholder="Provide detailed instructions for the agent..."
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
              className="min-h-[120px]"
              data-testid="textarea-task-description"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="priority">Priority Level</Label>
            <Select value={priorityValue} onValueChange={(v: any) => setPriority(v)}>
              <SelectTrigger id="priority" data-testid="select-priority">
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800">
                      Low
                    </Badge>
                    <span className="text-sm text-muted-foreground">Process when available</span>
                  </div>
                </SelectItem>
                <SelectItem value="medium">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-950">
                      Medium
                    </Badge>
                    <span className="text-sm text-muted-foreground">Standard priority</span>
                  </div>
                </SelectItem>
                <SelectItem value="high">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-red-100 dark:bg-red-950">
                      High
                    </Badge>
                    <span className="text-sm text-muted-foreground">Urgent task</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border bg-muted/30 p-4">
            <h4 className="text-sm font-medium mb-2">Agent Capabilities</h4>
            <p className="text-sm text-muted-foreground">
              {agentType === "nlp" &&
                "This agent specializes in natural language processing, text analysis, summarization, and content generation."}
              {agentType === "reasoning" &&
                "This agent focuses on logical validation, inference, methodology assessment, and identifying biases."}
              {agentType === "data" &&
                "This agent handles statistical analysis, numerical interpretation, dataset evaluation, and trend identification."}
              {agentType === "cv" &&
                "This agent interprets images, figures, charts, and visual data from research papers."}
              {agentType === "critic" &&
                "This agent provides quality assessment, identifies weaknesses, scores research, and suggests improvements."}
              {agentType === "retrieval" &&
                "This agent discovers related papers, finds datasets, manages citations, and connects research threads."}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel-task"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!taskTitle.trim()}
            data-testid="button-submit-task"
          >
            Assign Task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
