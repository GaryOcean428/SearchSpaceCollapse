---
id: ISMS-PROC-SEC-001
title: Darknet Setup - Security Guide
filename: 20251208-darknet-setup-security-guide-1.00F.md
classification: Internal
owner: GaryOcean428
version: 1.00
status: Frozen
function: "Security procedures for Tor darknet integration and configuration"
created: 2025-12-08
last_reviewed: 2025-12-08
next_review: 2026-06-08
category: Procedure
supersedes: null
---

# Darknet Configuration Guide

## Overview

The Shadow Pantheon now supports **REAL** Tor routing for stealth blockchain operations. This replaces the previous fake "darknet" labels with actual network anonymization.

## Features

- ✅ **Tor SOCKS5 Proxy**: Route all blockchain API calls through Tor
- ✅ **Automatic Detection**: Verifies Tor availability on startup
- ✅ **User Agent Rotation**: 10 realistic user agents per request
- ✅ **Traffic Obfuscation**: Random delays between requests
- ✅ **Graceful Fallback**: Automatically switches to clearnet if Tor unavailable
- ✅ **HTTP/HTTPS Proxy**: Alternative to Tor for other proxy solutions

## Installation

### 1. Install Python Dependencies

The project now requires `requests[socks]` for SOCKS5 support:

```bash
# Using uv (recommended)
uv pip install -e .

# Or using pip
pip install -e .
```

This installs:
- `requests[socks]` - HTTP library with SOCKS proxy support
- `PySocks` - SOCKS proxy client (included with requests[socks])

### 2. Install and Configure Tor

#### On Ubuntu/Debian:
```bash
sudo apt update
sudo apt install tor
sudo systemctl start tor
sudo systemctl enable tor
```

#### On macOS (using Homebrew):
```bash
brew install tor
brew services start tor
```

#### On Windows:
1. Download Tor Browser from https://www.torproject.org/download/
2. Or install Tor Expert Bundle: https://www.torproject.org/download/tor/
3. Run Tor in the background

#### Verify Tor is Running:
```bash
# Check if Tor is listening on port 9050
netstat -an | grep 9050

# Or use curl to test SOCKS5 connectivity
curl --socks5-hostname 127.0.0.1:9050 https://check.torproject.org/api/ip
# Should return: {"IsTor": true, ...}
```

### 3. Enable Darknet Mode

Add to your `.env` file:

```bash
# Enable Tor routing
ENABLE_TOR=true

# Tor SOCKS5 proxy address (default: 127.0.0.1:9050)
TOR_PROXY=socks5h://127.0.0.1:9050

# Optional: Use custom Tor port
# TOR_PROXY=socks5h://127.0.0.1:9150

# Optional: Use HTTP/HTTPS proxy instead of Tor
# HTTP_PROXY=http://proxy.example.com:8080
# HTTPS_PROXY=http://proxy.example.com:8080
```

## Usage

### Automatic Mode (Recommended)

The darknet proxy is automatically used when:
1. `ENABLE_TOR=true` in `.env`
2. Tor is running and reachable

```python
from darknet_proxy import get_session

# Automatically uses Tor if available, falls back to clearnet
session = get_session()
response = session.get('https://blockchain.info/balance?active=...')
```

### Explicit Control

```python
from darknet_proxy import get_session, is_tor_available

# Force Tor (will warn and fallback if unavailable)
tor_session = get_session(use_tor=True)

# Force clearnet (bypass Tor even if enabled)
clearnet_session = get_session(use_tor=False)

# Check Tor status
if is_tor_available():
    print("Tor is ready for stealth operations")
```

### Check Status

```python
from darknet_proxy import get_status

status = get_status()
print(f"Mode: {status['mode']}")  # 'tor' or 'clearnet'
print(f"Tor available: {status['tor_available']}")
print(f"Proxy: {status['tor_proxy']}")
```

## Verification

### Python Backend Logs

When the backend starts, you'll see:

**Tor Available:**
```
[DarknetProxy] ✓ Operating in DARKNET mode via Tor
[Nyx] ✓ REAL DARKNET ACTIVE - Tor routing enabled
```

**Tor Enabled but Unavailable:**
```
[DarknetProxy] ⚠ DARKNET mode enabled but Tor unavailable - using clearnet
[Nyx] ⚠ Darknet enabled but Tor unavailable - will fallback to clearnet
```

**Darknet Disabled:**
```
[DarknetProxy] Operating in CLEARNET mode
[Nyx] ℹ Operating in clearnet mode
```

### Test Tor Connection

```python
# In Python REPL or test script
from darknet_proxy import get_session
import requests

session = get_session(use_tor=True)

# Check your exit node IP
response = session.get('https://api.ipify.org?format=json')
print(f"Exit IP: {response.json()['ip']}")

# Verify it's a Tor exit node
response = session.get('https://check.torproject.org/api/ip')
data = response.json()
print(f"Using Tor: {data['IsTor']}")
print(f"Exit node: {data['IP']}")
```

## Security Considerations

### What Darknet Mode Provides

✅ **Network Anonymization**: Blockchain queries routed through Tor exit nodes  
✅ **IP Obfuscation**: Your real IP is hidden from blockchain APIs  
✅ **Traffic Obfuscation**: Random delays prevent timing analysis  
✅ **User Agent Rotation**: Appears as different browsers/devices  
✅ **Connection Pooling**: Reduces fingerprinting via connection reuse  

