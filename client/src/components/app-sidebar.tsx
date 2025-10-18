import {
  Brain,
  Search,
  MessageSquare,
  GitBranch,
  FileText,
  Network,
  GraduationCap,
  Users,
  ChevronRight,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const navigationItems = [
  {
    title: "Multi-Agent Lab",
    url: "/agents",
    icon: Brain,
    testId: "nav-agents",
  },
  {
    title: "Paper Explorer",
    url: "/papers",
    icon: Search,
    testId: "nav-papers",
  },
  {
    title: "Chat with Paper",
    url: "/chat",
    icon: MessageSquare,
    testId: "nav-chat",
  },
  {
    title: "Related Research",
    url: "/related",
    icon: GitBranch,
    testId: "nav-related",
  },
  {
    title: "Paper Generator",
    url: "/generator",
    icon: FileText,
    testId: "nav-generator",
  },
  {
    title: "Knowledge Graph",
    url: "/graph",
    icon: Network,
    testId: "nav-graph",
  },
  {
    title: "Human Coaching",
    url: "/coaching",
    icon: GraduationCap,
    testId: "nav-coaching",
  },
  {
    title: "Team Workspace",
    url: "/workspace",
    icon: Users,
    testId: "nav-workspace",
  },
];

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar>
      <SidebarHeader className="p-6 border-b">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary">
            <Brain className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">SynapseX</h1>
            <p className="text-xs text-muted-foreground">AI Research Lab</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Research Tools</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => {
                const isActive = location === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      data-testid={item.testId}
                      className="group"
                    >
                      <Link href={item.url}>
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
                        {isActive && (
                          <ChevronRight className="ml-auto w-4 h-4 text-primary" />
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t">
        <div className="flex items-center gap-3 p-2 rounded-lg hover-elevate">
          <Avatar className="w-8 h-8">
            <AvatarFallback className="bg-primary text-primary-foreground text-sm">
              RS
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">Researcher</p>
            <p className="text-xs text-muted-foreground truncate">researcher@synapsex.ai</p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
