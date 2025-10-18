import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { AgentConsole } from "@/components/agent-console";
import MultiAgentLab from "@/pages/multi-agent-lab";
import PaperExplorer from "@/pages/paper-explorer";
import ChatWithPaper from "@/pages/chat-with-paper";
import RelatedResearch from "@/pages/related-research";
import PaperGenerator from "@/pages/paper-generator";
import KnowledgeGraph from "@/pages/knowledge-graph";
import HumanCoaching from "@/pages/human-coaching";
import TeamWorkspace from "@/pages/team-workspace";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/">
        <Redirect to="/agents" />
      </Route>
      <Route path="/agents" component={MultiAgentLab} />
      <Route path="/papers" component={PaperExplorer} />
      <Route path="/chat" component={ChatWithPaper} />
      <Route path="/related" component={RelatedResearch} />
      <Route path="/generator" component={PaperGenerator} />
      <Route path="/graph" component={KnowledgeGraph} />
      <Route path="/coaching" component={HumanCoaching} />
      <Route path="/workspace" component={TeamWorkspace} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const sidebarStyle = {
    "--sidebar-width": "280px",
    "--sidebar-width-icon": "64px",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <SidebarProvider style={sidebarStyle as React.CSSProperties}>
            <div className="flex h-screen w-full">
              <AppSidebar />
              <div className="flex flex-col flex-1 min-w-0">
                <header className="flex items-center justify-between h-16 px-6 border-b shrink-0">
                  <div className="flex items-center gap-4">
                    <SidebarTrigger data-testid="button-sidebar-toggle" />
                    <div>
                      <h2 className="text-lg font-semibold">SynapseX Research Lab</h2>
                      <p className="text-xs text-muted-foreground">AI-Powered Collaboration Platform</p>
                    </div>
                  </div>
                  <ThemeToggle />
                </header>
                <main className="flex-1 overflow-auto">
                  <Router />
                </main>
              </div>
            </div>
          </SidebarProvider>
          <AgentConsole />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
