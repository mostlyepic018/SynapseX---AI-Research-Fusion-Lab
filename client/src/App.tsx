import { Switch, Route, Redirect, useLocation } from "wouter";
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
import TeamWorkspace from "@/pages/team-workspace";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";
import { ProtectedRoute, RedirectIfAuthed } from "@/components/protected-route";

function Router() {
  return (
    <Switch>
      <Route path="/">
        <Redirect to="/login" />
      </Route>
      <Route path="/login">
        <RedirectIfAuthed to="/agents" />
        <LoginPage />
      </Route>
      <Route path="/agents" component={() => <ProtectedRoute component={MultiAgentLab} />} />
      <Route path="/papers" component={() => <ProtectedRoute component={PaperExplorer} />} />
      <Route path="/chat" component={() => <ProtectedRoute component={ChatWithPaper} />} />
      <Route path="/related" component={() => <ProtectedRoute component={RelatedResearch} />} />
      <Route path="/generator" component={() => <ProtectedRoute component={PaperGenerator} />} />
      <Route path="/graph" component={() => <ProtectedRoute component={KnowledgeGraph} />} />
      <Route path="/workspace" component={() => <ProtectedRoute component={TeamWorkspace} />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [location] = useLocation();
  const sidebarStyle = {
    "--sidebar-width": "280px",
    "--sidebar-width-icon": "64px",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          {location !== "/login" ? (
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
          ) : (
            <div className="min-h-screen flex items-center justify-center p-6">
              <div className="w-full max-w-2xl">
                <Router />
              </div>
            </div>
          )}
          <AgentConsole />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
