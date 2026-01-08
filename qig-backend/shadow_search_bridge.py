"""
Shadow Search Bridge - Integrates Shadow Pantheon into Search Loop
====================================================================

Connects the Shadow Pantheon's covert operations to the main search loop.
Enables reconnaissance, evidence collection, and adaptive strategy during search.

SHADOW SEARCH OPERATIONS:
- Nyx: OPSEC checks before high-value discoveries
- Hecate: False trail generation for near-misses
- Erebus: Counter-surveillance when patterns detected
- Hypnos: Silent observation during low-activity periods
- Thanatos: Evidence cleanup after failed investigations
- Nemesis: Relentless pursuit on high-confidence leads

This module provides HTTP endpoints that TypeScript can call during search
batch processing, plus Python-native integration for geometric search.
"""

from __future__ import annotations

import asyncio
import time
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
from flask import Blueprint, jsonify, request

# Physics constants
try:
    from qigkernels.physics_constants import KAPPA_STAR, KAPPA_3, BETA
except ImportError:
    KAPPA_STAR = 64.21
    KAPPA_3 = 41.09
    BETA = 0.44

BASIN_DIM = 64


class ShadowSearchPhase(Enum):
    """Phases of shadow operations during search."""
    RECONNAISSANCE = "reconnaissance"      # Pre-search intelligence gathering
    ACTIVE_SEARCH = "active_search"        # During batch processing
    HIGH_PHI_DETECTED = "high_phi_detected"  # When Φ > 0.7 found
    NEAR_MISS = "near_miss"                # Close but not match
    MATCH_FOUND = "match_found"            # Actual discovery
    CLEANUP = "cleanup"                    # Post-batch cleanup
    PURSUIT = "pursuit"                    # Following high-confidence lead


class ShadowSearchPriority(Enum):
    """Priority levels for shadow operations."""
    BACKGROUND = 1      # Passive observation
    NORMAL = 2          # Standard operations
    ELEVATED = 3        # High-Φ detected
    URGENT = 4          # Near-miss or match
    WAR = 5             # Full mobilization


@dataclass
class ShadowSearchContext:
    """Context passed to shadow operations during search."""
    session_id: str
    job_id: str
    phase: ShadowSearchPhase
    priority: ShadowSearchPriority = ShadowSearchPriority.NORMAL

    # Current search state
    current_phi: float = 0.5
    current_kappa: float = KAPPA_STAR
    tested_count: int = 0
    high_phi_count: int = 0

    # Geometric state
    basin_coords: Optional[np.ndarray] = None
    trajectory_length: int = 0

    # Recent findings
    last_high_phi_phrase: Optional[str] = None
    last_high_phi_score: float = 0.0
    near_miss_count: int = 0

    # Shadow operation results
    shadow_recommendations: Dict[str, Any] = field(default_factory=dict)
    opsec_cleared: bool = False
    false_trails_generated: int = 0
    surveillance_detected: bool = False


@dataclass
class ShadowSearchResult:
    """Result from shadow search operations."""
    success: bool
    phase: ShadowSearchPhase
    duration_ms: float

    # Per-god results
    nyx_result: Optional[Dict] = None
    hecate_result: Optional[Dict] = None
    erebus_result: Optional[Dict] = None
    hypnos_result: Optional[Dict] = None
    thanatos_result: Optional[Dict] = None
    nemesis_result: Optional[Dict] = None

    # Aggregated recommendations
    should_pause: bool = False
    should_change_strategy: bool = False
    pursuit_targets: List[str] = field(default_factory=list)
    cleanup_required: bool = False

    # Telemetry
    telemetry: Dict[str, Any] = field(default_factory=dict)


