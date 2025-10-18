import { useState, useEffect } from "react";
import { AgentCard } from "@/components/agent-card";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Terminal } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { askAgent } from "@/lib/api";
import { useWebSocket } from "@/lib/websocket";
import { useToast } from "@/hooks/use-toast";
import { AGENT_TYPES, type AgentType } from "@shared/schema";

type AgentStatus = "active" | "idle" | "reasoning";

interface AgentState {
  type: AgentType;
  status: AgentStatus;
  taskSummary?: string;
}

export default function MultiAgentLab() {
  const { toast } = useToast();
  const [agents, setAgents] = useState<AgentState[]>([
    {
      type: AGENT_TYPES.NLP,
      status: "active",
      taskSummary: "Analyzing paper abstracts for key themes",
    },
    {
      type: AGENT_TYPES.REASONING,
      status: "reasoning",
      taskSummary: "Validating methodology in Section 3",
    },
    {
      type: AGENT_TYPES.DATA,
      status: "idle",
    },
    {
      type: AGENT_TYPES.CV,
      status: "idle",
    },
    {
      type: AGENT_TYPES.CRITIC,
      status: "active",
      taskSummary: "Reviewing generated summary for accuracy",
    },
    {
      type: AGENT_TYPES.RETRIEVAL,
      status: "idle",
    },
  ]);

  const [logs, setLogs] = useState<Array<{ agent: string; message: string; timestamp: Date }>>([
    {
      agent: "NLP Agent",
      message: "Successfully extracted 12 key themes from abstract corpus",
      timestamp: new Date(Date.now() - 1000 * 60 * 2),
    },
    {
      agent: "Reasoning Agent",
      message: "Detected potential bias in dataset selection methodology",
      timestamp: new Date(Date.now() - 1000 * 60),
    },
    {
      agent: "Critic Agent",
      message: "Summary quality score: 8.5/10 - Suggests minor improvements",
      timestamp: new Date(Date.now() - 1000 * 30),
    },
  ]);

  const { sendMessage } = useWebSocket((message) => {
    if (message.type === "agent_log") {
      setLogs((prev) => [...prev, {
        agent: message.data.agent,
        message: message.data.message,
        timestamp: new Date(),
      }]);
    }
  });

  const pingAgentMutation = useMutation({
    mutationFn: (data: { role: AgentType; query: string }) => askAgent(data),
    onSuccess: (response, variables) => {
      const agentName = variables.role.toUpperCase() + " Agent";
      setLogs((prev) => [...prev, {
        agent: agentName,
        message: `Ping received: ${response.response}`,
        timestamp: new Date(),
      }]);
      
      sendMessage({
        type: "agent_log",
        data: { agent: agentName, message: `Ping received: ${response.response}` },
      });

      toast({
        title: "Agent pinged",
        description: `${agentName} responded successfully`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to ping agent",
        variant: "destructive",
      });
    },
  });

  const handlePingAgent = (type: AgentType) => {
    pingAgentMutation.mutate({ role: type, query: "Status check - please confirm you are operational" });
  };

  const handleAssignTask = (type: AgentType) => {
    toast({
      title: "Task assignment",
      description: "Task assignment dialog would open here (to be implemented)",
    });
  };

  return (
    <div className="container max-w-7xl mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">Multi-Agent Collaboration Lab</h1>
        <p className="text-lg text-muted-foreground">
          Monitor and coordinate AI agents working together on research tasks
        </p>
      </div>

      <Separator />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((agent) => (
          <AgentCard
            key={agent.type}
            agentType={agent.type}
            status={agent.status}
            taskSummary={agent.taskSummary}
            onPing={() => handlePingAgent(agent.type)}
            onAssignTask={() => handleAssignTask(agent.type)}
          />
        ))}
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Terminal className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">Agent Communication Terminal</h2>
        </div>
        <ScrollArea className="h-[300px] rounded-lg border bg-muted/30 p-4">
          <div className="space-y-3 font-mono text-sm">
            {logs.map((log, index) => (
              <div key={index} className="animate-fade-in" data-testid={`log-entry-${index}`}>
                <div className="flex items-start gap-2">
                  <span className="text-muted-foreground shrink-0">
                    [{log.timestamp.toLocaleTimeString()}]
                  </span>
                  <span className="text-primary font-medium shrink-0">{log.agent}:</span>
                  <span className="text-foreground">{log.message}</span>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
}
