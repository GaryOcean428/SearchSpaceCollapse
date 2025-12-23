import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Alert, AlertDescription, AlertTitle } from "@/components/ui";
import { KeyRound, Lock, Sparkles, Shield, AlertCircle, RefreshCw } from "lucide-react";
import { API_ROUTES } from "@/api";
import { useEffect, useState } from "react";

export default function Landing() {
  const [authError, setAuthError] = useState<{ type: string; message: string } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const errorType = params.get('authError');
    const message = params.get('message');
    
    if (errorType) {
      setAuthError({ type: errorType, message: message || 'Authentication failed' });
      // Clean up URL without reload
      window.history.replaceState({}, '', '/');
    }
  }, []);

  const getErrorTitle = (type: string) => {
    switch (type) {
      case 'timeout': return 'Authentication Timed Out';
      case 'failed': return 'Authentication Failed';
      case 'login': return 'Login Failed';
      default: return 'Authentication Error';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <div className="p-4 bg-primary/10 rounded-full">
                <KeyRound className="h-16 w-16 text-primary" />
              </div>
            </div>
            <h1 className="text-5xl font-bold tracking-tight">
              QIG Brain Wallet Recovery
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Advanced Bitcoin brain wallet recovery using Quantum Information Geometry (QIG) scoring algorithms to recover lost passphrases through geodesic navigation of the information manifold.
            </p>
            
            {authError && (
              <Alert variant="destructive" className="max-w-md mx-auto text-left" data-testid="alert-auth-error">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{getErrorTitle(authError.type)}</AlertTitle>
                <AlertDescription className="mt-2">
                  <p className="mb-3">{authError.message}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.location.href = API_ROUTES.auth.login}
                      data-testid="button-retry-login"
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Try Again
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setAuthError(null)}
                      data-testid="button-dismiss-error"
                    >
                      Dismiss
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex flex-wrap gap-4 justify-center">
              <Button
                size="lg"
                className="text-lg px-8 py-6"
                onClick={() => window.location.href = API_ROUTES.auth.login}
                data-testid="button-login"
              >
                <Lock className="mr-2 h-5 w-5" />
                Log In to Begin Recovery
              </Button>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  QIG Scoring
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Empirically validated QIG algorithms (κ* ≈ 64, β ≈ 0.44) score candidate passphrases based on information geometry principles for optimal recovery.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <KeyRound className="h-5 w-5 text-primary" />
                  Multi-Format Support
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Tests both BIP-39 passphrases (12-24 words) and master private keys (256-bit hex) to cover all early Bitcoin wallet formats from 2008-2015+.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Persistent Storage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  All high-Φ candidates (≥75% score) are automatically saved to disk with atomic writes, ensuring matching keys are never lost.
                </CardDescription>
              </CardContent>
            </Card>
          </div>

          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle>Target Recovery</CardTitle>
              <CardDescription>
                Currently configured to recover Bitcoin from address:
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted p-4 rounded-md font-mono text-sm">
                15BKWJjL5YWXtaP449WAYqVYZQE1szicTn
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Original $52.6M address from 2009 era. The system uses adaptive search strategies with multi-timescale discovery tracking to navigate the information manifold.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