class ShadowSearchBridge:
    """
    Bridge between Search Coordinator and Shadow Pantheon.

    Provides lifecycle hooks for shadow operations during search:
    1. on_batch_start: Reconnaissance before batch
    2. on_phrase_scored: React to individual phrase scores
    3. on_high_phi_found: Mobilize on high-Φ detection
    4. on_near_miss: Generate false trails, prepare cleanup
    5. on_match_found: Full mobilization, evidence preservation
    6. on_batch_end: Cleanup, consolidation
    """

    def __init__(self, shadow_pantheon=None):
        """
        Initialize bridge.

        Args:
            shadow_pantheon: Reference to ShadowPantheon instance
        """
        self.shadow_pantheon = shadow_pantheon
        self.active_contexts: Dict[str, ShadowSearchContext] = {}
        self.operation_log: List[Dict] = []
        self._last_operation_time: Dict[str, float] = {}

        # Thresholds for triggering shadow ops
        self.high_phi_threshold = 0.7
        self.near_miss_threshold = 0.85
        self.opsec_check_interval = 100  # Every N phrases

        # κ-tacking for shadow operations
        self._current_kappa = KAPPA_STAR
        self._tacking_phase = "logic"

    def set_shadow_pantheon(self, pantheon):
        """Set reference to ShadowPantheon."""
        self.shadow_pantheon = pantheon

    # ========================================
    # LIFECYCLE HOOKS
    # ========================================

    def on_batch_start(
        self,
        job_id: str,
        batch_size: int,
        tested_so_far: int,
        session_id: Optional[str] = None,
    ) -> ShadowSearchResult:
        """
        Called before each batch is processed.
        Performs reconnaissance and OPSEC checks.
        """
        start_time = time.time()
        session_id = session_id or f"shadow-{job_id}"

        # Create or update context
        ctx = self._get_or_create_context(job_id, session_id)
        ctx.phase = ShadowSearchPhase.RECONNAISSANCE
        ctx.tested_count = tested_so_far

        result = ShadowSearchResult(
            success=True,
            phase=ShadowSearchPhase.RECONNAISSANCE,
            duration_ms=0,
        )

        # Run OPSEC check periodically
        should_check_opsec = (
            tested_so_far % self.opsec_check_interval == 0 or
            ctx.priority >= ShadowSearchPriority.ELEVATED
        )

        if should_check_opsec and self.shadow_pantheon:
            try:
                # Use Nyx for OPSEC
                nyx_result = asyncio.run(
                    self.shadow_pantheon.nyx.check_operational_security(
                        session_id=session_id,
                        operation_type="search_batch",
                    )
                )
                result.nyx_result = nyx_result
                ctx.opsec_cleared = nyx_result.get("safe", True)

                if not ctx.opsec_cleared:
                    result.should_pause = True

            except Exception as e:
                print(f"[ShadowSearchBridge] Nyx OPSEC check failed: {e}")
                result.nyx_result = {"error": str(e)}

        # Use Erebus for counter-surveillance on high-priority
        if ctx.priority >= ShadowSearchPriority.ELEVATED and self.shadow_pantheon:
            try:
                erebus_result = asyncio.run(
                    self.shadow_pantheon.erebus.scan_for_watchers(
                        context={"job_id": job_id, "tested": tested_so_far}
                    )
                )
                result.erebus_result = erebus_result
                ctx.surveillance_detected = erebus_result.get("watchers_detected", False)

                if ctx.surveillance_detected:
                    ctx.priority = ShadowSearchPriority.WAR
                    result.should_change_strategy = True

            except Exception as e:
                result.erebus_result = {"error": str(e)}

        result.duration_ms = (time.time() - start_time) * 1000
        self._log_operation("batch_start", job_id, result)
        return result

    def on_phrase_scored(
        self,
        job_id: str,
        phrase: str,
        phi: float,
        kappa: float,
        basin_coords: Optional[np.ndarray] = None,
    ) -> Optional[ShadowSearchResult]:
        """
        Called after each phrase is scored.
        Lightweight check for significant events.
        """
        ctx = self.active_contexts.get(job_id)
        if not ctx:
            return None

        # Update context state
        ctx.current_phi = phi
        ctx.current_kappa = kappa
        if basin_coords is not None:
            ctx.basin_coords = basin_coords

        # Only trigger full operations on significant events
        if phi >= self.high_phi_threshold:
            return self.on_high_phi_found(job_id, phrase, phi, kappa, basin_coords)

        return None

    def on_high_phi_found(
        self,
        job_id: str,
        phrase: str,
        phi: float,
        kappa: float,
        basin_coords: Optional[np.ndarray] = None,
    ) -> ShadowSearchResult:
        """
        Called when high-Φ phrase detected (Φ > 0.7).
        Elevates priority and mobilizes shadows.
        """
        start_time = time.time()
        ctx = self._get_or_create_context(job_id, f"shadow-{job_id}")
        ctx.phase = ShadowSearchPhase.HIGH_PHI_DETECTED
        ctx.priority = ShadowSearchPriority.ELEVATED
        ctx.last_high_phi_phrase = phrase
        ctx.last_high_phi_score = phi
        ctx.high_phi_count += 1

        result = ShadowSearchResult(
            success=True,
            phase=ShadowSearchPhase.HIGH_PHI_DETECTED,
            duration_ms=0,
        )

        # Switch to "feeling" mode for intuitive exploration
        self._tacking_phase = "feeling"
        self._current_kappa = KAPPA_3

        if self.shadow_pantheon:
            try:
                # Nyx: ensure operation covered
                nyx_result = asyncio.run(
                    self.shadow_pantheon.nyx.initiate_operation(
                        target=f"high_phi_{phi:.3f}",
                        operation_type="investigation",
                    )
                )
                result.nyx_result = nyx_result

                # Hypnos: silent observation mode
                hypnos_result = asyncio.run(
                    self.shadow_pantheon.hypnos.enter_passive_mode(
                        context={"phrase_prefix": phrase[:500], "phi": phi}
                    )
                )
                result.hypnos_result = hypnos_result

            except Exception as e:
                print(f"[ShadowSearchBridge] High-Φ ops failed: {e}")

        result.telemetry = {
            "phi": phi,
            "kappa": kappa,
            "high_phi_count": ctx.high_phi_count,
            "tacking_mode": self._tacking_phase,
        }

        result.duration_ms = (time.time() - start_time) * 1000
        self._log_operation("high_phi_found", job_id, result)
        return result

    def on_near_miss(
        self,
        job_id: str,
        phrase: str,
        phi: float,
        confidence: float,
        reason: str = "geometric_proximity",
    ) -> ShadowSearchResult:
        """
        Called when phrase is close but not a match.
        Generates false trails, prepares pursuit.
        """
        start_time = time.time()
        ctx = self._get_or_create_context(job_id, f"shadow-{job_id}")
        ctx.phase = ShadowSearchPhase.NEAR_MISS
        ctx.priority = ShadowSearchPriority.URGENT
        ctx.near_miss_count += 1

        result = ShadowSearchResult(
            success=True,
            phase=ShadowSearchPhase.NEAR_MISS,
            duration_ms=0,
        )

        if self.shadow_pantheon:
            try:
                # Hecate: generate false trails
                hecate_result = asyncio.run(
                    self.shadow_pantheon.hecate.generate_false_trails(
                        real_target=phrase[:10],  # Truncate for security
                        count=3,
                    )
                )
                result.hecate_result = hecate_result
                ctx.false_trails_generated += hecate_result.get("trails_created", 0)

                # Nemesis: prepare pursuit
                nemesis_result = asyncio.run(
                    self.shadow_pantheon.nemesis.prepare_pursuit(
                        target_pattern=phrase,
                        confidence=confidence,
                    )
                )
                result.nemesis_result = nemesis_result
                result.pursuit_targets = nemesis_result.get("pursuit_paths", [])

            except Exception as e:
                print(f"[ShadowSearchBridge] Near-miss ops failed: {e}")

        result.telemetry = {
            "phi": phi,
            "confidence": confidence,
            "reason": reason,
            "near_miss_total": ctx.near_miss_count,
        }

        result.duration_ms = (time.time() - start_time) * 1000
        self._log_operation("near_miss", job_id, result)
        return result

    def on_match_found(
        self,
        job_id: str,
        phrase: str,
        phi: float,
        evidence: Dict[str, Any],
    ) -> ShadowSearchResult:
        """
        Called when actual match found.
        Full shadow mobilization for evidence preservation.
        """
        start_time = time.time()
        ctx = self._get_or_create_context(job_id, f"shadow-{job_id}")
        ctx.phase = ShadowSearchPhase.MATCH_FOUND
        ctx.priority = ShadowSearchPriority.WAR

        result = ShadowSearchResult(
            success=True,
            phase=ShadowSearchPhase.MATCH_FOUND,
            duration_ms=0,
        )

        if self.shadow_pantheon:
            try:
                # Declare war mode
                self.shadow_pantheon.declare_war(f"match_found_{job_id}")

                # Nyx: maximum cover
                nyx_result = asyncio.run(
                    self.shadow_pantheon.nyx.initiate_operation(
                        target="match_evidence",
                        operation_type="extraction",
                    )
                )
                result.nyx_result = nyx_result

                # Hypnos: record everything silently
                hypnos_result = asyncio.run(
                    self.shadow_pantheon.hypnos.record_discovery(
                        evidence=evidence,
                    )
                )
                result.hypnos_result = hypnos_result

                # End war mode
                self.shadow_pantheon.end_war()

            except Exception as e:
                print(f"[ShadowSearchBridge] Match found ops failed: {e}")

        result.telemetry = {
            "phi": phi,
            "match_job_id": job_id,
        }

        result.duration_ms = (time.time() - start_time) * 1000
        self._log_operation("match_found", job_id, result)
        return result

    def on_batch_end(
        self,
        job_id: str,
        batch_results: Dict[str, Any],
    ) -> ShadowSearchResult:
        """
        Called after batch processing completes.
        Cleanup and consolidation.
        """
        start_time = time.time()
        ctx = self.active_contexts.get(job_id)
        if not ctx:
            return ShadowSearchResult(
                success=False,
                phase=ShadowSearchPhase.CLEANUP,
                duration_ms=0,
            )

        ctx.phase = ShadowSearchPhase.CLEANUP
        result = ShadowSearchResult(
            success=True,
            phase=ShadowSearchPhase.CLEANUP,
            duration_ms=0,
        )

        # Switch back to logic mode after batch
        self._tacking_phase = "logic"
        self._current_kappa = KAPPA_STAR

        high_phi_in_batch = batch_results.get("high_phi_count", 0)
        matches_in_batch = batch_results.get("matches", 0)

        if self.shadow_pantheon:
            try:
                # Thanatos: cleanup if no matches
                if matches_in_batch == 0 and high_phi_in_batch > 0:
                    thanatos_result = asyncio.run(
                        self.shadow_pantheon.thanatos.cleanup_investigation(
                            investigation_id=job_id,
                            preserve_learnings=True,
                        )
                    )
                    result.thanatos_result = thanatos_result
                    result.cleanup_required = True

            except Exception as e:
                print(f"[ShadowSearchBridge] Cleanup ops failed: {e}")

        # Downgrade priority if no significant findings
        if high_phi_in_batch == 0:
            ctx.priority = ShadowSearchPriority.BACKGROUND

        result.telemetry = {
            "high_phi_in_batch": high_phi_in_batch,
            "matches_in_batch": matches_in_batch,
            "total_tested": ctx.tested_count,
            "priority": ctx.priority.value,
            "tacking_mode": self._tacking_phase,
        }

        result.duration_ms = (time.time() - start_time) * 1000
        self._log_operation("batch_end", job_id, result)
        return result

    # ========================================
    # UTILITY METHODS
    # ========================================

    def _get_or_create_context(
        self,
        job_id: str,
        session_id: str,
    ) -> ShadowSearchContext:
        """Get existing context or create new one."""
        if job_id not in self.active_contexts:
            self.active_contexts[job_id] = ShadowSearchContext(
                session_id=session_id,
                job_id=job_id,
                phase=ShadowSearchPhase.RECONNAISSANCE,
            )
        return self.active_contexts[job_id]

    def _log_operation(
        self,
        operation_type: str,
        job_id: str,
        result: ShadowSearchResult,
    ) -> None:
        """Log operation for audit trail."""
        self.operation_log.append({
            "timestamp": datetime.now().isoformat(),
            "operation": operation_type,
            "job_id": job_id,
            "phase": result.phase.value,
            "duration_ms": result.duration_ms,
            "success": result.success,
        })

        # Keep only last 1000 operations
        if len(self.operation_log) > 1000:
            self.operation_log = self.operation_log[-1000:]

    def get_status(self, job_id: Optional[str] = None) -> Dict[str, Any]:
        """Get bridge status."""
        if job_id:
            ctx = self.active_contexts.get(job_id)
            if not ctx:
                return {"error": f"No context for job {job_id}"}
            return {
                "job_id": job_id,
                "session_id": ctx.session_id,
                "phase": ctx.phase.value,
                "priority": ctx.priority.value,
                "phi": ctx.current_phi,
                "kappa": ctx.current_kappa,
                "tested": ctx.tested_count,
                "high_phi_count": ctx.high_phi_count,
                "near_miss_count": ctx.near_miss_count,
                "opsec_cleared": ctx.opsec_cleared,
                "surveillance_detected": ctx.surveillance_detected,
            }

        return {
            "active_jobs": list(self.active_contexts.keys()),
            "operation_count": len(self.operation_log),
            "current_kappa": self._current_kappa,
            "tacking_phase": self._tacking_phase,
            "has_shadow_pantheon": self.shadow_pantheon is not None,
        }

    def clear_context(self, job_id: str) -> bool:
        """Clear context for completed job."""
        if job_id in self.active_contexts:
            del self.active_contexts[job_id]
            return True
        return False


