import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { pool } from "./db";

// Handle uncaught exceptions gracefully to prevent crashes
process.on('uncaughtException', (err) => {
  // Check if it's the Neon WebSocket error (known issue with read-only ErrorEvent.message)
  if (err.message?.includes('Cannot set property message') || 
      err.message?.includes('ErrorEvent')) {
    console.error('[DB] Database connection error (will retry):', err.message);
    return; // Don't crash - the pool will reconnect
  }
  console.error('[FATAL] Uncaught exception:', err);
  // For other fatal errors, exit after a delay to allow cleanup
  setTimeout(() => process.exit(1), 1000);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[WARN] Unhandled rejection at:', promise, 'reason:', reason);
  // Don't crash on unhandled rejections - log and continue
});

// Handle pool errors gracefully
if (pool) {
  pool.on('error', (err) => {
    console.error('[DB] Pool error (connection will be recreated):', err.message);
  });
}

const app = express();

const isDev = process.env.NODE_ENV === 'development';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https:"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "ws:", "wss:", "https:", "https://blockstream.info", "https://api.bitinfocharts.com", "https://mempool.space", "https://api.tavily.com", "https://replit.com"],
      workerSrc: ["'self'", "blob:"],
      frameSrc: ["'self'", "https://replit.com"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false,
  hsts: isDev ? false : {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      // Skip noisy polling endpoints to keep Ocean logs visible
      const quietEndpoints = [
        '/api/investigation/status',
        '/api/ocean/neurochemistry', 
        '/api/ocean/cycles',
        '/api/candidates'
      ];
      if (quietEndpoints.some(ep => path.startsWith(ep)) && req.method === 'GET') {
        return; // Skip logging these frequent polling requests
      }
      
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 200) {
        logLine = logLine.slice(0, 199) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
