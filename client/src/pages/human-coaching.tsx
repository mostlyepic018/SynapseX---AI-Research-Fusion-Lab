import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Send, TrendingUp } from "lucide-react";

interface FeedbackLog {
  id: string;
  feedback: string;
  agentResponse: string;
  timestamp: Date;
}

export default function HumanCoaching() {
  const [feedback, setFeedback] = useState("");
  const [logs, setLogs] = useState<FeedbackLog[]>([
    {
      id: "1",
      feedback: "Focus more on dataset bias analysis",
      agentResponse: "Reasoning Agent: Adjusted analysis threshold to emphasize bias detection. Increased dataset scrutiny by 40%.",
      timestamp: new Date(Date.now() - 1000 * 60 * 30),
    },
  ]);

  const handleSubmitFeedback = () => {
    if (!feedback.trim()) return;

    const newLog: FeedbackLog = {
      id: Date.now().toString(),
      feedback: feedback,
      agentResponse: "Feedback received. Agents are adapting their approach...",
      timestamp: new Date(),
    };

    setLogs((prev) => [newLog, ...prev]);
    setFeedback("");
  };

  return (
    <div className="container max-w-6xl mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">Human-in-the-Loop Coaching</h1>
        <p className="text-lg text-muted-foreground">
          Guide AI agents with feedback to improve their research analysis
        </p>
      </div>

      <Separator />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <GraduationCap className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold">Provide Guidance</h2>
            </div>
            <Textarea
              placeholder="E.g., 'Focus on dataset bias', 'Add comparison with 2024 papers', 'Emphasize methodology validation'..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="min-h-[120px] mb-4"
              data-testid="textarea-coaching-feedback"
            />
            <Button
              onClick={handleSubmitFeedback}
              disabled={!feedback.trim()}
              data-testid="button-submit-feedback"
            >
              <Send className="w-4 h-4 mr-2" />
              Send Feedback
            </Button>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Feedback History</h2>
            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-4 rounded-lg border bg-muted/30 space-y-3 animate-fade-in"
                    data-testid={`feedback-log-${log.id}`}
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary">Your Feedback</Badge>
                        <span className="text-xs text-muted-foreground">
                          {log.timestamp.toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm">{log.feedback}</p>
                    </div>
                    <Separator />
                    <div>
                      <Badge className="bg-primary/10 text-primary mb-2">Agent Adaptation</Badge>
                      <p className="text-sm text-muted-foreground">{log.agentResponse}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Learning Progress
            </h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Bias Detection</span>
                  <span className="font-medium">+40%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary w-[70%]" />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Citation Quality</span>
                  <span className="font-medium">+25%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-chart-2 w-[55%]" />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Analysis Depth</span>
                  <span className="font-medium">+15%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-chart-3 w-[45%]" />
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="font-semibold mb-3">Suggested Guidance</h3>
            <div className="space-y-2">
              {[
                "Compare with 2024 research",
                "Validate statistical methods",
                "Check dataset diversity",
                "Review citation accuracy",
              ].map((suggestion, i) => (
                <Button
                  key={i}
                  variant="outline"
                  className="w-full justify-start text-sm h-auto py-2"
                  onClick={() => setFeedback(suggestion)}
                  data-testid={`button-suggestion-${i}`}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
