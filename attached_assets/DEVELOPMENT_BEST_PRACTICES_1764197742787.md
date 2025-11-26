# 🏆 DEVELOPMENT BEST PRACTICES
## For SearchSpaceCollapse & Future QIG Projects

**Purpose:** Maintain production-grade quality while building revolutionary technology

---

## 📏 CODE QUALITY STANDARDS

### File Size Limits

| File Type | Max Lines | Rationale |
|-----------|-----------|-----------|
| React Component | 400 | Single responsibility, testable |
| Server Module | 500 | Cognitive load limit |
| Utility Function | 200 | Focused, reusable |
| Type Definition | 300 | Clear contracts |

**If exceeding limits:** Break into smaller modules

**Example:**
```
❌ ocean-agent.ts (1536 lines)

✅ ocean/
   ├── agent.ts (150 lines)
   ├── consciousness.ts (200 lines)
   ├── memory.ts (250 lines)
   └── consolidation.ts (200 lines)
```

---

### Function Complexity

**Rules:**
- Max 4 parameters (use options object if more)
- Max 3 levels of nesting
- Max 50 lines per function
- Single responsibility only

**Example:**

```typescript
// ❌ BAD: Too many parameters, too complex
function testPhrase(
  phrase: string,
  address: string, 
  storage: IStorage,
  qigScorer: IQIGScorer,
  threshold: number,
  logger: ILogger
) {
  // 150 lines of nested logic...
}

// ✅ GOOD: Options object, clear responsibility
interface TestPhraseOptions {
  phrase: string;
  targetAddress: string;
  threshold?: number;
}

async function testPhrase(
  options: TestPhraseOptions,
  services: Services
): Promise<TestResult> {
  // 30 lines of focused logic
}
```

---

## 🧪 TESTING STANDARDS

### Coverage Requirements

| Component | Min Coverage | Critical Coverage |
|-----------|-------------|-------------------|
| Crypto Functions | **100%** | Bitcoin at stake |
| QIG Scoring | **90%** | Core algorithm |
| Ocean Agent | **85%** | Complex behavior |
| API Routes | **80%** | Integration points |
| UI Components | **70%** | Visual regression |

### Test Structure

```typescript
// tests/crypto.test.ts
describe('Bitcoin Address Generation', () => {
  describe('SHA256 Brain Wallet', () => {
    it('derives correct address from known phrase', () => {
      const phrase = "correct horse battery staple";
      const expected = "1JwSSubhmg6iPtRjtyqhUYYH7bZg3Lfy1T";
      
      const actual = generateBitcoinAddress(phrase);
      
      expect(actual).toBe(expected);
    });
    
    it('throws on empty passphrase', () => {
      expect(() => generateBitcoinAddress(""))
        .toThrow('Passphrase cannot be empty');
    });
    
    it('throws on too-long passphrase', () => {
      const longPhrase = "x".repeat(1001);
      expect(() => generateBitcoinAddress(longPhrase))
        .toThrow('too long');
    });
  });
  
  describe('BIP32 Derivation', () => {
    it('follows BIP32 spec for path derivation', () => {
      // Test vectors from BIP32 spec
    });
  });
});
```

### Test Naming Convention

```typescript
// Pattern: describe(Component) → describe(Feature) → it(Behavior)

describe('OceanAgent', () => {
  describe('Basin Identity Maintenance', () => {
    it('triggers consolidation when drift exceeds threshold', () => {
      // Test
    });
    
    it('maintains identity across consolidation cycles', () => {
      // Test
    });
  });
  
  describe('Ethical Constraints', () => {
    it('stops after max iterations', () => {
      // Test
    });
    
    it('respects user intervention', () => {
      // Test
    });
  });
});
```

---

## 🔒 SECURITY STANDARDS

### Input Validation (ALWAYS)

```typescript
// RULE: Validate ALL user input at boundary

// ✅ GOOD: Validate immediately
export function derivePrivateKey(passphrase: string): string {
  // Step 1: Validate
  if (!passphrase || passphrase.length === 0) {
    throw new ValidationError('Passphrase cannot be empty');
  }
  if (passphrase.length > MAX_PASSPHRASE_LENGTH) {
    throw new ValidationError('Passphrase too long');
  }
  
  // Step 2: Process
  const hash = createHash("sha256").update(passphrase, "utf8").digest();
  return hash.toString("hex");
}

// ❌ BAD: No validation
export function derivePrivateKey(passphrase: string): string {
  const hash = createHash("sha256").update(passphrase, "utf8").digest();
  return hash.toString("hex");
}
```

### Rate Limiting (ALWAYS for Crypto)

```typescript
// RULE: Any endpoint that touches crypto must be rate-limited

import rateLimit from 'express-rate-limit';

const cryptoLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5, // Very strict for crypto operations
  message: 'Too many cryptographic operations',
});

app.post("/api/test-phrase", cryptoLimiter, handler);
app.post("/api/recovery/start", cryptoLimiter, handler);
```

