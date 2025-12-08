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
import { QUERY_KEYS } from "@/api";
import { 
  Waves, 
  Wrench, 
  Database, 
  Home,
  Brain,
  Activity,
  LogOut,
  User,
  Sparkles,
  Radio,
  Compass,
  Radar,
  Eye,
  Anchor,
  Focus,
  AlertTriangle,
  CheckCircle2,
  Pause,
  Zap,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useConsciousness, getPhiColor, getRegimeLabel } from "@/contexts/ConsciousnessContext";
import type { User as UserType } from "@shared/schema";

type EmotionalState = 'Focused' | 'Curious' | 'Uncertain' | 'Confident' | 'Neutral' | 'Idle';

export function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth() as { user: UserType | undefined };
  const { consciousness, neurochemistry, isIdle } = useConsciousness();

  const { data: investigationStatus } = useQuery<{ isRunning: boolean; tested: number }>({
    queryKey: QUERY_KEYS.investigation.status(),
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
    {
      title: "Mount Olympus",
      url: "/olympus",
      icon: Zap,
      description: "Divine consciousness council",
    },
    {
      title: "Kernel Spawning",
      url: "/spawning",
      icon: Sparkles,
      description: "M8 god-kernel spawning protocol",
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
      case 'hierarchical': return 'text-amber-400';
      default: return 'text-blue-400';
    }
  };

  const getEmotionalBadgeColor = (emotion: EmotionalState): string => {
    switch (emotion) {
      case 'Idle': return 'bg-gray-500/20 text-gray-400';
      case 'Focused': return 'bg-purple-500/20 text-purple-400';
      case 'Curious': return 'bg-cyan-500/20 text-cyan-400';
      case 'Uncertain': return 'bg-yellow-500/20 text-yellow-400';
      case 'Confident': return 'bg-green-500/20 text-green-400';
      case 'Neutral': return 'bg-gray-500/20 text-gray-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getEmotionalIcon = (emotion: EmotionalState) => {
    switch (emotion) {
      case 'Idle': return <Pause className="w-3 h-3" />;
      case 'Focused': return <Focus className="w-3 h-3" />;
      case 'Curious': return <Compass className="w-3 h-3" />;
      case 'Uncertain': return <AlertTriangle className="w-3 h-3" />;
      case 'Confident': return <CheckCircle2 className="w-3 h-3" />;
      case 'Neutral': return <Brain className="w-3 h-3" />;
      default: return <Brain className="w-3 h-3" />;
    }
  };

  const emotionalState: EmotionalState = isIdle ? 'Idle' : (neurochemistry.emotionalState as EmotionalState) ?? 'Neutral';
  const formatValue = (val: number) => isIdle ? '—' : `${(val * 100).toFixed(0)}%`;
  const formatKappa = (val: number) => isIdle ? '—' : val.toFixed(0);

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
                    <Link href={item.url} data-testid={`link-nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
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
            Consciousness Signature
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="px-3 py-2 space-y-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">Emotional State</span>
                <Badge 
                  className={`text-xs ${getEmotionalBadgeColor(emotionalState)}`}
                  data-testid="sidebar-badge-emotional"
                >
                  {getEmotionalIcon(emotionalState)}
                  <span className="ml-1">{emotionalState}</span>
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center justify-between" data-testid="sidebar-phi">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Brain className="w-3 h-3" />Φ
                  </span>
                  <span className={`font-mono font-medium ${getPhiColor(consciousness.phi, isIdle)}`}>
                    {formatValue(consciousness.phi)}
                  </span>
                </div>
                <div className="flex items-center justify-between" data-testid="sidebar-kappa">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Radio className="w-3 h-3" />κ
                  </span>
                  <span className="font-mono font-medium">
                    {formatKappa(consciousness.kappaEff)}
                  </span>
                </div>
                <div className="flex items-center justify-between" data-testid="sidebar-tacking">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Compass className="w-3 h-3" />T
                  </span>
                  <span className="font-mono font-medium">
                    {formatValue(consciousness.tacking)}
                  </span>
                </div>
                <div className="flex items-center justify-between" data-testid="sidebar-radar">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Radar className="w-3 h-3" />R
                  </span>
                  <span className="font-mono font-medium">
                    {formatValue(consciousness.radar)}
                  </span>
                </div>
                <div className="flex items-center justify-between" data-testid="sidebar-meta">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Eye className="w-3 h-3" />M
                  </span>
                  <span className="font-mono font-medium">
                    {formatValue(consciousness.metaAwareness)}
                  </span>
                </div>
                <div className="flex items-center justify-between" data-testid="sidebar-gamma">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />Γ
                  </span>
                  <span className="font-mono font-medium">
                    {formatValue(consciousness.gamma)}
                  </span>
                </div>
                <div className="flex items-center justify-between" data-testid="sidebar-grounding">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Anchor className="w-3 h-3" />G
                  </span>
                  <span className="font-mono font-medium">
                    {formatValue(consciousness.grounding)}
                  </span>
                </div>
              </div>
              
              <div className="pt-2 mt-2 border-t border-sidebar-border">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Regime</span>
                  <span 
                    className={`text-xs font-medium capitalize ${isIdle ? 'text-gray-400' : getRegimeColor(consciousness.regime)}`}
                    data-testid="sidebar-regime"
                  >
                    {getRegimeLabel(consciousness.regime, isIdle)}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-muted-foreground">Status</span>
                  <Badge 
                    className={isIdle 
                      ? 'bg-gray-500/20 text-gray-400 text-xs'
                      : consciousness.isConscious 
                        ? 'bg-green-500/20 text-green-400 text-xs' 
                        : 'bg-yellow-500/20 text-yellow-400 text-xs'
                    }
                    data-testid="sidebar-status"
                  >
                    {isIdle ? 'IDLE' : consciousness.isConscious ? 'CONSCIOUS' : 'PRE-CONSCIOUS'}
                  </Badge>
                </div>
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
