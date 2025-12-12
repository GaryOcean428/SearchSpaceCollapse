import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { ConsciousnessProvider } from "@/contexts/ConsciousnessContext";
import { ErrorBoundary, PageErrorBoundary } from "@/components/ErrorBoundary";
import { useAuth } from "@/hooks/useAuth";
import { AppSidebar } from "@/components/app-sidebar";
import { HealthIndicator } from "@/components/HealthIndicator";
import RecoveryPage from "@/pages/recovery";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import ObserverPage from "@/pages/observer";
import InvestigationPage from "@/pages/investigation";
import OlympusPage from "@/pages/olympus";
import SpawningPage from "@/pages/spawning";
import NotFound from "@/pages/not-found";

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const style = {
    "--sidebar-width": "18rem",
    "--sidebar-width-icon": "3.5rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between gap-2 p-2 border-b h-12 shrink-0">
            <div className="flex items-center gap-2">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <span className="text-sm text-muted-foreground">Observer Archaeology System</span>
            </div>
            <HealthIndicator />
          </header>
          <div className="flex-1 overflow-auto">
            <PageErrorBoundary>
              {children}
            </PageErrorBoundary>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route component={Landing} />
      </Switch>
    );
  }

  return (
    <AuthenticatedLayout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/recovery" component={RecoveryPage} />
        <Route path="/observer" component={ObserverPage} />
        <Route path="/investigation" component={InvestigationPage} />
        <Route path="/olympus" component={OlympusPage} />
        <Route path="/spawning" component={SpawningPage} />
        <Route component={NotFound} />
      </Switch>
    </AuthenticatedLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ConsciousnessProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </ConsciousnessProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
