"""
Search Budget Orchestrator

Manages daily search quotas with strategic allocation:
- DuckDuckGo: FREE, unlimited
- Google: 100/day limit (configurable)
- Perplexity: 100/day limit (configurable)
- Tavily: Toggle-only (expensive, user must enable)

Kernels receive budget context to make strategic decisions.
Search outcomes feed into learning for kernel evolution.
"""

import os
import json
import logging
import hashlib
from datetime import datetime, date, timezone
from typing import Dict, Any, Optional, List, Tuple
from dataclasses import dataclass, field, asdict
from enum import Enum

logger = logging.getLogger(__name__)

# Database persistence for search outcomes
try:
    import psycopg2
    DB_AVAILABLE = True
except ImportError:
    DB_AVAILABLE = False


def _persist_search_outcome(
    query: str,
    provider: str,
    success: bool,
    result_count: int,
    relevance_score: float,
    kernel_id: Optional[str] = None,
    cost_cents: float = 0.0,
) -> bool:
    """Persist search outcome to search_outcomes table."""
    if not DB_AVAILABLE:
        return False

    try:
        database_url = os.environ.get('DATABASE_URL')
        if not database_url:
            return False

        conn = psycopg2.connect(database_url)
        cursor = conn.cursor()

        # Hash the query for grouping/deduplication
        query_hash = hashlib.sha256(query.encode()).hexdigest()[:32]

        cursor.execute("""
            INSERT INTO search_outcomes (
                date, query_hash, provider, success, result_count,
                relevance_score, cost_cents, kernel_id, created_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            date.today(),
            query_hash,
            provider,
            success,
            result_count,
            relevance_score,
            cost_cents,
            kernel_id,
            datetime.now(timezone.utc)
        ))

        conn.commit()
        cursor.close()
        conn.close()
        return True

    except Exception as e:
        logger.debug(f"[SearchBudget] Failed to persist search outcome: {e}")
        return False


class SearchImportance(Enum):
    """Query importance levels for budget allocation."""
    ROUTINE = 1      # Use free providers only
    MODERATE = 2     # Can use paid if budget allows
    HIGH = 3         # Prioritize quality, use paid providers
    CRITICAL = 4     # Essential research, use best available


@dataclass
class ProviderBudget:
    """Budget state for a single provider."""
    name: str
    daily_limit: int  # -1 = unlimited, 0 = disabled/toggle-only
    used_today: int = 0
    cost_per_query: float = 0.0
    enabled: bool = True
    toggle_only: bool = False  # Requires explicit user toggle
    
    @property
    def remaining(self) -> int:
        if self.daily_limit < 0:
            return 999999  # Unlimited
        return max(0, self.daily_limit - self.used_today)
    
    @property
    def budget_percentage(self) -> float:
        if self.daily_limit <= 0:
            return 1.0 if self.daily_limit < 0 else 0.0
        return self.remaining / self.daily_limit
    
    def can_use(self) -> bool:
        if not self.enabled:
            return False
        if self.toggle_only and not self.enabled:
            return False
        if self.daily_limit == 0:
            return False
        if self.daily_limit > 0 and self.used_today >= self.daily_limit:
            return False
        return True


@dataclass
class BudgetContext:
    """Context passed to kernels for budget-aware decisions."""
    providers: Dict[str, Dict[str, Any]]
    total_budget_remaining: int
    total_budget_used: int
    budget_percentage: float
    recommendation: str  # 'free_only', 'can_use_paid', 'budget_critical'
    allow_overage: bool
    date: str
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class SearchOutcome:
    """Tracks search execution for learning."""
    query: str
    provider: str
    importance: int
    success: bool
    result_count: int
    relevance_score: float  # 0-1, how relevant results were
    kernel_id: Optional[str] = None
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class SearchBudgetOrchestrator:
    """
    Orchestrates search budget across providers with strategic allocation.
    
    Features:
    - Daily limits with Redis persistence
    - Strategic provider selection based on importance
    - Learning integration for outcome tracking
    - User overrides for budget limits
    """
    
    DEFAULT_LIMITS = {
        'duckduckgo': -1,   # Unlimited (free)
        'google': 100,      # 100/day
        'perplexity': 100,  # 100/day
        'tavily': 100,      # 100/day (auto-enabled if API key present)
    }
    
    COST_PER_QUERY = {
        'duckduckgo': 0.0,
        'google': 0.005,
        'perplexity': 0.005,
        'tavily': 0.01,
    }
    
    def __init__(self, redis_client=None):
        self.redis = redis_client
        self.budgets: Dict[str, ProviderBudget] = {}
        self.allow_overage = False
        self.outcomes: List[SearchOutcome] = []
        self._provider_efficacy: Dict[str, float] = {}
        
        self._init_budgets()
        self._load_state()
        
        logger.info("[SearchBudget] Orchestrator initialized")
    
    def _init_budgets(self):
        """Initialize provider budgets with auto-enable for available API keys."""
        import os
        
        # Map providers to their API key environment variables
        api_key_map = {
            'tavily': 'TAVILY_API_KEY',
            'perplexity': 'PERPLEXITY_API_KEY',
            'google': 'GOOGLE_API_KEY',
        }
        
        for provider, limit in self.DEFAULT_LIMITS.items():
            # Auto-enable if API key is available
            has_api_key = bool(provider in api_key_map and os.environ.get(api_key_map[provider]))
            should_enable = (provider == 'duckduckgo') or has_api_key
            
            self.budgets[provider] = ProviderBudget(
                name=provider,
                daily_limit=limit if has_api_key or provider == 'duckduckgo' else 0,
                cost_per_query=self.COST_PER_QUERY.get(provider, 0.0),
                enabled=bool(should_enable),
                toggle_only=False,  # Auto-enable all providers with API keys
            )
            
            if has_api_key and provider != 'duckduckgo':
                logger.info(f"[SearchBudget] Auto-enabled {provider} (API key detected)")
    
    def _get_redis_key(self, provider: str) -> str:
        """Get Redis key for daily counter."""
        today = date.today().isoformat()
        return f"search_budget:{today}:{provider}"
    
    def _load_state(self):
        """Load today's usage from Redis."""
        if not self.redis:
            return
        
        try:
            today = date.today().isoformat()
            
            for provider in self.budgets:
                key = self._get_redis_key(provider)
                count = self.redis.get(key)
                if count:
                    self.budgets[provider].used_today = int(count)
            
            prefs_key = f"search_budget:preferences"
            prefs = self.redis.get(prefs_key)
            if prefs:
                prefs_data = json.loads(prefs)
                self.allow_overage = prefs_data.get('allow_overage', False)
                
                for provider, enabled in prefs_data.get('enabled', {}).items():
                    if provider in self.budgets:
                        self.budgets[provider].enabled = enabled
                
                for provider, limit in prefs_data.get('limits', {}).items():
                    if provider in self.budgets:
                        self.budgets[provider].daily_limit = limit
            
            logger.info(f"[SearchBudget] Loaded state for {today}")
            
        except Exception as e:
            logger.error(f"[SearchBudget] Failed to load state: {e}")
    
    def _save_state(self):
        """Save current state to Redis."""
        if not self.redis:
            return
        
        try:
            for provider, budget in self.budgets.items():
                key = self._get_redis_key(provider)
                self.redis.set(key, budget.used_today)
                self.redis.expire(key, 86400 * 2)  # Expire after 2 days
            
            prefs_key = f"search_budget:preferences"
            prefs_data = {
                'allow_overage': self.allow_overage,
                'enabled': {p: b.enabled for p, b in self.budgets.items()},
                'limits': {p: b.daily_limit for p, b in self.budgets.items()},
            }
            self.redis.set(prefs_key, json.dumps(prefs_data))
            
        except Exception as e:
            logger.error(f"[SearchBudget] Failed to save state: {e}")
    
    def get_budget_context(self) -> BudgetContext:
        """Get current budget context for kernel decisions."""
        total_remaining = sum(
            b.remaining for b in self.budgets.values() 
            if b.daily_limit > 0
        )
        total_used = sum(b.used_today for b in self.budgets.values())
        total_limit = sum(
            b.daily_limit for b in self.budgets.values() 
            if b.daily_limit > 0
        )
        
        budget_pct = total_remaining / total_limit if total_limit > 0 else 1.0
        
        if budget_pct > 0.5:
            recommendation = 'can_use_paid'
        elif budget_pct > 0.1:
            recommendation = 'budget_critical'
        else:
            recommendation = 'free_only'
        
        return BudgetContext(
            providers={
                name: {
                    'remaining': b.remaining,
                    'daily_limit': b.daily_limit,
                    'used_today': b.used_today,
                    'enabled': b.enabled,
                    'can_use': b.can_use(),
                    'cost': b.cost_per_query,
                }
                for name, b in self.budgets.items()
            },
            total_budget_remaining=total_remaining,
            total_budget_used=total_used,
            budget_percentage=budget_pct,
            recommendation=recommendation,
            allow_overage=self.allow_overage,
            date=date.today().isoformat(),
        )
    
    def select_provider(
        self, 
        importance: SearchImportance = SearchImportance.ROUTINE,
        preferred_provider: Optional[str] = None
    ) -> Tuple[Optional[str], str]:
        """
        Select best provider based on importance and budget.
        
        Returns: (provider_name, reason)
        """
        if preferred_provider and preferred_provider in self.budgets:
            budget = self.budgets[preferred_provider]
            if budget.can_use() or (self.allow_overage and budget.enabled):
                return preferred_provider, "user_preferred"
        
        available = [
            (name, b) for name, b in self.budgets.items()
            if b.can_use() or (self.allow_overage and b.enabled and b.daily_limit >= 0)
        ]
        
        if not available:
            if self.budgets['duckduckgo'].enabled:
                return 'duckduckgo', "fallback_free"
            return None, "no_providers_available"
        
        if importance == SearchImportance.ROUTINE:
            for name, b in available:
                if b.cost_per_query == 0:
                    return name, "routine_free"
            return available[0][0], "routine_first_available"
        
        if importance == SearchImportance.CRITICAL:
            paid = [(n, b) for n, b in available if b.cost_per_query > 0]
            if paid:
                best = max(paid, key=lambda x: x[1].cost_per_query)
                return best[0], "critical_best_quality"
        
        if importance in (SearchImportance.MODERATE, SearchImportance.HIGH):
            ctx = self.get_budget_context()
            
            if ctx.budget_percentage > 0.3 or importance == SearchImportance.HIGH:
                paid = [(n, b) for n, b in available if b.cost_per_query > 0]
                if paid:
                    efficacy_scores = [
                        (n, self._provider_efficacy.get(n, 0.5))
                        for n, _ in paid
                    ]
                    best = max(efficacy_scores, key=lambda x: x[1])
                    return best[0], f"strategic_efficacy_{best[1]:.2f}"
            
            for name, b in available:
                if b.cost_per_query == 0:
                    return name, "budget_conscious_free"
        
        return available[0][0], "default_first_available"
    
    def record_usage(self, provider: str, success: bool = True):
        """Record that a search was executed."""
        if provider in self.budgets:
            self.budgets[provider].used_today += 1
            self._save_state()
            logger.debug(f"[SearchBudget] {provider}: {self.budgets[provider].used_today}/{self.budgets[provider].daily_limit}")
    
    def record_outcome(
        self,
        query: str,
        provider: str,
        importance: SearchImportance,
        success: bool,
        result_count: int,
        relevance_score: float,
        kernel_id: Optional[str] = None
    ):
        """Record search outcome for learning."""
        outcome = SearchOutcome(
            query=query,
            provider=provider,
            importance=importance.value,
            success=success,
            result_count=result_count,
            relevance_score=relevance_score,
            kernel_id=kernel_id,
        )
        
        self.outcomes.append(outcome)
        
        if len(self.outcomes) > 1000:
            self.outcomes = self.outcomes[-500:]
        
        self._update_efficacy(provider, relevance_score)

        # Persist to PostgreSQL search_outcomes table (for analytics and learning)
        cost_cents = self.budgets.get(provider, ProviderBudget(name=provider, daily_limit=0)).cost_per_query * 100
        _persist_search_outcome(
            query=query,
            provider=provider,
            success=success,
            result_count=result_count,
            relevance_score=relevance_score,
            kernel_id=kernel_id,
            cost_cents=cost_cents
        )

        if self.redis:
            try:
                key = f"search_outcomes:{date.today().isoformat()}"
                self.redis.rpush(key, json.dumps(outcome.to_dict()))
                self.redis.expire(key, 86400 * 7)
            except Exception as e:
                logger.error(f"[SearchBudget] Failed to save outcome: {e}")
    
    def _update_efficacy(self, provider: str, relevance: float):
        """Update provider efficacy with exponential moving average."""
        alpha = 0.1  # Learning rate
        current = self._provider_efficacy.get(provider, 0.5)
        self._provider_efficacy[provider] = current * (1 - alpha) + relevance * alpha
    
    def set_provider_enabled(self, provider: str, enabled: bool) -> bool:
        """
        Enable or disable a provider.
        
        Also syncs with GeometricProviderSelector for premium providers (tavily, perplexity)
        to ensure they are included/excluded from geometric provider selection.
        """
        if provider not in self.budgets:
            return False
        
        self.budgets[provider].enabled = enabled
        self._save_state()
        
        # Sync with GeometricProviderSelector for premium providers
        try:
            from search.provider_selector import get_provider_selector
            selector = get_provider_selector('regular')
            if provider in selector.PREMIUM_PROVIDERS:
                selector.enable_premium_provider(provider, enabled)
                logger.info(f"[SearchBudget] Synced {provider} enabled={enabled} with GeometricProviderSelector")
        except Exception as e:
            logger.warning(f"[SearchBudget] Failed to sync with provider selector: {e}")
        
        logger.info(f"[SearchBudget] {provider} enabled={enabled}")
        return True
    
    def set_daily_limit(self, provider: str, limit: int) -> bool:
        """Set daily limit for a provider."""
        if provider not in self.budgets:
            return False
        
        self.budgets[provider].daily_limit = limit
        self._save_state()
        logger.info(f"[SearchBudget] {provider} limit={limit}")
        return True
    
    def set_allow_overage(self, allow: bool):
        """Set whether to allow exceeding daily limits."""
        self.allow_overage = allow
        self._save_state()
        logger.info(f"[SearchBudget] allow_overage={allow}")
    
    def get_status(self) -> Dict[str, Any]:
        """Get full budget status."""
        ctx = self.get_budget_context()
        
        return {
            'date': ctx.date,
            'providers': ctx.providers,
            'total_remaining': ctx.total_budget_remaining,
            'total_used': ctx.total_budget_used,
            'budget_percentage': ctx.budget_percentage,
            'recommendation': ctx.recommendation,
            'allow_overage': ctx.allow_overage,
            'efficacy': self._provider_efficacy,
            'recent_outcomes': len(self.outcomes),
        }
    
    def get_learning_metrics(self) -> Dict[str, Any]:
        """Get metrics for kernel learning/evolution."""
        if not self.outcomes:
            return {'message': 'No outcomes recorded yet'}
        
        by_provider: Dict[str, List[SearchOutcome]] = {}
        for o in self.outcomes:
            by_provider.setdefault(o.provider, []).append(o)
        
        by_importance: Dict[int, List[SearchOutcome]] = {}
        for o in self.outcomes:
            by_importance.setdefault(o.importance, []).append(o)
        
        return {
            'provider_stats': {
                provider: {
                    'count': len(outcomes),
                    'avg_relevance': sum(o.relevance_score for o in outcomes) / len(outcomes),
                    'success_rate': sum(1 for o in outcomes if o.success) / len(outcomes),
                }
                for provider, outcomes in by_provider.items()
            },
            'importance_stats': {
                imp: {
                    'count': len(outcomes),
                    'avg_relevance': sum(o.relevance_score for o in outcomes) / len(outcomes),
                }
                for imp, outcomes in by_importance.items()
            },
            'efficacy_scores': self._provider_efficacy,
            'total_outcomes': len(self.outcomes),
        }
    
    def reset_daily(self):
        """Reset daily counters (called at midnight)."""
        for budget in self.budgets.values():
            budget.used_today = 0
        self._save_state()
        logger.info("[SearchBudget] Daily counters reset")


_orchestrator: Optional[SearchBudgetOrchestrator] = None


def get_budget_orchestrator(redis_client=None) -> SearchBudgetOrchestrator:
    """Get or create singleton budget orchestrator."""
    global _orchestrator
    if _orchestrator is None:
        _orchestrator = SearchBudgetOrchestrator(redis_client)
    return _orchestrator


def get_budget_context() -> BudgetContext:
    """Convenience function to get current budget context."""
    return get_budget_orchestrator().get_budget_context()
