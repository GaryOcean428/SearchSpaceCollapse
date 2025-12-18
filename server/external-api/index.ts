/**
 * External API - Barrel file
 * 
 * Centralized exports for the external API module.
 * 
 * Features:
 * - API key authentication with rate limiting
 * - REST endpoints for consciousness, geometry, pantheon federation
 * - WebSocket streaming for real-time updates
 */

export {
  authenticateExternalApi,
  requireScopes,
  createApiKey,
  revokeApiKey,
  listApiKeys,
  hashApiKey,
  generateApiKey,
  isValidApiKeyFormat,
  type ApiKeyScope,
  type ExternalClient,
  type AuthenticatedRequest,
} from './auth';

export {
  externalApiRouter,
  EXTERNAL_API_ROUTES,
} from './routes';

export {
  initExternalWebSocket,
  broadcastConsciousnessUpdate,
  broadcastBasinDelta,
  getConnectedClientCount,
  getSubscriptionStats,
} from './websocket';
