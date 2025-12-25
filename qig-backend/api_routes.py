"""
Centralized API Route Constants (Python)
=========================================

Single source of truth for all API routes.
Mirrors the TypeScript constants in shared/constants/api-routes.ts.

IMPORTANT: Keep in sync with TypeScript version!
Run `npm run constants:export` to regenerate if needed.

Version: 1.0.0 (2025-12-25)
"""

from typing import List

# =============================================================================
# API Versioning
# =============================================================================

API_VERSION = "v1"
API_PREFIX = "/api"


# =============================================================================
# Core Domain Routes
# =============================================================================

class ApiAuth:
    """Authentication routes."""
    PREFIX = f"{API_PREFIX}/auth"
    HEALTH = f"{API_PREFIX}/auth/health"
    USER = f"{API_PREFIX}/auth/user"
    LOGIN = f"{API_PREFIX}/login"
    LOGOUT = f"{API_PREFIX}/logout"


class ApiSearch:
    """Search routes."""
    PREFIX = f"{API_PREFIX}/search"
    JOBS = f"{API_PREFIX}/search/jobs"
    START = f"{API_PREFIX}/search/start"
    STOP = f"{API_PREFIX}/search/stop"
    STATUS = f"{API_PREFIX}/search/status"


class ApiConsciousness:
    """Consciousness/QIG routes."""
    PREFIX = f"{API_PREFIX}/consciousness"
    STATE = f"{API_PREFIX}/consciousness/state"
    METRICS = f"{API_PREFIX}/consciousness/metrics"
    REGIME = f"{API_PREFIX}/consciousness/regime"


class ApiOcean:
    """Ocean agent routes."""
    PREFIX = f"{API_PREFIX}/ocean"
    STATUS = f"{API_PREFIX}/ocean/status"
    MEMORY = f"{API_PREFIX}/ocean/memory"
    NEUROCHEMISTRY = f"{API_PREFIX}/ocean/neurochemistry"


class ApiOlympus:
    """Olympus (god pantheon) routes."""
    PREFIX = f"{API_PREFIX}/olympus"
    ZEUS = f"{API_PREFIX}/olympus/zeus"
    ATHENA = f"{API_PREFIX}/olympus/athena"
    HERMES = f"{API_PREFIX}/olympus/hermes"
    PANTHEON = f"{API_PREFIX}/olympus/pantheon"
    SHADOW = f"{API_PREFIX}/olympus/shadow"


class ApiRecovery:
    """Recovery routes."""
    PREFIX = f"{API_PREFIX}/recovery"
    UNIFIED = f"{API_PREFIX}/unified-recovery"
    WORKFLOWS = f"{API_PREFIX}/recoveries"
    CANDIDATES = f"{API_PREFIX}/recovery/candidates"


class ApiBalance:
    """Balance/blockchain routes."""
    PREFIX = f"{API_PREFIX}/balance"
    HITS = f"{API_PREFIX}/balance-hits"
    ADDRESSES = f"{API_PREFIX}/balance-addresses"
    MONITOR = f"{API_PREFIX}/balance-monitor"
    QUEUE = f"{API_PREFIX}/balance-queue"


class ApiVocabulary:
    """Vocabulary routes."""
    PREFIX = f"{API_PREFIX}/vocabulary"
    WORDS = f"{API_PREFIX}/vocabulary/words"
    SYNC = f"{API_PREFIX}/vocabulary/sync"


# =============================================================================
# Python Backend Routes (QIG-specific)
# =============================================================================

class ApiQiggraph:
    """QIGGraph search integration routes."""
    PREFIX = f"{API_PREFIX}/search/qiggraph"
    SCORE = f"{API_PREFIX}/search/qiggraph/score"
    BATCH = f"{API_PREFIX}/search/qiggraph/batch"
    STATE = f"{API_PREFIX}/search/qiggraph/state"
    STATUS = f"{API_PREFIX}/search/qiggraph/status"