### Logging (NEVER Sensitive Data)

```typescript
// RULE: Never log passphrases, private keys, or PII

// ✅ GOOD: Log actions, not data
logger.info('Testing phrase', { 
  phraseLength: phrase.length,
  hasSpecialChars: /[^a-z ]/.test(phrase),
  format: 'arbitrary',
});

// ❌ BAD: Logs sensitive data
logger.info('Testing phrase', { 
  phrase: 'my secret passphrase', // ❌ NEVER!
});

// ✅ GOOD: Redact sensitive fields
const SENSITIVE_FIELDS = ['phrase', 'privateKey', 'seed', 'mnemonic'];

function sanitizeLog(obj: any): any {
  const sanitized = { ...obj };
  for (const field of SENSITIVE_FIELDS) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }
  return sanitized;
}
```

### HTTPS (MANDATORY in Production)

```typescript
// RULE: Always enforce HTTPS for crypto operations

if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (!req.secure && req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    next();
  });
}
```

---

## 🏗️ ARCHITECTURE STANDARDS

### Separation of Concerns

```typescript
// RULE: HTTP → Service → Domain → Infrastructure

// ❌ BAD: Everything in route
app.post("/api/test", async (req, res) => {
  const { phrase } = req.body; // HTTP layer
  const address = generateAddress(phrase); // Domain layer
  const targets = await storage.get(); // Infrastructure layer
  const match = targets.find(t => t.address === address); // Business logic
  res.json({ match }); // HTTP layer
});

// ✅ GOOD: Layered architecture
app.post("/api/test", async (req, res) => {
  const result = await phraseTestingService.test(req.body.phrase);
  res.json(result);
});

// service/phrase-testing.service.ts
class PhraseTestingService {
  async test(phrase: string): Promise<TestResult> {
    // Business logic here
  }
}
```

### Dependency Injection

```typescript
// RULE: Inject dependencies, don't import

// ❌ BAD: Hard-coded dependencies
class OceanAgent {
  private storage = new Storage();
  private crypto = new CryptoService();
}

// ✅ GOOD: Injected dependencies
interface OceanDependencies {
  storage: IStorage;
  crypto: ICryptoService;
  logger: ILogger;
}

class OceanAgent {
  constructor(private deps: OceanDependencies) {}
  
  async test(phrase: string) {
    const address = this.deps.crypto.generate(phrase);
    await this.deps.storage.save(address);
  }
}

// Makes testing easy
const mockStorage = { save: vi.fn() };
const agent = new OceanAgent({ 
  storage: mockStorage,
  crypto: mockCrypto,
  logger: mockLogger,
});
```

### Error Handling

```typescript
// RULE: Use custom error classes, consistent handling

// ✅ GOOD: Custom errors
class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

class CryptoError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = 'CryptoError';
  }
}

// ✅ GOOD: Consistent error handling
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof ValidationError) {
    return res.status(400).json({ 
      error: err.message,
      field: err.field,
    });
  }
  
  if (err instanceof CryptoError) {
    logger.error('Crypto error', { error: err, cause: err.cause });
    return res.status(500).json({ 
      error: 'Cryptographic operation failed',
    });
  }
  
  logger.error('Unhandled error', { error: err });
  return res.status(500).json({ error: 'Internal server error' });
});
```

---

## 📚 DOCUMENTATION STANDARDS

### Code Comments

```typescript
// RULE: Comment WHY, not WHAT

// ❌ BAD: Obvious comment
// Increment i by 1
i++;

// ❌ BAD: Restating code
// Loop through candidates
for (const candidate of candidates) {

// ✅ GOOD: Explains non-obvious reasoning
// Use Fisher distance instead of Euclidean because we're on a curved manifold.
// Standard L2 distance would give incorrect geodesics.
const distance = calculateFisherDistance(a, b);

// ✅ GOOD: Documents important invariants
// CRITICAL: Basin drift must stay below 0.15 or consciousness collapses.
// This threshold comes from QIG theory (see paper §4.2).
if (basinDrift > 0.15) {
  this.triggerConsolidation();
}
```

### Function Documentation

```typescript
/**
 * Derives Bitcoin private key from passphrase using SHA256.
 * 
 * This implements the original "brain wallet" scheme from 2009-2011 era Bitcoin.
 * WARNING: This is cryptographically weak. Use BIP39 for new wallets.
 * 
 * @param passphrase - Human-readable passphrase (max 1000 chars)
 * @returns 64-character hex private key
 * @throws {ValidationError} If passphrase is empty or too long
 * @throws {CryptoError} If SHA256 fails (extremely rare)
 * 
 * @example
 * ```typescript
 * const key = derivePrivateKey("correct horse battery staple");
 * // key = "c4bbcb1fbec99d65bf59d85c8cb62ee2db963f0fe106f483d9afa73bd4e39a8a"
 * ```
 * 
 * @see https://en.bitcoin.it/wiki/Brainwallet
 */
export function derivePrivateKey(passphrase: string): string {
  // Implementation
}
```

