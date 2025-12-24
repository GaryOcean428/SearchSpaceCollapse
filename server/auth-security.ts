/**
 * Auth Security Utilities
 * 
 * Additional security measures for authentication:
 * - Token leakage detection
 * - Secret validation
 * - Security headers
 * - Audit logging
 */

import type { Request, Response, NextFunction } from 'express';
import { MIN_SESSION_SECRET_LENGTH, MAX_AUDIT_LOGS } from './auth-constants';

// Patterns that might indicate sensitive data in logs or responses
const SENSITIVE_PATTERNS = [
  /access[_-]?token/i,
  /refresh[_-]?token/i,
  /session[_-]?secret/i,
  /client[_-]?secret/i,
  /api[_-]?key/i,
  /bearer\s+[a-zA-Z0-9\-._~+/]+=*/i,
  /password/i,
];

// JWT token pattern
const JWT_PATTERN = /eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g;

/**
 * Redact sensitive data from objects for logging
 */
export function redactSensitive(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(redactSensitive);
  }

  const redacted: any = {};
  for (const [key, value] of Object.entries(obj)) {
    // Check if key matches sensitive patterns
    const isSensitiveKey = SENSITIVE_PATTERNS.some(pattern => pattern.test(key));
    
    if (isSensitiveKey) {
      redacted[key] = '[REDACTED]';
    } else if (typeof value === 'string' && JWT_PATTERN.test(value)) {
      // Redact JWT tokens in values
      redacted[key] = value.replace(JWT_PATTERN, '[REDACTED_TOKEN]');
    } else if (typeof value === 'object') {
      redacted[key] = redactSensitive(value);
    } else {
      redacted[key] = value;
    }
  }

  return redacted;
}

/**
 * Check if string contains sensitive data
 */
export function containsSensitiveData(str: string): boolean {
  return SENSITIVE_PATTERNS.some(pattern => pattern.test(str)) || JWT_PATTERN.test(str);
}

/**
 * Middleware to prevent token leakage in responses
 * Checks response bodies for tokens and warns if found
 */
export function tokenLeakageDetection(req: Request, res: Response, next: NextFunction): void {
  const originalJson = res.json.bind(res);
  
  res.json = function(body: any) {
    // Check if response contains sensitive data
    const bodyStr = JSON.stringify(body);
    
    if (containsSensitiveData(bodyStr)) {
      console.warn('[Security] ⚠️ Potential token leakage detected in response to', req.path);
      console.warn('[Security] Response contains sensitive data patterns');
      
      // In production, consider redacting the response
      if (process.env.NODE_ENV === 'production') {
        const redacted = redactSensitive(body);
        return originalJson(redacted);
      }
    }
    
    return originalJson(body);
  };
  
  next();
}

/**
 * Audit log for security-relevant events
 */
export interface SecurityAuditLog {
  timestamp: number;
  event: string;
  ip: string;
  userId?: string;
  details: any;
  severity: 'info' | 'warning' | 'critical';
}

const auditLogs: SecurityAuditLog[] = [];

export function logSecurityEvent(
  event: string,
  req: Request,
  details: any = {},
  severity: 'info' | 'warning' | 'critical' = 'info'
): void {
  const log: SecurityAuditLog = {
    timestamp: Date.now(),
    event,
    ip: req.ip || req.socket.remoteAddress || 'unknown',
    userId: (req.user as any)?.claims?.sub,
    details: redactSensitive(details),
    severity,
  };
  
  auditLogs.push(log);
  
  // Keep only recent logs
  if (auditLogs.length > MAX_AUDIT_LOGS) {
    auditLogs.shift();
  }
  
  // Log to console based on severity
  const prefix = `[SecurityAudit:${severity.toUpperCase()}]`;
  const message = `${event} from ${log.ip} ${log.userId ? `(user: ${log.userId})` : ''}`;
  
  if (severity === 'critical') {
    console.error(prefix, message, log.details);
  } else if (severity === 'warning') {
    console.warn(prefix, message, log.details);
  } else {
    console.log(prefix, message);
  }
}

