import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Alert, AlertDescription, AlertTitle } from "@/components/ui";
import { KeyRound, Lock, Sparkles, Shield, AlertCircle, RefreshCw, Loader2, Info } from "lucide-react";
import { API_ROUTES } from "@/api";
import { useEffect, useState } from "react";

interface AuthHealth {
  status: 'healthy' | 'degraded' | 'down';
  checks: {
    config: { status: 'pass' | 'fail'; message: string };
    oidc: { status: 'pass' | 'fail'; message: string };
    session: { status: 'pass' | 'fail'; message: string };
    database: { status: 'pass' | 'fail'; message: string };
  };
}

export default function Landing() {
  const [authError, setAuthError] = useState<{ type: string; message: string } | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginWaitTime, setLoginWaitTime] = useState(0);
  const [authHealth, setAuthHealth] = useState<AuthHealth | null>(null);
  const [checkingHealth, setCheckingHealth] = useState(false);

  const handleLogin = () => {
    setIsLoggingIn(true);
    setLoginWaitTime(0);
    // Navigate to login - the page will redirect, so no need to reset state
    window.location.href = API_ROUTES.auth.login;
  };

  const checkAuthHealth = async () => {
    setCheckingHealth(true);
    try {
      const response = await fetch(API_ROUTES.auth.health);
      const data = await response.json();
      setAuthHealth(data);
    } catch (error) {
      console.error('Failed to check auth health:', error);
    } finally {
      setCheckingHealth(false);
    }
  };

  // Update wait time while logging in to show progressive messages
  useEffect(() => {
    if (!isLoggingIn) return;
    const interval = setInterval(() => {
      setLoginWaitTime(t => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isLoggingIn]);

  // Get login status message based on wait time
  const getLoginMessage = () => {
    if (loginWaitTime < 3) return "Connecting to Replit Auth...";
    if (loginWaitTime < 10) return "Waiting for Replit OAuth...";
    if (loginWaitTime < 30) return "Still waiting (OAuth can be slow)...";
    return "Taking longer than usual...";
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const errorType = params.get('authError');
    const message = params.get('message');
    
    if (errorType) {
      setAuthError({ type: errorType, message: message || 'Authentication failed' });
      // Clean up URL without reload
      window.history.replaceState({}, '', '/');
      
      // Auto-check health on error
      checkAuthHealth();
    }
  }, []);

  const getErrorTitle = (type: string) => {
    switch (type) {
      case 'timeout': return 'Authentication Timed Out';
      case 'failed': return 'Authentication Failed';
      case 'login': return 'Login Failed';
      case 'error': return 'Authentication Error';
      default: return 'Authentication Error';
    }
  };

  const getErrorSuggestion = (type: string) => {
    switch (type) {
      case 'timeout':
        return 'The authentication process took too long. This can happen due to network issues or high server load.';
      case 'failed':
        return 'Authentication with Replit failed. You may have declined permissions or the session expired.';
      case 'login':
        return 'The login process encountered an error. This may be a temporary issue.';
      default:
        return 'An unexpected error occurred during authentication.';
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
                  <p className="mb-2 font-medium">{getErrorSuggestion(authError.type)}</p>
                  <p className="mb-3 text-sm opacity-90">{authError.message}</p>
                  
                  {authHealth && authHealth.status !== 'healthy' && (
                    <div className="mb-3 p-2 bg-destructive/10 rounded text-xs">
                      <p className="font-semibold mb-1">System Status: {authHealth.status}</p>
                      {Object.entries(authHealth.checks).map(([key, check]) => (
                        check.status === 'fail' && (
                          <p key={key} className="text-xs">• {key}: {check.message}</p>
                        )
                      ))}
                    </div>
                  )}
                  
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleLogin}
                      disabled={isLoggingIn}
                      data-testid="button-retry-login"
                    >
                      {isLoggingIn ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="mr-2 h-4 w-4" />
                      )}
                      {isLoggingIn ? "Connecting..." : "Try Again"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={checkAuthHealth}
                      disabled={checkingHealth}
                    >
                      {checkingHealth ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Info className="mr-2 h-4 w-4" />
                      )}
                      {checkingHealth ? "Checking..." : "Check Status"}
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
                onClick={handleLogin}
                disabled={isLoggingIn}
                data-testid="button-login"
              >
                {isLoggingIn ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    {getLoginMessage()}
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-5 w-5" />
                    Log In to Begin Recovery
                  </>
                )}
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
