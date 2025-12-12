---
id: ISMS-PROC-015
title: Replit Deployment Guide
filename: 20251212-replit-deployment-guide-1.00W.md
classification: Internal
owner: GaryOcean428
version: 1.00
status: Working
function: "Comprehensive guide for deploying and running on Replit"
created: 2025-12-12
last_reviewed: 2025-12-12
next_review: 2026-06-12
category: Procedures
supersedes: null
---

# Replit Deployment Guide

## Overview

This guide covers deploying, running, and managing the SearchSpaceCollapse application on Replit, including environment configuration, file system considerations, and troubleshooting.

## Quick Start

### One-Click Fork and Run

1. **Fork the Replit**: Click "Fork" button in Replit interface
2. **Install Dependencies**: Replit auto-runs `npm install`
3. **Configure Environment**: Set required environment variables (see below)
4. **Run**: Click "Run" button or use `npm run dev`

The application starts on port 5000 and should be accessible via the Replit webview.

## Prerequisites

### Required Replit Configuration

The `.replit` file is pre-configured with:

```toml
modules = ["nodejs-20", "python-3.11", "postgresql-16"]
run = "npm run dev"

[nix]
channel = "stable-24_05"
packages = [
  "bfg-repo-cleaner",
  "github-cli",
  "glibcLocales",
  "libxcrypt",
  "libyaml",
  "pkg-config",
  "postgresql15Packages.pgvector",
  "tor",
  "xsimd"
]

[deployment]
deploymentTarget = "autoscale"
build = ["npm", "run", "build"]
run = ["npm", "run", "start"]

[[ports]]
localPort = 5000
externalPort = 80

[env]
PORT = "5000"
```

### Required Environment Variables

Create a `.env` file in Replit Secrets or root directory:

```bash
# Database (optional - uses file storage if not set)
DATABASE_URL=postgresql://user:password@localhost:5432/searchspace

# API Keys (if needed for external services)
# BLOCKCHAIN_API_KEY=your_key_here

# Production Settings
NODE_ENV=production
PORT=5000

# Python Backend
PYTHONPATH=/home/runner/work/SearchSpaceCollapse/SearchSpaceCollapse/qig-backend
```

## File System Considerations

### Replit File System Characteristics

- **Ephemeral Storage**: Files in `/tmp` may be cleared
- **Persistent Storage**: Files in project root persist across reboots
- **Permissions**: May vary, always check file permissions
- **Disk Space**: Limited, monitor usage regularly

### File Storage Strategy

```typescript
// ✅ GOOD: Check file permissions and disk space
import { promises as fs } from 'fs';

async function saveData(data: unknown, path: string) {
  try {
    // Ensure directory exists
    await fs.mkdir(dirname(path), { recursive: true });
    
    // Write file
    await fs.writeFile(path, JSON.stringify(data, null, 2));
    
    return { success: true };
  } catch (error) {
    if (error.code === 'ENOSPC') {
      throw new Error('Disk space full. Please free up space.');
    } else if (error.code === 'EACCES') {
      throw new Error('Permission denied. Check file permissions.');
    }
    throw error;
  }
}
```

### Recommended Storage Locations

```
project-root/
├── data/                    # Application data (gitignored)
│   ├── geometric-memory.json
│   ├── tested-phrases.json
│   └── ocean-state.json
├── persistent_data/         # Long-term storage (gitignored)
│   ├── recoveries/
│   └── backups/
└── /tmp/                    # Temporary files (may be cleared)
    └── temp-uploads/
```

### File Error Handling

```typescript
// ✅ GOOD: Graceful degradation
export async function loadData(path: string) {
  try {
    const data = await fs.readFile(path, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // File doesn't exist, return default
      console.warn(`File not found: ${path}, using defaults`);
      return getDefaults();
    } else if (error.code === 'EACCES') {
      // Permission denied
      console.error(`Permission denied: ${path}`);
      throw new Error('Cannot read configuration. Check file permissions.');
    }
    throw error;
  }
}
```

## Development Workflow

### Hot Reload Configuration

Vite is configured for hot module replacement (HMR):

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    port: 5000,
    host: '0.0.0.0', // Required for Replit
    hmr: {
      overlay: true,
      clientPort: 443, // Replit proxy port
    },
  },
  plugins: [
    react(),
    // Replit-specific plugins
  ],
});
```

### Running Development Server

```bash
# Start both frontend and backend
npm run dev

# Backend runs on: http://localhost:5000
# Frontend bundled and served by backend
```

### Running Backend Only (Python)

```bash
cd qig-backend
python3 ocean_qig_core.py
# Runs on http://localhost:5001
```

### File Watching

Replit auto-restarts on file changes. To disable:

```json
// .replit
{
  "run": "npm run dev",
  "watch": false  // Disable auto-restart if needed
}
```

## Database Configuration

### PostgreSQL on Replit

Replit provides PostgreSQL 16 with pgvector extension:

```bash
# Database is auto-started with nix package
# Connection string typically:
postgresql://neondb_owner:<password>@localhost:5432/neondb

