import { useState } from "react";
import { ChatMessage } from "@/components/chat-message";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Upload, Send, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useMutation } from "@tanstack/react-query";
import { chatWithPaper } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type { Message } from "@shared/schema";

export default function ChatWithPaper() {
  const [selectedPaper, setSelectedPaper] = useState<{ title: string; id: string } | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  const sendMessageMutation = useMutation({
    mutationFn: (data: { paperId: string; question: string }) => 
      chatWithPaper({ paperId: data.paperId, question: data.question }),
    onSuccess: (response) => {
      const agentMessage: Message = response.agentMessage;
      setMessages((prev) => [...prev, agentMessage]);
      setIsSending(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
      setIsSending(false);
    },
  });

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isSending || !selectedPaper) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      role: "user",
      agentType: null,
      paperId: selectedPaper.id,
      workspaceId: null,
      userId: null,
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const question = inputValue;
    setInputValue("");
    setIsSending(true);

    sendMessageMutation.mutate({ paperId: selectedPaper.id, question });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="container max-w-6xl mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">Chat with Research Paper</h1>
        <p className="text-lg text-muted-foreground">
          Ask questions and get intelligent answers about your research papers
        </p>
      </div>

      <Separator />

      {!selectedPaper ? (
        <Card className="p-12">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <Upload className="w-10 h-10 text-primary" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">Upload a Research Paper</h3>
              <p className="text-muted-foreground max-w-md">
                Upload a PDF or paste a paper link to start asking questions and get insights from AI agents
              </p>
            </div>
            <div className="flex gap-3">
              <Button data-testid="button-upload-pdf">
                <Upload className="w-4 h-4 mr-2" />
                Upload PDF
              </Button>
              <Button variant="outline" data-testid="button-paste-link">
                <FileText className="w-4 h-4 mr-2" />
                Paste Link
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Card className="p-4 bg-primary/5">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-primary" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{selectedPaper.title}</h3>
                  <p className="text-sm text-muted-foreground">Active paper for discussion</p>
                </div>
                <Badge>PDF Loaded</Badge>
              </div>
            </Card>

            <Card className="flex flex-col h-[calc(100vh-400px)]">
              <ScrollArea className="flex-1 p-6">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      <Send className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Start a Conversation</h3>
                    <p className="text-sm text-muted-foreground max-w-md">
                      Ask questions about the paper's methodology, datasets, findings, or request summaries
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <ChatMessage key={message.id} message={message} />
                    ))}
                  </div>
                )}
              </ScrollArea>

              <div className="border-t p-4">
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Ask a question about the paper..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="min-h-[60px] resize-none"
                    data-testid="input-chat-message"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!inputValue.trim() || isSending}
                    size="icon"
                    className="h-[60px] w-[60px] shrink-0"
                    data-testid="button-send-message"
                  >
                    <Send className="w-5 h-5" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Press Enter to send, Shift+Enter for new line
                </p>
              </div>
            </Card>
          </div>

          <div className="space-y-4">
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Suggested Questions</h3>
              <div className="space-y-2">
                {[
                  "What dataset was used?",
                  "Summarize the methodology",
                  "What are the key findings?",
                  "Compare with recent work",
                ].map((question, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    className="w-full justify-start text-sm h-auto py-2 px-3"
                    onClick={() => setInputValue(question)}
                    data-testid={`button-suggested-${i}`}
                  >
                    {question}
                  </Button>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