class ApiTacking:
    """Search tacking routes (kappa-tacking + innate drives)."""
    PREFIX = f"{API_PREFIX}/search/tacking"
    STATUS = f"{API_PREFIX}/search/tacking/status"
    UPDATE = f"{API_PREFIX}/search/tacking/update"
    DRIVES = f"{API_PREFIX}/search/tacking/drives"


class ApiShadowSearch:
    """Shadow search bridge routes."""
    PREFIX = f"{API_PREFIX}/shadow/search"
    STATUS = f"{API_PREFIX}/shadow/search/status"
    BATCH_START = f"{API_PREFIX}/shadow/search/batch/start"
    BATCH_END = f"{API_PREFIX}/shadow/search/batch/end"
    HIGH_PHI = f"{API_PREFIX}/shadow/search/high-phi"
    NEAR_MISS = f"{API_PREFIX}/shadow/search/near-miss"
    MATCH_FOUND = f"{API_PREFIX}/shadow/search/match-found"


class ApiTokenizer:
    """Tokenizer persistence routes."""
    PREFIX = f"{API_PREFIX}/tokenizer/pg"
    STATUS = f"{API_PREFIX}/tokenizer/pg/status"
    SYNC = f"{API_PREFIX}/tokenizer/pg/sync"
    HIGH_PHI = f"{API_PREFIX}/tokenizer/pg/high-phi"


# =============================================================================
# Utility Routes
# =============================================================================

class ApiHealth:
    """Health check routes."""
    ROOT = "/health"
    API = f"{API_PREFIX}/health"
    FAVICON = "/favicon.ico"


class ApiTelemetry:
    """Telemetry routes."""
    PREFIX = f"{API_PREFIX}/telemetry"
    SNAPSHOT = f"{API_PREFIX}/telemetry/snapshot"
    SESSION = f"{API_PREFIX}/telemetry/session"


class ApiSelfHealing:
    """Self-healing routes."""
    PREFIX = f"{API_PREFIX}/self-healing"
    STATUS = f"{API_PREFIX}/self-healing/status"
    TRIGGER = f"{API_PREFIX}/self-healing/trigger"


# =============================================================================
# Route Collections
# =============================================================================

ALL_ROUTE_PREFIXES: List[str] = [
    ApiAuth.PREFIX,
    ApiSearch.PREFIX,
    ApiConsciousness.PREFIX,
    ApiOcean.PREFIX,
    ApiOlympus.PREFIX,
    ApiRecovery.PREFIX,
    ApiBalance.PREFIX,
    ApiVocabulary.PREFIX,
    ApiQiggraph.PREFIX,
    ApiTacking.PREFIX,
    ApiShadowSearch.PREFIX,
    ApiTokenizer.PREFIX,
    ApiTelemetry.PREFIX,
    ApiSelfHealing.PREFIX,
]

PYTHON_BACKEND_ROUTES: List[str] = [
    ApiQiggraph.PREFIX,
    ApiTacking.PREFIX,
    ApiShadowSearch.PREFIX,
    ApiTokenizer.PREFIX,
    ApiOlympus.PREFIX,
    ApiOcean.PREFIX,
]

PUBLIC_ROUTES: List[str] = [
    ApiHealth.ROOT,
    ApiHealth.API,
    ApiHealth.FAVICON,
    ApiAuth.HEALTH,
    ApiAuth.LOGIN,
]


# =============================================================================
# Convenience Exports
# =============================================================================

# For backwards compatibility with existing code
API_AUTH = ApiAuth
API_SEARCH = ApiSearch
API_CONSCIOUSNESS = ApiConsciousness
API_OCEAN = ApiOcean
API_OLYMPUS = ApiOlympus
API_RECOVERY = ApiRecovery
API_BALANCE = ApiBalance
API_VOCABULARY = ApiVocabulary
API_QIGGRAPH = ApiQiggraph
API_TACKING = ApiTacking
API_SHADOW_SEARCH = ApiShadowSearch
API_TOKENIZER = ApiTokenizer
API_HEALTH = ApiHealth
API_TELEMETRY = ApiTelemetry
API_SELF_HEALING = ApiSelfHealing