# Or use Replit's built-in database
DATABASE_URL=postgresql://replit:password@localhost:5432/replit
```

### Database Initialization

```bash
# Push schema to database
npm run db:push

# Run migrations (if using Drizzle migrations)
npm run db:migrate
```

### Fallback to File Storage

If `DATABASE_URL` is not set, the app automatically uses file-based storage:

```typescript
// server/ocean-persistence.ts
const usePgVector = !!process.env.DATABASE_URL;

if (usePgVector) {
  console.log('Using PostgreSQL with pgvector');
} else {
  console.log('Using file-based storage');
}
```

## Environment-Specific Configuration

### Development vs Production

```typescript
// Use environment detection
const isDev = process.env.NODE_ENV !== 'production';
const isReplit = !!process.env.REPL_ID;

// Adjust behavior accordingly
const apiUrl = isDev 
  ? 'http://localhost:5000/api'
  : process.env.VITE_API_URL || '/api';
```

### API Base URL Configuration

```typescript
// client/src/lib/api/client.ts
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 30000, // 30s timeout for Replit
});
```

## Deployment

### Production Build

```bash
# Build for production
npm run build

# Output:
# - Frontend: dist/
# - Backend: dist/server/
```

### Starting Production Server

```bash
# Production mode
npm run start

# Or directly
NODE_ENV=production node dist/index.js
```

### Deployment Checklist

Before deploying to production:

- [ ] Set `NODE_ENV=production`
- [ ] Configure `DATABASE_URL` (or accept file storage)
- [ ] Set all required API keys in Secrets
- [ ] Run `npm run build` successfully
- [ ] Test health endpoint: `GET /api/health`
- [ ] Verify HTTPS is enabled
- [ ] Check logs for errors
- [ ] Test authentication flow
- [ ] Verify WebSocket connections (if used)
- [ ] Monitor memory usage
- [ ] Set up error logging/monitoring

## Performance Optimization for Replit

### Memory Management

```typescript
// Limit memory usage where possible
const MAX_MEMORY_MB = 512; // Adjust based on Replit plan

process.on('memoryUsage', () => {
  const used = process.memoryUsage().heapUsed / 1024 / 1024;
  if (used > MAX_MEMORY_MB) {
    console.warn(`High memory usage: ${used.toFixed(2)} MB`);
    // Trigger garbage collection if needed
    if (global.gc) global.gc();
  }
});
```

### Request Timeout Configuration

Replit may have connection timeouts. Configure appropriately:

```typescript
// server/index.ts
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Increase timeout for long-running operations
server.timeout = 300000; // 5 minutes
server.keepAliveTimeout = 65000; // 65 seconds
```

### Caching Strategy

```typescript
// Aggressive caching for static assets on Replit
import { serve } from 'express';

app.use(express.static('dist', {
  maxAge: '1d', // Cache for 1 day
  etag: true,
  lastModified: true,
}));
```

## Troubleshooting

### Common Issues

#### 1. Port Already in Use

```bash
# Kill process on port 5000
lsof -ti:5000 | xargs kill -9

# Or use different port
PORT=5001 npm run dev
```

#### 2. Database Connection Fails

```bash
# Check PostgreSQL is running
pg_isready

# Restart PostgreSQL
pg_ctl restart

# Check connection string
echo $DATABASE_URL
```

#### 3. File Permission Errors

```bash
# Fix permissions
chmod -R 755 data/
chmod -R 755 persistent_data/

# Check ownership
ls -la data/
```

#### 4. Module Not Found

```bash
# Clear node_modules and reinstall
rm -rf node_modules
rm package-lock.json
npm install

# Clear npm cache if needed
npm cache clean --force
```

#### 5. Python Backend Issues

```bash
# Check Python path
echo $PYTHONPATH

# Install Python dependencies
cd qig-backend
pip install -r requirements.txt

# Test Python backend directly
python3 ocean_qig_core.py
```

### Debugging Tools

#### Check Application Health

```bash
# Health endpoint
curl http://localhost:5000/api/health

# Check all routes
curl http://localhost:5000/api/investigation/status
```

#### Monitor Logs

```typescript
// Enhanced logging for Replit
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
    }),
  ],
});
```

#### Network Diagnostics

```bash
# Check if backend is listening
netstat -tuln | grep 5000

# Check if port is accessible
curl -v http://localhost:5000

# Check DNS resolution (if using external APIs)
nslookup blockchain.info
```

## Monitoring & Maintenance

### Health Checks

Implement health check endpoint:

```typescript
// server/routes/health.ts
router.get('/health', async (req, res) => {
  const checks = {
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    memory: process.memoryUsage(),
    database: 'unknown',
  };

  try {
    // Check database connection
    if (db) {
      await db.execute('SELECT 1');
      checks.database = 'connected';
    }
  } catch (error) {
    checks.database = 'disconnected';
  }

  const isHealthy = checks.database === 'connected' || !process.env.DATABASE_URL;

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    checks,
  });
});
```

### Disk Space Monitoring

```bash
# Check disk usage
df -h