# ========================================
# SINGLETON AND FLASK BLUEPRINT
# ========================================

_shadow_search_bridge: Optional[ShadowSearchBridge] = None


def get_shadow_search_bridge() -> ShadowSearchBridge:
    """Get singleton shadow search bridge."""
    global _shadow_search_bridge
    if _shadow_search_bridge is None:
        _shadow_search_bridge = ShadowSearchBridge()
    return _shadow_search_bridge


def set_shadow_pantheon(pantheon) -> None:
    """Set shadow pantheon reference on bridge."""
    bridge = get_shadow_search_bridge()
    bridge.set_shadow_pantheon(pantheon)


def create_shadow_search_blueprint() -> Blueprint:
    """Create Flask blueprint for shadow search operations."""
    bp = Blueprint("shadow_search", __name__, url_prefix="/api/shadow/search")

    @bp.route("/status", methods=["GET"])
    def get_status():
        """Get bridge status."""
        job_id = request.args.get("job_id")
        bridge = get_shadow_search_bridge()
        return jsonify(bridge.get_status(job_id))

    @bp.route("/batch/start", methods=["POST"])
    def batch_start():
        """Hook for batch start."""
        data = request.get_json() or {}
        job_id = data.get("job_id", "")
        batch_size = data.get("batch_size", 10)
        tested_so_far = data.get("tested_so_far", 0)
        session_id = data.get("session_id")

        if not job_id:
            return jsonify({"error": "job_id required"}), 400

        bridge = get_shadow_search_bridge()
        result = bridge.on_batch_start(job_id, batch_size, tested_so_far, session_id)

        return jsonify({
            "success": result.success,
            "phase": result.phase.value,
            "duration_ms": result.duration_ms,
            "should_pause": result.should_pause,
            "should_change_strategy": result.should_change_strategy,
            "telemetry": result.telemetry,
        })

    @bp.route("/phrase/scored", methods=["POST"])
    def phrase_scored():
        """Hook for phrase scored (lightweight)."""
        data = request.get_json() or {}
        job_id = data.get("job_id", "")
        phrase = data.get("phrase", "")
        phi = data.get("phi", 0.5)
        kappa = data.get("kappa", KAPPA_STAR)

        if not job_id:
            return jsonify({"error": "job_id required"}), 400

        bridge = get_shadow_search_bridge()
        result = bridge.on_phrase_scored(job_id, phrase, phi, kappa)

        if result is None:
            return jsonify({"triggered": False})

        return jsonify({
            "triggered": True,
            "phase": result.phase.value,
            "telemetry": result.telemetry,
        })

    @bp.route("/high-phi", methods=["POST"])
    def high_phi_found():
        """Hook for high-Φ detection."""
        data = request.get_json() or {}
        job_id = data.get("job_id", "")
        phrase = data.get("phrase", "")
        phi = data.get("phi", 0.7)
        kappa = data.get("kappa", KAPPA_STAR)

        if not job_id or not phrase:
            return jsonify({"error": "job_id and phrase required"}), 400

        bridge = get_shadow_search_bridge()
        result = bridge.on_high_phi_found(job_id, phrase, phi, kappa)

        return jsonify({
            "success": result.success,
            "phase": result.phase.value,
            "duration_ms": result.duration_ms,
            "telemetry": result.telemetry,
        })

    @bp.route("/near-miss", methods=["POST"])
    def near_miss():
        """Hook for near-miss detection."""
        data = request.get_json() or {}
        job_id = data.get("job_id", "")
        phrase = data.get("phrase", "")
        phi = data.get("phi", 0.8)
        confidence = data.get("confidence", 0.85)
        reason = data.get("reason", "geometric_proximity")

        if not job_id:
            return jsonify({"error": "job_id required"}), 400

        bridge = get_shadow_search_bridge()
        result = bridge.on_near_miss(job_id, phrase, phi, confidence, reason)

        return jsonify({
            "success": result.success,
            "phase": result.phase.value,
            "duration_ms": result.duration_ms,
            "pursuit_targets": result.pursuit_targets,
            "telemetry": result.telemetry,
        })

    @bp.route("/match-found", methods=["POST"])
    def match_found():
        """Hook for match found."""
        data = request.get_json() or {}
        job_id = data.get("job_id", "")
        phrase = data.get("phrase", "")
        phi = data.get("phi", 1.0)
        evidence = data.get("evidence", {})

        if not job_id:
            return jsonify({"error": "job_id required"}), 400

        bridge = get_shadow_search_bridge()
        result = bridge.on_match_found(job_id, phrase, phi, evidence)

        return jsonify({
            "success": result.success,
            "phase": result.phase.value,
            "duration_ms": result.duration_ms,
            "telemetry": result.telemetry,
        })

    @bp.route("/batch/end", methods=["POST"])
    def batch_end():
        """Hook for batch end."""
        data = request.get_json() or {}
        job_id = data.get("job_id", "")
        batch_results = data.get("results", {})

        if not job_id:
            return jsonify({"error": "job_id required"}), 400

        bridge = get_shadow_search_bridge()
        result = bridge.on_batch_end(job_id, batch_results)

        return jsonify({
            "success": result.success,
            "phase": result.phase.value,
            "duration_ms": result.duration_ms,
            "cleanup_required": result.cleanup_required,
            "telemetry": result.telemetry,
        })

    @bp.route("/clear", methods=["POST"])
    def clear_context():
        """Clear context for completed job."""
        data = request.get_json() or {}
        job_id = data.get("job_id", "")

        if not job_id:
            return jsonify({"error": "job_id required"}), 400

        bridge = get_shadow_search_bridge()
        cleared = bridge.clear_context(job_id)

        return jsonify({"cleared": cleared})

    return bp
