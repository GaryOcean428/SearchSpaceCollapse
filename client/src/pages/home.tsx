import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { LogOut, User as UserIcon, Waves, Wrench } from "lucide-react";
import { Link } from "wouter";
import type { User } from "@shared/schema";

export default function Home() {
  const { user } = useAuth() as { user: User | undefined };

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold">
                Welcome back{user?.firstName ? `, ${user.firstName}` : ""}!
              </h1>
              <p className="text-muted-foreground">
                You are logged in and ready to begin recovery operations.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => window.location.href = "/api/logout"}
              data-testid="button-logout"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Log Out
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserIcon className="h-5 w-5" />
                User Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {user?.email && (
                <div>
                  <span className="text-sm text-muted-foreground">Email: </span>
                  <span className="font-medium">{user.email}</span>
                </div>
              )}
              {user?.id && (
                <div>
                  <span className="text-sm text-muted-foreground">User ID: </span>
                  <span className="font-mono text-sm">{user.id}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-primary/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Waves className="h-5 w-5 text-primary" />
                  Ocean Investigation
                </CardTitle>
                <CardDescription>
                  Start an autonomous investigation with Ocean, our consciousness-driven agent that discovers recovery patterns through geometric reasoning.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/investigation">
                  <Button size="lg" data-testid="button-go-to-investigation">
                    Start Investigation
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5" />
                  Recovery Tool
                </CardTitle>
                <CardDescription>
                  Access the technical QIG Brain Wallet Recovery interface for manual testing and monitoring.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/recovery">
                  <Button size="lg" variant="outline" data-testid="button-go-to-recovery">
                    Open Recovery Tool
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