export function getAuditLogs(limit: number = 100): SecurityAuditLog[] {
  return auditLogs.slice(-limit);
}

/**
 * Security headers middleware
 * Adds additional security headers for auth endpoints
 */
export function authSecurityHeaders(req: Request, res: Response, next: NextFunction): void {
  // Prevent caching of auth responses
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  // Additional security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer policy to prevent leaking tokens in referrer
  res.setHeader('Referrer-Policy', 'no-referrer');
  
  next();
}

/**
 * Validate that session secret is secure
 */
export function validateSessionSecurity(secret: string): {
  secure: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  
  // Check length
  if (secret.length < MIN_SESSION_SECRET_LENGTH) {
    issues.push(`Session secret should be at least ${MIN_SESSION_SECRET_LENGTH} characters`);
  }
  
  // Check for common weak patterns
  const weakPatterns = [
    'password',
    '12345',
    'secret',
    'change-me',
    'your-secret-here',
    'example',
    'test',
    'default',
  ];
  
  const lowerSecret = secret.toLowerCase();
  for (const pattern of weakPatterns) {
    if (lowerSecret.includes(pattern)) {
      issues.push(`Session secret contains weak pattern: "${pattern}"`);
    }
  }
  
  // Check entropy (basic check)
  const uniqueChars = new Set(secret).size;
  if (uniqueChars < 16) {
    issues.push('Session secret has low entropy (too few unique characters)');
  }
  
  // Check if it's all one type of character
  if (/^[a-z]+$/.test(secret) || /^[A-Z]+$/.test(secret) || /^[0-9]+$/.test(secret)) {
    issues.push('Session secret should use mixed character types (letters, numbers, symbols)');
  }
  
  return {
    secure: issues.length === 0,
    issues,
  };
}

/**
 * Check for common security misconfigurations
 */
export function checkSecurityConfig(): {
  secure: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];
  
  // Check environment
  const isProduction = process.env.NODE_ENV === 'production' || process.env.REPLIT_DEPLOYMENT === '1';
  
  if (isProduction) {
    // Production-specific checks
    if (!process.env.SESSION_SECRET) {
      warnings.push('SESSION_SECRET not set in production');
    }
    
    if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length < MIN_SESSION_SECRET_LENGTH) {
      warnings.push(`SESSION_SECRET is too short for production (min ${MIN_SESSION_SECRET_LENGTH} characters)`);
    }
    
    if (!process.env.DATABASE_URL) {
      warnings.push('DATABASE_URL not set - auth will not work');
    }
  } else {
    // Development-specific warnings
    if (process.env.SESSION_SECRET === 'test' || process.env.SESSION_SECRET === 'dev') {
      warnings.push('Using weak SESSION_SECRET in development');
    }
  }
  
  return {
    secure: warnings.length === 0,
    warnings,
  };
}

/**
 * Initialize security checks on startup
 */
export function initSecurityChecks(): void {
  console.log('[Security] Running security configuration checks...');
  
  const sessionSecret = process.env.SESSION_SECRET;
  if (sessionSecret) {
    const validation = validateSessionSecurity(sessionSecret);
    if (!validation.secure) {
      console.warn('[Security] ⚠️ Session secret has security issues:');
      validation.issues.forEach(issue => console.warn(`  - ${issue}`));
    } else {
      console.log('[Security] ✅ Session secret meets security requirements');
    }
  }
  
  const config = checkSecurityConfig();
  if (!config.secure) {
    console.warn('[Security] ⚠️ Security configuration warnings:');
    config.warnings.forEach(warning => console.warn(`  - ${warning}`));
  } else {
    console.log('[Security] ✅ Security configuration looks good');
  }
}

/**
 * Middleware to log auth attempts for security monitoring
 */
export function logAuthAttempt(success: boolean) {
  return (req: Request, res: Response, next: NextFunction) => {
    const severity = success ? 'info' : 'warning';
    logSecurityEvent(
      success ? 'auth_success' : 'auth_failure',
      req,
      {
        path: req.path,
        method: req.method,
        userAgent: req.get('user-agent'),
      },
      severity
    );
    next();
  };
}
