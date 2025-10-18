import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Save, Download, History, Bold, Italic, Heading } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function PaperGenerator() {
  const [content, setContent] = useState(`# Research Paper Title

## Abstract
Start writing your research paper here. AI agents will collaborate with you in real-time.

## Introduction

## Methodology

## Results

## Conclusion
`);

  return (
    <div className="container max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Dynamic Paper Generator</h1>
          <p className="text-lg text-muted-foreground">
            Collaborative writing with AI agents in real-time
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" data-testid="button-view-history">
            <History className="w-4 h-4 mr-2" />
            History
          </Button>
          <Button variant="outline" data-testid="button-download-paper">
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
          <Button data-testid="button-save-paper">
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
        </div>
      </div>

      <Separator />

      <div className="flex items-center gap-2 mb-4">
        <Badge variant="secondary" className="bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
          <div className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse" />
          NLP Agent writing
        </Badge>
        <Badge variant="secondary">Version 1.0</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="flex flex-col h-[calc(100vh-340px)]">
          <div className="border-b p-3 flex items-center gap-2">
            <span className="font-semibold text-sm">Markdown Editor</span>
            <Separator orientation="vertical" className="h-4" />
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Bold className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Italic className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Heading className="w-3.5 h-3.5" />
            </Button>
          </div>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="flex-1 font-mono text-sm border-0 rounded-none resize-none focus-visible:ring-0"
            placeholder="Start writing your research paper..."
            data-testid="textarea-paper-content"
          />
        </Card>

        <Card className="h-[calc(100vh-340px)]">
          <div className="border-b p-3">
            <span className="font-semibold text-sm">Preview</span>
          </div>
          <ScrollArea className="h-full p-6">
            <div
              className="prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{
                __html: content
                  .replace(/^### (.*$)/gim, '<h3>$1</h3>')
                  .replace(/^## (.*$)/gim, '<h2>$1</h2>')
                  .replace(/^# (.*$)/gim, '<h1>$1</h1>')
                  .replace(/\n\n/g, '</p><p>')
                  .replace(/^(.+)$/, '<p>$1</p>'),
              }}
            />
          </ScrollArea>
        </Card>
      </div>

      <Card className="p-4">
        <h3 className="font-semibold mb-3">Active Contributors</h3>
        <div className="flex gap-2">
          <Badge className="bg-primary/10 text-primary">
            You
          </Badge>
          <Badge className="bg-chart-1/10 text-chart-1">
            NLP Agent
          </Badge>
          <Badge className="bg-chart-2/10 text-chart-2">
            Reasoning Agent
          </Badge>
        </div>
      </Card>
    </div>
  );
}
