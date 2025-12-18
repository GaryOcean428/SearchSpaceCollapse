/**
 * External API - Barrel file
 * 
 * Centralized exports for the external API module.
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