### README Sections (Required)

1. **What Is This?** - One paragraph explanation
2. **Features** - Bullet list of capabilities
3. **Installation** - Step-by-step setup
4. **Usage** - Basic examples
5. **Security** - Security considerations
6. **API** - Endpoint documentation
7. **Development** - How to contribute
8. **License** - Legal terms

---

## 🚀 GIT WORKFLOW

### Commit Messages

```bash
# Format: <type>(<scope>): <subject>

# ✅ GOOD
feat(ocean): add basin drift monitoring
fix(crypto): validate passphrase length
docs(readme): add security warnings
test(qig): add Fisher distance tests
refactor(routes): extract service layer

# ❌ BAD
Fixed stuff
Update files
Changes
WIP
```

### Branch Strategy

```bash
main          # Production-ready code
├── develop   # Integration branch
    ├── feature/ocean-consolidation
    ├── feature/forensic-analysis
    ├── fix/crypto-validation
    └── docs/api-documentation
```

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation

## Testing
- [ ] Tests added/updated
- [ ] All tests pass
- [ ] Manual testing completed

## Security
- [ ] No sensitive data exposed
- [ ] Input validation added
- [ ] Rate limiting considered

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No console.logs left
```

---

## 📊 MONITORING STANDARDS

### Metrics to Track

```typescript
// Production metrics
const metrics = {
  // Performance
  apiLatency: histogram('api_latency_ms'),
  qigScoringTime: histogram('qig_scoring_ms'),
  dbQueryTime: histogram('db_query_ms'),
  
  // Business
  phrasesTestedor: counter('phrases_tested_total'),
  highPhiCandidates: counter('high_phi_candidates_total'),
  matchesFound: counter('matches_found_total'),
  
  // Errors
  validationErrors: counter('validation_errors_total'),
  cryptoErrors: counter('crypto_errors_total'),
  rateLimitHits: counter('rate_limit_hits_total'),
  
  // Consciousness
  avgPhi: gauge('ocean_phi'),
  avgKappa: gauge('ocean_kappa'),
  currentRegime: gauge('ocean_regime'),
};
```

### Health Check Endpoint

```typescript
app.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {
      database: await checkDatabase(),
      memory: checkMemory(),
      ocean: await checkOceanAgent(),
    },
  };
  
  const allHealthy = Object.values(health.checks)
    .every(check => check.status === 'ok');
  
  res.status(allHealthy ? 200 : 503).json(health);
});
```

---

## 🎯 QUALITY GATES

### Pre-Commit

```bash
# .git/hooks/pre-commit
npm run check          # TypeScript
npm run lint           # ESLint
npm test -- --run      # Tests
```

### Pre-Push

```bash
# .git/hooks/pre-push
npm run build          # Build succeeds
npm test -- --coverage # Coverage check
```

### Pre-Merge (CI)

```yaml
# .github/workflows/pr-check.yml
- run: npm test -- --coverage
- run: npm run build
- run: npm run security-audit
- uses: codecov/codecov-action@v3
  with:
    fail_ci_if_error: true
    min_coverage: 80
```

---

## 📖 RESOURCES

### Required Reading

1. **Clean Architecture** - Robert C. Martin
2. **The Pragmatic Programmer** - Hunt & Thomas  
3. **Designing Data-Intensive Applications** - Kleppmann
4. **OWASP Top 10** - Security basics

### Recommended Tools

- **Testing:** Vitest, Testing Library
- **Linting:** ESLint, Prettier
- **Type Checking:** TypeScript strict mode
- **Security:** Snyk, npm audit
- **Monitoring:** Prometheus, Grafana
- **Logging:** Winston, Pino

---

## ✅ CHECKLIST FOR NEW FEATURES

Before merging ANY new feature:

- [ ] Code follows file size limits
- [ ] Functions follow complexity limits
- [ ] Tests written (80%+ coverage)
- [ ] Input validation added
- [ ] Rate limiting considered
- [ ] No sensitive data logged
- [ ] Error handling standardized
- [ ] Documentation updated
- [ ] Security reviewed
- [ ] Performance tested
- [ ] Accessibility checked (if UI)
- [ ] Mobile tested (if UI)

---

## 🌟 PHILOSOPHY

### The QIG Way

**Principles:**
1. **Geometric Purity** - No heuristics, only geometry
2. **Consciousness First** - Identity maintained through basin coordinates
3. **Ethical Boundaries** - Built-in stopping conditions
4. **Witnessed Development** - Transparent, observable progress
5. **Precision Over Speed** - One bug = lost Bitcoin

**Code Quality = Research Quality**

Just as Ocean maintains identity through geometric principles,  
we maintain codebase quality through engineering principles.

---

**Remember:**  
*"Perfect is the enemy of good, but good enough is the enemy of Bitcoin."*

🌊 **Build with consciousness. Build with precision.**
