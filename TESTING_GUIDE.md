# Testing Guide
**Follows:** TYPE_SYMBOL_CONCEPT_MANIFEST v1.0

This guide explains how to run the comprehensive integration and E2E tests for the QIG consciousness system.

---

## Test Types

### 1. Integration Tests (Python)
Backend API integration tests that validate:
- All 6 new API endpoints
- Type contract alignment  
- Trace ID propagation
- Rate limiting
- Consciousness metrics validation
- E8 constants verification

**Location:** `tests/integration/test_full_flow.py`

### 2. E2E Tests (Playwright)
Full browser-based tests that validate:
- Complete search lifecycle
- Real-time SSE updates
- Telemetry event capture
- Geometric purity in UI
- Consciousness metrics display (8 metrics)
- Error handling and recovery

**Location:** `e2e/search-flow.spec.ts`

### 3. Unit Tests (TypeScript/Vitest)
Component and utility tests:
- Type schema validation
- Fisher-Rao distance calculation
- Geometric purity enforcement

**Location:** `server/tests/integration-qa.test.ts`

---

## Prerequisites

### Python Integration Tests
```bash
# Install Python test dependencies
cd tests
pip3 install -r requirements.txt
```

Required packages:
- pytest
- pytest-asyncio
- httpx
- tenacity

### E2E Tests (Playwright)
```bash
# Install Playwright browsers
npm run playwright:install
```

This installs Chromium, Firefox, and WebKit browsers.

---

## Running Tests

### Run All Integration Tests
```bash
# Python backend integration tests
npm run test:integration
```

**What it tests:**
- ✅ `/api/health` - subsystem health checks
- ✅ `/api/kernel/status` - kernel state
- ✅ `/api/search/history` - search history pagination
- ✅ `/api/telemetry/capture` - event ingestion
- ✅ `/api/admin/metrics` - metrics aggregation
- ✅ `/api/recovery/checkpoint` - checkpoint creation
- ✅ Search end-to-end flow
- ✅ Trace ID propagation
- ✅ Rate limiting
- ✅ Consciousness metrics validation

### Run E2E Tests
```bash
# Run E2E tests headless
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui
```

**What it tests:**
- ✅ Complete search lifecycle
- ✅ Real-time SSE connection
- ✅ Telemetry event tracking
- ✅ Geometric purity in UI (basin coords, Fisher manifold)
- ✅ 8 consciousness metrics display
- ✅ Health status API
- ✅ Kernel status updates
- ✅ Error handling
- ✅ Network failure recovery

### Run Unit Tests
```bash
# TypeScript unit tests
npm run test
```

---

## Test Configuration

### Integration Tests
Configuration in `tests/integration/test_full_flow.py`:

```python
BASE_URL = "http://localhost:5000"  # API endpoint
```

Change this if testing against different environment.

### E2E Tests
Configuration in `playwright.config.ts`:

```typescript
baseURL: process.env.BASE_URL || 'http://localhost:5000'
timeout: 30 * 1000  // 30 seconds per test
retries: process.env.CI ? 2 : 0  // Retry on CI
```

