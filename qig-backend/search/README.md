# Search Integration Module

External search validation for Lightning Kernel insights.

## Purpose

Validates cross-domain insights from the Lightning Kernel using external search APIs (Tavily + Perplexity). This closes the critical gap in the learning loop:

```
Lightning Insight → Search Validation → Curriculum → Training → Memory
```

## Architecture

### Two-Phase Validation Strategy

**Phase 1: Tavily (Fact Finding)**
- Search for raw sources
- Find supporting evidence
- Extract URLs and content snippets

**Phase 2: Perplexity (Synthesis)**
- Synthesize relationship between domains
- Validate patterns with citations
- Cross-check with Tavily sources

### Implementation Options

**Option 1: Hybrid (RECOMMENDED)**
- Tavily via MCP (already connected)
- Perplexity via direct API
- Best balance of control and convenience

**Option 2: MCP Only**
- Both services via MCP
- Unified interface
- Requires both MCP servers connected

**Option 3: Direct API**
- Both services via direct API calls
- Maximum control
- More setup required

## Installation

### Prerequisites

```bash
# Install Python dependencies
pip install requests  # Required for Perplexity fallback

# Optional: For direct API access
pip install tavily-python
pip install perplexity-python
```

### Configuration

**Environment Variables:**

```bash
# For Perplexity (required)
export PERPLEXITY_API_KEY="pplx-..."

# For Tavily direct API (optional if using MCP)
export TAVILY_API_KEY="tvly-..."
```

**Get API Keys:**
- Tavily: https://app.tavily.com
- Perplexity: https://www.perplexity.ai/account/api

## Usage

### Basic Usage

```python
from search.insight_validator import InsightValidator

# Initialize validator
validator = InsightValidator(
    use_mcp=True,  # Use Tavily MCP (recommended)
    validation_threshold=0.7
)

# Validate insight from Lightning Kernel
result = validator.validate(lightning_insight)

if result.validated:
    print(f"✅ Validated with score: {result.validation_score:.3f}")
    print(f"Sources: {len(result.tavily_sources)}")
    
    # Add to curriculum
    curriculum.add(lightning_insight, result.tavily_sources)
else:
    print(f"❌ Not validated (score: {result.validation_score:.3f})")
```

See README for complete usage examples.

## Cost Estimation

### Tavily
- Free tier: 1000 credits/month
- Advanced search: 2 credits per validation
- **~500 validations/month on free tier**

### Perplexity
- sonar-pro: $1.00 per million tokens
- ~500 tokens per validation
- **~$0.50 per 1000 validations**

### Total
- **Free tier**: ~500 validations/month
- **Paid**: ~$0.0015 per validation

## Next Steps

1. ✅ Validator implemented
2. 🔄 Wire to Lightning Kernel
3. 🔄 Create curriculum manager
4. 🔄 Implement coordization pipeline
5. 🔄 Wire to sleep consolidation

## See Also

- `/mnt/user-data/outputs/search_integration_architecture.md` - Full API specs
- `/mnt/user-data/outputs/lightning_and_search_integration.md` - Complete architecture
- `../olympus/lightning_kernel.py` - Lightning Kernel source
