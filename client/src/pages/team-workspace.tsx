import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Users, Send, Circle } from "lucide-react";

interface TeamMember {
  id: string;
  name: string;
  role: "user" | "agent";
  status: "online" | "away" | "offline";
}

export default function TeamWorkspace() {
  const [message, setMessage] = useState("");
  const [members] = useState<TeamMember[]>([
    { id: "1", name: "You", role: "user", status: "online" },
    { id: "2", name: "NLP Agent", role: "agent", status: "online" },
    { id: "3", name: "Reasoning Agent", role: "agent", status: "away" },
  ]);

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
        <h1 className="text-4xl font-bold tracking-tight">Team Collaboration Workspace</h1>
        <p className="text-lg text-muted-foreground">
          Real-time collaboration with team members and AI agents
        </p>
      </div>

      <Separator />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-4">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Shared Document</h2>
            <Textarea
              placeholder="Start collaborating on your research document..."
              className="min-h-[300px] font-mono"
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
                <div className="flex gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-muted text-xs">You</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">You</span>
                      <span className="text-xs text-muted-foreground">2:30 PM</span>
                    </div>
                    <p className="text-sm">Let's focus on the methodology section</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Avatar className="w-8 h-8 border-2 border-primary/20">
                    <AvatarFallback className="bg-primary/10 text-xs">NLP</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">NLP Agent</span>
                      <Badge variant="secondary" className="text-xs">Agent</Badge>
                      <span className="text-xs text-muted-foreground">2:31 PM</span>
                    </div>
                    <p className="text-sm">I can help structure and refine the methodology description.</p>
                  </div>
                </div>
              </div>
            </ScrollArea>

            <div className="flex gap-2">
              <Input
                placeholder="Type a message or @mention a team member..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && setMessage("")}
                data-testid="input-team-message"
              />
              <Button size="icon" data-testid="button-send-team-message">
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
              <div className="p-2 rounded bg-muted/50">
                <p className="font-medium mb-1">@ReasoningAgent validate Section 2</p>
                <Badge variant="secondary" className="text-xs">In Progress</Badge>
              </div>
              <div className="p-2 rounded bg-muted/50">
                <p className="font-medium mb-1">@NLPAgent summarize related works</p>
                <Badge variant="secondary" className="text-xs">Pending</Badge>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