# Find large files
du -sh data/* | sort -hr | head -10

# Clean up old logs
find logs/ -name "*.log" -mtime +7 -delete
```

### Memory Monitoring

```typescript
// Log memory usage periodically
setInterval(() => {
  const usage = process.memoryUsage();
  console.log('Memory Usage:', {
    rss: `${(usage.rss / 1024 / 1024).toFixed(2)} MB`,
    heapTotal: `${(usage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
    heapUsed: `${(usage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
    external: `${(usage.external / 1024 / 1024).toFixed(2)} MB`,
  });
}, 60000); // Every minute
```

## Security Considerations on Replit

### Secrets Management

```bash
# Never commit secrets to repo
# Use Replit Secrets or .env file (gitignored)

# Access secrets in code
const apiKey = process.env.BLOCKCHAIN_API_KEY;

# Validate secrets exist
if (!apiKey) {
  throw new Error('BLOCKCHAIN_API_KEY not configured');
}
```

### HTTPS Configuration

Replit automatically provides HTTPS. Ensure your app uses it:

```typescript
// Enforce HTTPS in production
if (process.env.NODE_ENV === 'production' && req.protocol !== 'https') {
  res.redirect(`https://${req.hostname}${req.url}`);
  return;
}
```

### CORS Configuration

```typescript
// server/index.ts
import cors from 'cors';

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || [
    'https://*.replit.app',
    'https://*.replit.dev',
  ],
  credentials: true,
}));
```

## Backup & Recovery

### Automated Backups

```typescript
// Schedule daily backups
import cron from 'node-cron';

// Backup at 2 AM daily
cron.schedule('0 2 * * *', async () => {
  const timestamp = new Date().toISOString().split('T')[0];
  const backupPath = `persistent_data/backups/backup-${timestamp}.json`;
  
  try {
    await backupDatabase(backupPath);
    console.log(`Backup created: ${backupPath}`);
  } catch (error) {
    console.error('Backup failed:', error);
  }
});
```

### Manual Backup

```bash
# Backup data directory
tar -czf backup-$(date +%Y%m%d).tar.gz data/ persistent_data/

# Download backup from Replit
# Use Replit's download feature or:
curl -o backup.tar.gz https://your-repl.replit.app/download/backup.tar.gz
```

### Restore from Backup

```bash
# Extract backup
tar -xzf backup-20251212.tar.gz

# Restore database (if using PostgreSQL)
psql $DATABASE_URL < backup.sql
```

## Development Tips

### Mock Data for Development

```typescript
// Use mock data when backend is unavailable
const USE_MOCKS = import.meta.env.DEV && import.meta.env.VITE_USE_MOCKS === 'true';

export function useOceanData() {
  if (USE_MOCKS) {
    return {
      data: mockOceanState,
      isLoading: false,
      error: null,
    };
  }
  
  return useQuery({
    queryKey: ['ocean', 'state'],
    queryFn: () => api.ocean.getState(),
  });
}
```

### Parallel Development

Run frontend and backend separately for faster iteration:

```bash
# Terminal 1: Backend
npm run dev

# Terminal 2: Python backend (if needed)
cd qig-backend
python3 ocean_qig_core.py

# Frontend proxies to backend automatically
```

### Debug Mode

```typescript
// Enable verbose logging in dev
if (import.meta.env.DEV) {
  window.__DEBUG__ = true;
  
  // Log all API calls
  api.interceptors.request.use(req => {
    console.log('API Request:', req.method, req.url);
    return req;
  });
  
  api.interceptors.response.use(
    res => {
      console.log('API Response:', res.status, res.config.url);
      return res;
    },
    err => {
      console.error('API Error:', err.config.url, err.message);
      throw err;
    }
  );
}
```

## Performance Benchmarks

Expected performance on Replit:

- **Cold start**: 10-15 seconds
- **Hot reload**: 1-3 seconds
- **API response time**: 50-200ms (local), 200-500ms (external)
- **Database query**: 10-50ms
- **Page load**: 1-2 seconds (first load), <500ms (cached)

## Support & Resources

- **Replit Docs**: https://docs.replit.com
- **Replit Community**: https://replit.com/talk
- **Project README**: `/README.md`
- **Architecture Docs**: `/docs/03-technical/ARCHITECTURE.md`

## Related Documents

- `20251212-ui-ux-best-practices-comprehensive-1.00W.md` - UI/UX best practices
- `20251208-quickstart-onboarding-1.00F.md` - Quick start guide
- `20251208-testing-guide-vitest-playwright-1.00F.md` - Testing guide

---
**Last Updated**: 2025-12-12
**Target Platform**: Replit (Node.js 20, Python 3.11, PostgreSQL 16)
