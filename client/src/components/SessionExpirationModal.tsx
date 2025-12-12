/**
 * Session Expiration Modal
 * 
 * Handles session expiration gracefully by:
 * - Detecting 401 responses
 * - Showing re-authentication modal
 * - Preserving user work/state
 * - Restoring state after successful re-auth
 */

import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { post } from '@/api/client';
import { QUERY_KEYS } from '@/api/routes';

interface SessionExpirationModalProps {
  open: boolean;
  onReauthenticated: () => void;
}

export function SessionExpirationModal({ open, onReauthenticated }: SessionExpirationModalProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Clear form when modal opens
  useEffect(() => {
    if (open) {
      setPassword('');
      setError(null);
    }
  }, [open]);

  const handleReauthenticate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Attempt login
      await post('/api/auth/login', { username, password });

      // Invalidate all queries to refetch with new session
      await queryClient.invalidateQueries();

      // Refetch user data
      await queryClient.refetchQueries({ queryKey: QUERY_KEYS.auth.user() });

      // Notify parent that re-auth succeeded
      onReauthenticated();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Authentication failed';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {/* Prevent closing by clicking outside */}}>
      <DialogContent
        className="sm:max-w-md"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Session Expired
          </DialogTitle>
          <DialogDescription>
            Your session has expired for security reasons. Please log in again to continue.
            Your work will be preserved.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleReauthenticate} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="session-username">Username</Label>
            <Input
              id="session-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              autoComplete="username"
              autoFocus
              disabled={isLoading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="session-password">Password</Label>
            <Input
              id="session-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              disabled={isLoading}
              required
            />
          </div>

          <DialogFooter>
            <Button
              type="submit"
              disabled={isLoading || !username || !password}
              className="w-full"
            >
              {isLoading ? 'Authenticating...' : 'Log In'}
            </Button>
          </DialogFooter>
        </form>

        <div className="text-xs text-muted-foreground text-center">
          Session timeout is a security feature to protect your data.
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Session Manager Hook
 * 
 * Provides session expiration detection and handling.
 * Usage: Add <SessionManager /> to your app root.
 */
export function useSessionManager() {
  const [showExpirationModal, setShowExpirationModal] = useState(false);

  useEffect(() => {
    // Global error handler for 401 responses
    const handle401 = (event: Event) => {
      if (event instanceof CustomEvent && event.detail?.status === 401) {
        setShowExpirationModal(true);
      }
    };

    window.addEventListener('auth:expired', handle401);

    return () => {
      window.removeEventListener('auth:expired', handle401);
    };
  }, []);

  const handleReauthenticated = () => {
    setShowExpirationModal(false);
  };

  return {
    showExpirationModal,
    SessionModal: (
      <SessionExpirationModal
        open={showExpirationModal}
        onReauthenticated={handleReauthenticated}
      />
    ),
  };
}

/**
 * Enhanced API client wrapper that emits auth:expired event
 * 
 * Add this to your API client to automatically trigger session expiration modal
 */
export function emit401Event() {
  const event = new CustomEvent('auth:expired', {
    detail: { status: 401, timestamp: Date.now() },
  });
  window.dispatchEvent(event);
}
