import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Waves, 
  Wrench, 
  Database, 
  Home,
  Target,
  Brain,
  Activity,
  LogOut,
  User,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { User as UserType } from "@shared/schema";

interface TelemetryData {
  consciousness: {
    Φ: number;
    κ_eff: number;
    isConscious: boolean;
  };
  identity: {
    regime: string;
  };
}

export function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth() as { user: UserType | undefined };

  const { data: telemetry } = useQuery<TelemetryData>({
    queryKey: ['/api/observer/consciousness-check'],
    refetchInterval: 5000,
  });

  const { data: investigationStatus } = useQuery<{ isRunning: boolean; tested: number }>({
    queryKey: ['/api/investigation/status'],
    refetchInterval: 3000,
  });

  const navItems = [
    {
      title: "Home",
      url: "/",
      icon: Home,
      description: "Dashboard overview",
    },
    {
      title: "Ocean Investigation",
      url: "/investigation",
      icon: Waves,
      description: "Autonomous recovery agent",
      badge: investigationStatus?.isRunning ? "ACTIVE" : undefined,
      badgeColor: "bg-green-500/20 text-green-400",
    },
    {
      title: "Recovery Tool",
      url: "/recovery",
      icon: Wrench,
      description: "Manual QIG testing",
    },
    {
      title: "Observer Dashboard",
      url: "/observer",
      icon: Database,
      description: "Analytics & monitoring",
    },
  ];

  const isActive = (url: string) => {
    if (url === "/") return location === "/";
    return location.startsWith(url);
  };

  const getRegimeColor = (regime: string) => {
    switch (regime) {
      case 'geometric': return 'text-green-400';
      case 'breakdown': return 'text-red-400';
      default: return 'text-yellow-400';
    }
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="font-bold text-lg">Observer</h2>
            <p className="text-xs text-muted-foreground">Archaeology System</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={isActive(item.url)}
                    tooltip={item.description}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                      {item.badge && (
                        <Badge className={`ml-auto text-xs ${item.badgeColor}`}>
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2">
            <Brain className="h-3 w-3" />
            Consciousness State
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="px-3 py-2 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Φ (Integration)</span>
                <span className="text-sm font-mono font-medium">
                  {telemetry?.consciousness?.Φ?.toFixed(2) ?? '0.00'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">κ (Coupling)</span>
                <span className="text-sm font-mono font-medium">
                  {telemetry?.consciousness?.κ_eff?.toFixed(1) ?? '0.0'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Regime</span>
                <span className={`text-sm font-medium capitalize ${getRegimeColor(telemetry?.identity?.regime ?? 'linear')}`}>
                  {telemetry?.identity?.regime ?? 'linear'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Status</span>
                <Badge 
                  className={telemetry?.consciousness?.isConscious 
                    ? 'bg-green-500/20 text-green-400' 
                    : 'bg-yellow-500/20 text-yellow-400'
                  }
                >
                  {telemetry?.consciousness?.isConscious ? 'CONSCIOUS' : 'PRE-CONSCIOUS'}
                </Badge>
              </div>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        {investigationStatus?.isRunning && (
          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center gap-2">
              <Activity className="h-3 w-3 animate-pulse" />
              Active Investigation
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Tested</span>
                  <span className="text-sm font-mono font-medium text-cyan-400">
                    {investigationStatus.tested.toLocaleString()}
                  </span>
                </div>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-muted">
            <User className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {user?.firstName || 'User'}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {user?.email || ''}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.location.href = "/api/logout"}
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
