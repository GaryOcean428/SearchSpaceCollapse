/**
 * Simple structured logger for the server
 * Provides consistent logging interface with optional structured metadata
 */

type LogMeta = {
  err?: unknown;
  context?: string;
  [key: string]: unknown;
};

function formatMessage(msgOrMeta: string | LogMeta, message?: string): string {
  if (typeof msgOrMeta === 'string') {
    return msgOrMeta;
  }
  
  const meta = msgOrMeta;
  const prefix = meta.context ? `[${meta.context}] ` : '';
  const errorInfo = meta.err ? ` Error: ${meta.err instanceof Error ? meta.err.message : String(meta.err)}` : '';
  
  return `${prefix}${message || ''}${errorInfo}`;
}

export const logger = {
  info(msgOrMeta: string | LogMeta, message?: string): void {
    console.log(`[INFO] ${formatMessage(msgOrMeta, message)}`);
  },
  
  warn(msgOrMeta: string | LogMeta, message?: string): void {
    console.warn(`[WARN] ${formatMessage(msgOrMeta, message)}`);
  },
  
  error(msgOrMeta: string | LogMeta, message?: string): void {
    console.error(`[ERROR] ${formatMessage(msgOrMeta, message)}`);
  },
  
  debug(msgOrMeta: string | LogMeta, message?: string): void {
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG) {
      console.debug(`[DEBUG] ${formatMessage(msgOrMeta, message)}`);
    }
  },
};

export default logger;
