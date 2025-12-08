/**
 * Provider Unavailable Error
 * 
 * Thrown when all blockchain API providers fail or are rate-limited.
 * This error type distinguishes provider outages from legitimate empty balances.
 * 
 * Use cases:
 * - All providers timed out
 * - All providers returned non-404 HTTP errors
 * - All providers are rate-limited
 * 
 * The BalanceQueue should NOT mark addresses as "tested empty" when this error occurs,
 * as we cannot confirm the address has zero balance - only that we couldn't reach any API.
 */

export interface ProviderAttempt {
  provider: string;
  status: 'timeout' | 'rate_limited' | 'error' | 'disabled';
  errorMessage?: string;
  timestamp: number;
}

export class ProviderUnavailableError extends Error {
  public readonly attempts: number;
  public readonly providerHistory: ProviderAttempt[];
  public readonly lastError?: string;
  public readonly address: string;
  public readonly isProviderUnavailable = true; // Type guard flag

  constructor(
    address: string,
    attempts: number,
    providerHistory: ProviderAttempt[],
    lastError?: string
  ) {
    const providersSummary = providerHistory.map(p => `${p.provider}:${p.status}`).join(', ');
    super(`All blockchain providers unavailable for ${address} after ${attempts} attempts [${providersSummary}]`);
    
    this.name = 'ProviderUnavailableError';
    this.address = address;
    this.attempts = attempts;
    this.providerHistory = providerHistory;
    this.lastError = lastError;
    
    // Maintain proper prototype chain
    Object.setPrototypeOf(this, ProviderUnavailableError.prototype);
  }

  /**
   * Check if an error is a ProviderUnavailableError
   */
  static isProviderUnavailableError(error: unknown): error is ProviderUnavailableError {
    return (
      error instanceof ProviderUnavailableError ||
      (error instanceof Error && 'isProviderUnavailable' in error && (error as any).isProviderUnavailable === true)
    );
  }

  /**
   * Get a concise summary for logging
   */
  getSummary(): string {
    const providers = [...new Set(this.providerHistory.map(p => p.provider))];
    const statuses = {
      timeout: this.providerHistory.filter(p => p.status === 'timeout').length,
      rate_limited: this.providerHistory.filter(p => p.status === 'rate_limited').length,
      error: this.providerHistory.filter(p => p.status === 'error').length,
      disabled: this.providerHistory.filter(p => p.status === 'disabled').length,
    };
    
    const statusSummary = Object.entries(statuses)
      .filter(([_, count]) => count > 0)
      .map(([status, count]) => `${status}:${count}`)
      .join(' ');
    
    return `providers=${providers.length} attempts=${this.attempts} [${statusSummary}]`;
  }
}
