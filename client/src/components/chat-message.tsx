import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Brain, User } from "lucide-react";
import type { Message } from "@/types/schema";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import mermaid from "mermaid";
import type { Components } from "react-markdown";

const agentNames = {
  nlp: "NLP Agent",
  reasoning: "Reasoning Agent",
  data: "Data Agent",
  cv: "CV Agent",
  critic: "Critic Agent",
  retrieval: "Retrieval Agent",
};

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isAgent = message.role === "agent";
  const agentName = message.agentType ? agentNames[message.agentType as keyof typeof agentNames] : "AI Agent";

  return (
    <div
      className={cn(
        "flex gap-3 mb-4 animate-fade-in",
        isAgent ? "justify-start" : "justify-end"
      )}
      data-testid={`message-${message.id}`}
    >
      {isAgent && (
        <Avatar className="w-8 h-8 border-2 border-primary/20">
          <AvatarFallback className="bg-primary/10">
            <Brain className="w-4 h-4 text-primary" />
          </AvatarFallback>
        </Avatar>
      )}

      <div className={cn("flex flex-col gap-1.5 max-w-[80%]", isAgent ? "items-start" : "items-end")}>
        {isAgent && message.agentType && (
          <Badge
            variant="secondary"
            className="bg-primary/10 text-primary text-xs"
            data-testid={`badge-agent-${message.agentType}`}
          >
            {agentName}
          </Badge>
        )}

        <div
          className={cn(
            "px-4 py-3 rounded-lg prose prose-invert max-w-none",
            isAgent
              ? "bg-primary/5 dark:bg-primary/10 rounded-tl-none"
              : "bg-muted rounded-tr-none"
          )}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({ inline, className, children, ...props }: { inline?: boolean; className?: string; children?: any }) {
                const txt = String(children ?? "");
                const lang = (className || "").replace("language-", "");
                if (!inline && (lang === "mermaid" || txt.trim().startsWith("mermaid"))) {
                  const id = `mmd-${message.id}`;
                  const def = lang === "mermaid" ? txt : txt.replace(/^mermaid\n/, "");
                  // Mermaid v11 render is async; return a container and fill it after mount
                  setTimeout(async () => {
                    try {
                      const el = document.getElementById(id);
                      if (!el) return;
                      const res = await mermaid.render(id + "-svg", def);
                      el.innerHTML = res.svg; // eslint-disable-line react/no-danger
                    } catch {}
                  }, 0);
                  return <div id={id} className="overflow-auto" />;
                }
                return <code className={className} {...props}>{children}</code>;
              }
            } as Components}
          >
            {message.content}
          </ReactMarkdown>
        </div>

        <span className="text-xs text-muted-foreground px-1">
          {new Date(message.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>

      {!isAgent && (
        <Avatar className="w-8 h-8 border-2 border-muted">
          <AvatarFallback className="bg-muted">
            <User className="w-4 h-4" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
