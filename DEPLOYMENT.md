# Deployment Guide

## Production Build

The application requires the BIP-39 wordlist file to be available in the production build. This has been configured automatically.

### Build Process

Run one of these commands to build for production:

```bash
# Option 1: Using Node.js build script (recommended)
node build.js

# Option 2: Using bash build script
./.replit-build

# Option 3: Manual build (requires manual file copy)
vite build && \
esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist && \
cp server/bip39-wordlist.txt dist/bip39-wordlist.txt
```

### Build Output

After building, verify these files exist:
- `dist/index.js` - Bundled backend server
- `dist/bip39-wordlist.txt` - BIP-39 wordlist (2048 words)
- `dist/public/` - Frontend static assets
- `dist/public/index.html` - Main HTML entry point

### Starting Production Server

```bash
NODE_ENV=production node dist/index.js
```

The app will automatically:
1. Search for `bip39-wordlist.txt` in multiple locations
2. Load and validate the wordlist (must be 2048 words)
3. Log the successful load location
4. Start the Express server on port 5000

### Path Resolution

The app intelligently searches for the wordlist in this order:
1. `dist/bip39-wordlist.txt` (production)
2. `../server/bip39-wordlist.txt` (dev from dist)
3. `server/bip39-wordlist.txt` (dev from root)
4. `dist/bip39-wordlist.txt` (production from root)

### Troubleshooting

If you see `BIP-39 wordlist not found` error:
1. Verify `server/bip39-wordlist.txt` exists (2048 words)
2. Run the build script: `node build.js`
3. Check `dist/bip39-wordlist.txt` exists after build
4. Review startup logs for path search details

### Replit Deployment

The `.replit-build` script is configured for Replit's deployment system.
It will automatically copy the wordlist during the build phase.

### Package.json Build Script

To use the build script in package.json, update the `build` command to:
```json
"build": "node build.js"
```

This ensures the wordlist is always copied during deployment.