### What It Doesn't Provide

❌ **End-to-End Encryption**: Tor only encrypts to exit node (use HTTPS)  
❌ **Application Layer Security**: Still need to avoid identifying patterns  
❌ **Perfect Anonymity**: Determined adversaries may still correlate activity  

### Best Practices

1. **Always use HTTPS**: Tor encrypts only to exit node
2. **Vary timing**: Don't query at predictable intervals
3. **Use Hecate's misdirection**: Generate decoy queries
4. **Monitor for honeypots**: Use Erebus to detect traps
5. **Clean up evidence**: Use Thanatos after operations

## Troubleshooting

### "Tor not available" Error

**Cause**: Tor daemon not running or not listening on expected port

**Solutions**:
```bash
# Check Tor status
sudo systemctl status tor

# Restart Tor
sudo systemctl restart tor

# Check if port 9050 is listening
netstat -an | grep 9050

# Test SOCKS5 connectivity
curl --socks5-hostname 127.0.0.1:9050 https://check.torproject.org/api/ip
```

### Slow Performance

**Cause**: Tor routing adds latency (typically 2-10x slower)

**Solutions**:
- Use caching aggressively (Hypnos cache)
- Batch queries when possible
- Consider using faster Tor bridges
- For non-sensitive queries, use clearnet mode

### Connection Timeouts

**Cause**: Tor circuit building can timeout

**Solutions**:
```python
# Increase timeout in session
session = get_session(use_tor=True)
response = session.get(url, timeout=30)  # Increase from default 10s
```

### Exit Node Blocked by API

**Cause**: Some services block known Tor exit nodes

**Solutions**:
- Use HTTP/HTTPS proxy instead of Tor
- Request new Tor circuit: `sudo systemctl reload tor`
- Use clearnet mode for that specific API
- Consider running your own private exit node

## Architecture

### Module Structure

```
qig-backend/
├── darknet_proxy.py          # Core Tor/proxy implementation
└── olympus/
    └── shadow_pantheon.py     # Shadow gods using darknet_proxy
```

### Request Flow

```
Application Code
    ↓
darknet_proxy.get_session()
    ↓
[Tor Available?] → Yes → SOCKS5 Proxy → Tor Network → Exit Node → Target API
    ↓ No
Clearnet Session → Target API (direct)
```

### Session Management

- **Tor Session**: Reused for all Tor requests (connection pooling)
- **Clearnet Session**: Separate session for direct requests
- **User Agent**: Rotated on each session retrieval
- **Cache**: In-memory for Tor availability check

## Performance Impact

### Expected Latency

- **Clearnet**: 50-200ms
- **Tor**: 500-3000ms (2-10x slower)

### Throughput

- **Without Tor**: Limited by API rate limits only
- **With Tor**: Also limited by Tor circuit bandwidth (~1-5 MB/s typical)

### Recommendations

- **High-volume queries**: Use clearnet or caching
- **Sensitive queries**: Use Tor (worth the latency)
- **Mixed workload**: Use Hypnos cache + selective Tor routing

## Advanced Configuration

### Custom Tor Port

If running Tor on non-standard port:

```bash
TOR_PROXY=socks5h://127.0.0.1:9150
```

### Multiple Tor Instances

Run multiple Tor daemons for increased throughput:

```bash
# torrc_1 (port 9050)
SocksPort 9050

# torrc_2 (port 9051)
SocksPort 9051

# Start instances
tor -f torrc_1 &
tor -f torrc_2 &

# Use in application (load balance manually)
TOR_PROXY=socks5h://127.0.0.1:9050  # or 9051
```

### Private Bridges

For additional obfuscation, use Tor bridges:

```bash
# torrc
UseBridges 1
Bridge obfs4 [bridge-address]:[port] [fingerprint]

# Get bridges from https://bridges.torproject.org/
```

## Testing

### Manual Testing

Test Tor connectivity manually:

```bash
# Check Tor is running
systemctl status tor

# Test with curl
curl --socks5-hostname 127.0.0.1:9050 https://check.torproject.org/api/ip
# Should return: {"IsTor": true, ...}
```

### Python Integration Test

```bash
# Test with real Tor (requires Tor running)
cd qig-backend
python -c "
from darknet_proxy import get_session, is_tor_available
assert is_tor_available(), 'Tor not available'
session = get_session(use_tor=True)
response = session.get('https://check.torproject.org/api/ip')
data = response.json()
assert data['IsTor'], 'Not using Tor!'
print('✓ Tor integration working')
"
```

## References

- [Tor Project](https://www.torproject.org/)
- [PySocks Documentation](https://github.com/Anorov/PySocks)
- [Requests SOCKS Proxy](https://requests.readthedocs.io/en/latest/user/advanced/#socks)
- [Check Tor API](https://check.torproject.org/api/)

## Support

For issues or questions:
1. Check Tor is running: `systemctl status tor`
2. Test SOCKS5 connectivity: `curl --socks5-hostname 127.0.0.1:9050 https://check.torproject.org/api/ip`
3. Check application logs for darknet status
4. Verify `.env` configuration