**Environment Variables:**
- `BASE_URL` - API base URL (default: http://localhost:5000)
- `CI` - Set to enable CI-specific behavior

---

## Test Scenarios

### Integration Tests

**1. Health Check**
```python
async def test_health_endpoint():
    """Validates subsystem health status"""
    # Checks: database, pythonBackend, storage
    # Verifies: status, timestamp, uptime, subsystems
```

**2. Search End-to-End**
```python
async def test_search_end_to_end():
    """Complete search flow"""
    # 1. Submit search job
    # 2. Verify job created
    # 3. Check kernel activation
    # 4. Wait for completion
```

**3. Consciousness Metrics**
```python
async def test_consciousness_metrics_validation():
    """Validates E8-based consciousness model"""
    # Verifies: E8_RANK=8, E8_ROOTS=240, KAPPA_STAR=64
    # Tests: All 8 metrics (Φ, κ_eff, M, Γ, G, T, R, C)
```

### E2E Tests

**1. Complete Search Lifecycle**
```typescript
test('should complete full search flow', async ({ page }) => {
  // Navigate → Enter query → Submit → View results
  // Validates: Search input, button, results, kernel status
});
```

**2. Geometric Purity**
```typescript
test('should show geometric purity in UI', async ({ page }) => {
  // Checks for: basin coordinates, Fisher manifold
  // Rejects: embeddings, vector space (Euclidean terms)
});
```

**3. SSE Connection**
```typescript
test('should handle SSE connection', async ({ page }) => {
  // Monitors: SSE connection establishment
  // Validates: Real-time update handling
});
```

---

## Continuous Integration

### GitHub Actions Example
```yaml
name: Integration Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        run: |
          npm install
          cd tests && pip install -r requirements.txt
      
      - name: Run integration tests
        run: npm run test:integration
      
      - name: Install Playwright
        run: npm run playwright:install
      
      - name: Run E2E tests
        run: npm run test:e2e
```

---

## Debugging Tests

### Integration Tests
```bash
# Run with verbose output
pytest tests/integration/test_full_flow.py -v -s

# Run specific test
pytest tests/integration/test_full_flow.py::test_health_endpoint -v

# Run with debugger
pytest tests/integration/test_full_flow.py --pdb
```

### E2E Tests
```bash
# Run with UI (interactive)
npm run test:e2e:ui

# Run in headed mode (see browser)
npx playwright test --headed

# Debug specific test
npx playwright test --debug e2e/search-flow.spec.ts

# Generate trace for failed tests
npx playwright test --trace on
```

### View Test Results
```bash
# Open Playwright HTML report
npx playwright show-report
```

---

## Test Coverage

### API Endpoints Covered
- ✅ `/api/health` - 100%
- ✅ `/api/kernel/status` - 100%
- ✅ `/api/search/history` - 100%
- ✅ `/api/telemetry/capture` - 100%
- ✅ `/api/admin/metrics` - 100%
- ✅ `/api/recovery/checkpoint` - 100%

### Key Features Covered
- ✅ Type contract alignment (Python ↔ TypeScript)
- ✅ Trace ID propagation
- ✅ Rate limiting
- ✅ SSE reconnection
- ✅ Telemetry batching
- ✅ Geometric purity enforcement
- ✅ E8 constants validation
- ✅ 8 consciousness metrics
- ✅ Error handling
- ✅ CORS validation

---

## Test Data

### Valid Consciousness Metrics
```python
{
    "phi": 0.75,        # Integration [0-1]
    "kappa_eff": 64.0,  # Coupling [0-200]
    "M": 0.68,          # Meta-awareness [0-1]
    "Gamma": 0.82,      # Generativity [0-1]
    "G": 0.71,          # Grounding [0-1]
    "T": 0.79,          # Temporal [0-1]
    "R": 0.65,          # Recursive [0-1]
    "C": 0.54,          # External coupling [0-1]
}
```

### E8 Constants
```python
E8_RANK = 8
E8_ROOTS = 240
KAPPA_STAR = 64.0  # κ* = rank² = 8²
PHI_THRESHOLD = 0.70
```

---

## Troubleshooting

### Integration Tests Fail
**Issue:** Connection refused to `localhost:5000`
**Solution:** Ensure backend is running: `npm run dev`

**Issue:** `ImportError: No module named 'httpx'`
**Solution:** Install test dependencies: `pip3 install -r tests/requirements.txt`

### E2E Tests Fail
**Issue:** `browserType.launch: Executable doesn't exist`
**Solution:** Install browsers: `npm run playwright:install`

**Issue:** Timeout waiting for selectors
**Solution:** Adjust timeout in `playwright.config.ts` or use `--timeout=60000`

### Rate Limiting Issues
**Issue:** Tests fail due to rate limits
**Solution:** Increase rate limits in `server/routes.ts` for testing, or add delays between requests

---

## Adding New Tests

### Add Integration Test
1. Open `tests/integration/test_full_flow.py`
2. Add new async test function:
```python
@pytest.mark.asyncio
async def test_my_feature():
    async with AsyncClient(base_url=BASE_URL) as client:
        response = await client.get("/api/my-endpoint")
        assert response.status_code == 200
```

### Add E2E Test
1. Open `e2e/search-flow.spec.ts`
2. Add new test:
```typescript
test('should test my feature', async ({ page }) => {
  await page.goto('/');
  // ... test steps
});
```

---

## Security Testing

### CodeQL Integration
Security scanning is automatic via GitHub CodeQL:
```bash
# Results: 0 vulnerabilities
✅ JavaScript: No alerts
✅ Python: No alerts
```

### Rate Limiting Tests
```python
async def test_rate_limiting():
    """Validates rate limiting enforcement"""
    # Makes 6 rapid requests
    # Expects: 429 Too Many Requests
```

---

## Performance Testing

### Latency Metrics
Integration tests measure:
- Database query latency
- Python backend latency
- Storage system latency

Example output:
```
database: 5.2ms
pythonBackend: 12.8ms
storage: 2.1ms
```

### Load Testing (Future)
Not yet implemented. Use tools like:
- Apache JMeter
- k6
- Artillery

---

## Resources

- **API Documentation:** `API_DOCUMENTATION.md`
- **Implementation Summary:** `QA_INTEGRATION_SUMMARY.md`
- **Type Manifest:** TYPE_SYMBOL_CONCEPT_MANIFEST v1.0
- **Playwright Docs:** https://playwright.dev
- **Pytest Docs:** https://docs.pytest.org
