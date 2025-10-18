import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Terminal, X, Minimize2, Maximize2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface AgentLog {
  id: string;
  agent: string;
  message: string;
  timestamp: Date;
  type: "info" | "success" | "warning";
}

export function AgentConsole() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [logs] = useState<AgentLog[]>([
    {
      id: "1",
      agent: "NLP Agent",
      message: "Processing abstract extraction...",
      timestamp: new Date(),
      type: "info",
    },
    {
      id: "2",
      agent: "Reasoning Agent",
      message: "Validation complete: 95% confidence",
      timestamp: new Date(),
      type: "success",
    },
  ]);

  const getTypeColor = (type: AgentLog["type"]) => {
    switch (type) {
      case "success":
        return "text-emerald-500";
      case "warning":
        return "text-amber-500";
      default:
        return "text-primary";
    }
  };

  return (
    <>
      {!isOpen && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="fixed bottom-6 right-6 z-50"
        >
          <Button
            onClick={() => setIsOpen(true)}
            className="h-14 px-6 shadow-lg animate-pulse-glow"
            data-testid="button-agent-console"
          >
            <Terminal className="w-5 h-5 mr-2" />
            Agent Console
            <Badge className="ml-2 bg-emerald-500 text-white">
              {logs.length}
            </Badge>
          </Button>
        </motion.div>
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ y: 400, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 400, opacity: 0 }}
            transition={{ type: "spring", damping: 25 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <Card className={`shadow-2xl ${isMinimized ? "w-80" : "w-96"}`}>
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold">Agent Console</h3>
                  <Badge variant="secondary">{logs.length} logs</Badge>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setIsMinimized(!isMinimized)}
                  >
                    {isMinimized ? (
                      <Maximize2 className="w-3.5 h-3.5" />
                    ) : (
                      <Minimize2 className="w-3.5 h-3.5" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setIsOpen(false)}
                    data-testid="button-close-console"
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {!isMinimized && (
                <ScrollArea className="h-80">
                  <div className="p-4 space-y-3 font-mono text-xs">
                    {logs.map((log) => (
                      <div
                        key={log.id}
                        className="p-3 rounded-lg bg-muted/30 border animate-fade-in"
                        data-testid={`console-log-${log.id}`}
                      >
                        <div className="flex items-start gap-2 mb-1">
                          <span className="text-muted-foreground shrink-0">
                            [{log.timestamp.toLocaleTimeString()}]
                          </span>
                          <span className={`font-medium ${getTypeColor(log.type)}`}>
                            {log.agent}
                          </span>
                        </div>
                        <p className="text-foreground/90 ml-[88px]">{log.message}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
