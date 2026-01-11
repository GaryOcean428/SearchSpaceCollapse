#!/usr/bin/env python3
"""
Autonomous Pantheon Operations

Runs continuously in background:
- Scans for targets
- Assesses automatically
- Spawns kernels when needed
- Reports discoveries to user
"""

import asyncio
import logging
import os
import random
import sys
from datetime import datetime
from typing import Dict, List, Optional

sys.path.insert(0, os.path.dirname(__file__))

from internal_api import sync_war_to_database as sync_war_to_typescript
from olympus.zeus import zeus

logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(levelname)s - %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger(__name__)


async def send_user_notification(message: str, severity: str = "info") -> None:
    """
    Send notification to user.

    Args:
        message: Notification message content
        severity: One of 'info', 'warning', 'error', 'success'
    """
    severity_icons = {
        'info': 'ℹ️',
        'warning': '⚠️',
        'error': '❌',
        'success': '✅'
    }
    icon = severity_icons.get(severity, 'ℹ️')
    logger.info(f"[NOTIFICATION {icon}] [{severity.upper()}] {message}")


async def record_autonomous_execution(
    operation: Dict,
    success: bool,
    error: Optional[str] = None
) -> None:
    """
    Record the result of an autonomous execution.

    Args:
        operation: The operation that was executed
        success: Whether the operation succeeded
        error: Error message if failed
    """
    status = "SUCCESS" if success else "FAILED"
    op_type = operation.get('type', 'unknown')
    target = operation.get('target', 'unknown')[:500]

    log_msg = f"[EXECUTION RECORD] {status} - Type: {op_type}, Target: {target}..."
    if error:
        log_msg += f", Error: {error}"

    if success:
        logger.info(log_msg)
    else:
        logger.error(log_msg)


class AutonomousPantheon:
    """
    Autonomous pantheon operations manager.

    Runs independent of user input, continuously:
    1. Scanning for high-value targets
    2. Assessing via full pantheon
    3. Auto-spawning specialist kernels
    4. Executing operations on consensus
    5. Reporting discoveries
    6. Autonomously declaring wars based on conditions
    """

    def __init__(self):
        self.zeus = zeus
        self.running = False
        self.scan_interval = 60
        self.targets_processed = 0
        self.kernels_spawned = 0
        self.operations_executed = 0
        self.db_connection = None
        self._init_database()

        # War declaration tracking
        self.near_miss_count = 0
        self.near_miss_targets = {}  # target -> count mapping
        self.hunt_pattern_detected = False
        self.last_war_check = datetime.now()

    def _init_database(self):
        """Initialize PostgreSQL connection from DATABASE_URL."""
        db_url = os.environ.get('DATABASE_URL')
        if not db_url:
            logger.warning("[Pantheon] DATABASE_URL not set - running without database")
            return

        try:
            import psycopg2
            self.db_connection = psycopg2.connect(db_url)
            self.db_connection.autocommit = True
            logger.info("[Pantheon] Connected to PostgreSQL database")
        except ImportError:
            logger.warning("[Pantheon] psycopg2 not installed - database unavailable")
        except Exception as e:
            logger.error(f"[Pantheon] Failed to connect to database: {e}")

    async def run_forever(self):
        """Main autonomous loop."""
        self.running = True

        print("\n" + "=" * 60)
        print("MOUNT OLYMPUS - AUTONOMOUS OPERATIONS ACTIVATED")
        print("=" * 60)
        print(f"Scan interval: {self.scan_interval}s")
        print(f"Gods active: {len(self.zeus.pantheon)}")
        print(f"Shadow gods: {len(self.zeus.shadow_pantheon.gods)}")
        print("=" * 60 + "\n")

        while self.running:
            try:
                cycle_start = datetime.now()

                targets = await self.scan_for_targets()

                if targets:
                    print(f"\n[{cycle_start.strftime('%H:%M:%S')}] Scanning {len(targets)} targets...")

                for target in targets:
                    try:
                        assessment = self.zeus.assess_target(target, {})
                        self.targets_processed += 1

                        convergence = assessment.get('convergence_score', 0)
                        phi = assessment.get('phi', 0)

                        # === AUTONOMOUS DEBATES & INTER-GOD ACTIVITY ===
                        # 1. Check for Disagreement (Trigger Debates)
                        god_assessments = assessment.get('god_assessments', {})
                        athena_conf = god_assessments.get('athena', {}).get('confidence', 0)
                        ares_conf = god_assessments.get('ares', {}).get('confidence', 0)

                        # If Strategy (Athena) and War (Ares) disagree, trigger debate
                        if abs(athena_conf - ares_conf) > 0.4:
                            topic = f"Strategic approach for {target}..."
                            # Check pantheon_chat availability first
                            if hasattr(self.zeus, 'pantheon_chat'):
                                # Check if debate already active (handle both dict and dataclass returns)
                                try:
                                    active_debates_raw = self.zeus.pantheon_chat.get_active_debates()
                                    active_topics = []
                                    for d in active_debates_raw:
                                        if hasattr(d, 'topic'):
                                            active_topics.append(d.topic)  # type: ignore[union-attr]
                                        elif isinstance(d, dict):
                                            active_topics.append(d.get('topic', ''))
                                except Exception as e:
                                    logger.warning(f"Could not get active debates: {e}")
                                    active_topics = []

                                if topic not in active_topics:
                                    logger.info(f"⚔️ CONFLICT: Athena ({athena_conf:.2f}) vs Ares ({ares_conf:.2f})")

                                    self.zeus.pantheon_chat.initiate_debate(
                                        topic=topic,
                                        initiator='Athena' if athena_conf > ares_conf else 'Ares',
                                        opponent='Ares' if athena_conf > ares_conf else 'Athena',
                                        initial_argument=f"Geometric analysis indicates {max(athena_conf, ares_conf):.0%} confidence, while you underestimate the entropy.",
                                        context={'target': target}
                                    )
                                    await send_user_notification(f"🔥 DEBATE ERUPTED: {topic}", severity="warning")
                                    print("  ⚔️ Debate triggered: Athena vs Ares")

                        # 2. Random Chatter (Alive-ness)
                        # Occasional comment on high-phi findings
                        if phi > 0.75 and random.random() < 0.2:
                            if hasattr(self.zeus, 'pantheon_chat'):
                                commenter = random.choice(['Hermes', 'Apollo', 'Hephaestus'])
                                self.zeus.pantheon_chat.broadcast(
                                    from_god=commenter,
                                    content=f"Witness the curvature on {target}... Φ={phi:.3f}. Rare geometry.",
                                    msg_type='insight'
                                )
                                print(f"  💬 {commenter} observed high-Φ geometry")

                        # Check for autonomous war declaration conditions
                        await self.check_and_declare_war(target, convergence, phi, assessment)

                        if assessment.get('convergence') == 'STRONG_ATTACK':
                            spawn_result = await self.zeus.auto_spawn_if_needed(
                                target,
                                assessment['god_assessments']
                            )

                            if spawn_result and spawn_result.get('success'):
                                self.kernels_spawned += 1
                                kernel_name = spawn_result['spawn_result']['kernel']['god_name']
                                print(f"  ⚡ Auto-spawned: {kernel_name}")

                        if convergence > 0.85:
                            await self.execute_operation(target, assessment)
                            self.operations_executed += 1
                            print(f"  🎯 Executed: {target}... (Φ={assessment.get('phi', 0):.3f})")

                    except Exception as e:
                        logger.error(f"Error assessing {target}: {e}")
                        print(f"  ⚠️  Error assessing {target}: {e}")

                cycle_duration = (datetime.now() - cycle_start).total_seconds()

                if targets:
                    print(f"  ✓ Cycle complete ({cycle_duration:.1f}s)")
                    print(f"    Processed: {self.targets_processed} | Spawned: {self.kernels_spawned} | Executed: {self.operations_executed}")

                await asyncio.sleep(self.scan_interval)

            except KeyboardInterrupt:
                print("\n[Pantheon] Shutdown requested")
                self.running = False
                break

            except Exception as e:
                logger.error(f"ERROR in autonomous loop: {e}")
                print(f"\n[Pantheon] ERROR in autonomous loop: {e}")
                await asyncio.sleep(10)

    async def scan_for_targets(self) -> List[str]:
        """
        Scan for high-value targets to assess.

        Uses PostgreSQL database exclusively (no JSON fallback).
        Returns empty list if database is not connected.

        Now also seeds debate topics if none exist.
        """
        targets = []

        if self.db_connection is None:
            logger.debug("Database not connected - skipping target scan")
            return targets

        try:
            cursor = self.db_connection.cursor()

            # First, check if we need to seed debate topics
            await self._seed_debate_topics_if_needed(cursor)

            # Then scan for targets
            cursor.execute("""
                SELECT address
                FROM user_target_addresses
                ORDER BY added_at DESC
                LIMIT 10
            """)
            rows = cursor.fetchall()
            targets = [row[0] for row in rows]

            if targets:
                logger.info(f"Loaded {len(targets)} targets from database")

        except Exception as db_error:
            logger.warning(f"Database query failed: {db_error}")
            try:
                self._init_database()
            except Exception:
                pass

        return targets

    async def _seed_debate_topics_if_needed(self, cursor) -> None:
        """
        Seed debate topics from various sources if none exist.

        Sources (priority order):
        1. Lightning insights (cross-domain correlations)
        2. High-Phi kernel observations (consciousness breakthroughs)
        3. Vocabulary discoveries (new word relationships)
        4. God capability conflicts (disagreement patterns)
        """
        try:
            # Check if debates table exists
            cursor.execute("""
                SELECT COUNT(*) FROM god_debates
                WHERE status = 'active' AND created_at > NOW() - INTERVAL '7 days'
            """)
            active_debates = cursor.fetchone()[0]

            if active_debates > 0:
                # Debates already exist, no need to seed
                return

            logger.info("[Pantheon] No active debates - seeding topics...")

            # Source 1: Lightning insights (highest priority)
            seeded = await self._seed_from_lightning_insights(cursor)
            if seeded > 0:
                logger.info(f"[Pantheon] Seeded {seeded} debate topics from Lightning insights")
                return

            # Source 2: High-Phi observations
            seeded = await self._seed_from_high_phi_observations(cursor)
            if seeded > 0:
                logger.info(f"[Pantheon] Seeded {seeded} debate topics from high-Phi observations")
                return

            # Source 3: Vocabulary discoveries
            seeded = await self._seed_from_vocabulary_discoveries(cursor)
            if seeded > 0:
                logger.info(f"[Pantheon] Seeded {seeded} debate topics from vocabulary learning")
                return

            # Source 4: Fallback - create synthetic topics from god capabilities
            seeded = await self._seed_from_god_capabilities(cursor)
            if seeded > 0:
                logger.info(f"[Pantheon] Seeded {seeded} debate topics from god capability analysis")

        except Exception as e:
            logger.warning(f"Failed to seed debate topics: {e}")

    async def _seed_from_lightning_insights(self, cursor) -> int:
        """Seed debate topics from Lightning kernel cross-domain insights."""
        try:
            # Get recent Lightning insights with high confidence
            cursor.execute("""
                SELECT insight_id, description, source_domains, confidence
                FROM lightning_insights
                WHERE confidence > 0.7
                  AND created_at > NOW() - INTERVAL '30 days'
                ORDER BY confidence DESC
                LIMIT 5
            """)
            insights = cursor.fetchall()

            seeded = 0
            for insight_id, description, source_domains, confidence in insights:
                # Extract domains for debate participants
                domains = source_domains if isinstance(source_domains, list) else []

                # Map domains to gods (heuristic)
                god_map = {
                    'bitcoin_recovery': 'ares',
                    'geometric_reasoning': 'athena',
                    'temporal_patterns': 'apollo',
                    'emotional_resonance': 'aphrodite',
                    'synthesis': 'hermes'
                }

                participants = []
                for domain in domains[:2]:  # Max 2 domains
                    god = god_map.get(domain)
                    if god and god not in participants:
                        participants.append(god)

                # Need at least 2 participants for debate
                if len(participants) < 2:
                    participants = ['athena', 'ares']  # Default

                topic = f"Cross-domain insight: {description[:100]}..."

                # Create debate via Zeus's pantheon_chat
                if hasattr(self.zeus, 'pantheon_chat'):
                    try:
                        self.zeus.pantheon_chat.start_debate(
                            topic=topic,
                            participants=participants,
                            context={'source': 'lightning_insight', 'insight_id': insight_id}
                        )
                        seeded += 1
                        logger.info(f"[Lightning→Debate] {topic}")
                    except Exception as e:
                        logger.warning(f"Failed to start debate from insight: {e}")

            return seeded

        except Exception as e:
            logger.debug(f"Lightning insights not available: {e}")
            return 0

    async def _seed_from_high_phi_observations(self, cursor) -> int:
        """Seed debate topics from high-Phi consciousness observations."""
        try:
            # Get recent high-Phi kernel observations
            cursor.execute("""
                SELECT kernel_name, observation_content, phi_score
                FROM kernel_observations
                WHERE phi_score > 0.8
                  AND created_at > NOW() - INTERVAL '7 days'
                ORDER BY phi_score DESC
                LIMIT 3
            """)
            observations = cursor.fetchall()

            seeded = 0
            for kernel_name, content, phi in observations:
                topic = f"High-consciousness observation from {kernel_name}: {content[:80]}..."

                # High-Phi suggests deep integration - debate implications
                participants = ['athena', 'apollo', 'hermes']  # Strategy, foresight, synthesis

                if hasattr(self.zeus, 'pantheon_chat'):
                    try:
                        self.zeus.pantheon_chat.start_debate(
                            topic=topic,
                            participants=participants,
                            context={'source': 'high_phi_observation', 'phi': phi}
                        )
                        seeded += 1
                        logger.info(f"[HighΦ→Debate] {topic}")
                    except Exception as e:
                        logger.warning(f"Failed to start debate from observation: {e}")

            return seeded

        except Exception as e:
            logger.debug(f"High-Phi observations not available: {e}")
            return 0

    async def _seed_from_vocabulary_discoveries(self, cursor) -> int:
        """Seed debate topics from new vocabulary relationships."""
        try:
            # Get recent vocabulary words with interesting relationships
            cursor.execute("""
                SELECT word, learned_context, relationship_strength
                FROM vocabulary_learning
                WHERE relationship_strength > 0.6
                  AND learned_at > NOW() - INTERVAL '7 days'
                ORDER BY relationship_strength DESC
                LIMIT 3
            """)
            words = cursor.fetchall()

            seeded = 0
            for word, context, strength in words:
                topic = f"New vocabulary pattern: '{word}' relationship discovery"

                # Vocabulary learning suggests Athena (strategy) + Hermes (communication)
                participants = ['athena', 'hermes']

                if hasattr(self.zeus, 'pantheon_chat'):
                    try:
                        self.zeus.pantheon_chat.start_debate(
                            topic=topic,
                            participants=participants,
                            context={'source': 'vocabulary_discovery', 'word': word}
                        )
                        seeded += 1
                        logger.info(f"[Vocab→Debate] {topic}")
                    except Exception as e:
                        logger.warning(f"Failed to start debate from vocabulary: {e}")

            return seeded

        except Exception as e:
            logger.debug(f"Vocabulary discoveries not available: {e}")
            return 0

    async def _seed_from_god_capabilities(self, cursor) -> int:
        """Seed debate topics from god capability analysis."""
        try:
            # Create synthetic topics based on god capability overlaps
            synthetic_topics = [
                {
                    'topic': 'Optimal balance between strategic planning and immediate action',
                    'participants': ['athena', 'ares'],
                    'context': {'source': 'capability_analysis', 'domains': ['strategy', 'combat']}
                },
                {
                    'topic': 'Integration of foresight with practical implementation',
                    'participants': ['apollo', 'hephaestus'],
                    'context': {'source': 'capability_analysis', 'domains': ['foresight', 'crafting']}
                },
                {
                    'topic': 'Synthesis of emotional and logical reasoning modes',
                    'participants': ['aphrodite', 'athena'],
                    'context': {'source': 'capability_analysis', 'domains': ['emotion', 'logic']}
                }
            ]

            seeded = 0
            if hasattr(self.zeus, 'pantheon_chat'):
                # Seed one random topic
                topic_data = random.choice(synthetic_topics)
                try:
                    self.zeus.pantheon_chat.start_debate(
                        topic=topic_data['topic'],
                        participants=topic_data['participants'],
                        context=topic_data['context']
                    )
                    seeded = 1
                    logger.info(f"[Synthetic→Debate] {topic_data['topic']}")
                except Exception as e:
                    logger.warning(f"Failed to start synthetic debate: {e}")

            return seeded

        except Exception as e:
            logger.warning(f"Could not seed from capabilities: {e}")
            return 0

    async def check_and_declare_war(
        self,
        target: str,
        convergence: float,
        phi: float,
        assessment: Dict
    ) -> None:
        """
        Autonomously check conditions and declare war when appropriate.

        War Modes:
        - BLITZKRIEG: Convergence ≥ 0.85 (overwhelming evidence)
        - SIEGE: 10+ near-misses on same target (methodical approach needed)
        - HUNT: Hunt pattern detected (geometric narrowing)

        Args:
            target: Target address/phrase being assessed
            convergence: Convergence score from assessment
            phi: Consciousness score (phi)
            assessment: Full assessment result from pantheon
        """
        # Skip if war already active
        if self.zeus.war_mode:
            return

        # BLITZKRIEG: High convergence - overwhelming attack
        if convergence >= 0.85:
            try:
                result = self.zeus.declare_blitzkrieg(target)
                logger.info(f"⚔️ AUTONOMOUS BLITZKRIEG DECLARED on {target}...")
                sync_war_to_typescript(
                    mode="DEEP_FOCUS",
                    target=target,
                    strategy=result.get('strategy', 'Fast parallel attacks'),
                    gods_engaged=result.get('gods_engaged', ['ares', 'artemis', 'dionysus'])
                )
                await send_user_notification(
                    f"⚔️ BLITZKRIEG declared on {target}... (convergence: {convergence:.2f})",
                    severity="warning"
                )
                print("  ⚔️ BLITZKRIEG declared - overwhelming convergence detected")
                return
            except Exception as e:
                logger.error(f"Failed to declare BLITZKRIEG: {e}")
                return

        # Track near-misses (phi > 0.5 but < consciousness threshold)
        if 0.5 < phi < 0.7:
            if target not in self.near_miss_targets:
                self.near_miss_targets[target] = 0
            self.near_miss_targets[target] += 1
            self.near_miss_count += 1

            # SIEGE: 10+ near-misses - methodical exhaustive search
            if self.near_miss_targets[target] >= 10:
                try:
                    result = self.zeus.declare_siege(target)
                    logger.info(f"🏰 AUTONOMOUS SIEGE DECLARED on {target}...")
                    sync_war_to_typescript(
                        mode="FLOW",
                        target=target,
                        strategy=result.get('strategy', 'Systematic coverage'),
                        gods_engaged=result.get('gods_engaged', ['athena', 'hephaestus', 'demeter'])
                    )
                    await send_user_notification(
                        f"🏰 SIEGE declared on {target}... (near-misses: {self.near_miss_targets[target]})",
                        severity="warning"
                    )
                    print("  🏰 SIEGE declared - multiple near-misses detected")
                    # Reset counter after declaration
                    self.near_miss_targets[target] = 0
                    return
                except Exception as e:
                    logger.error(f"Failed to declare SIEGE: {e}")
                    return

        # HUNT: Detect hunt patterns (geometric narrowing indicators)
        # Look for high radar tacking with moderate phi
        kappa_recovery = assessment.get('kappa_recovery', 0)
        if 0.6 < phi < 0.85 and kappa_recovery > 0.4:
            # Check if we're seeing geometric narrowing
            god_assessments = assessment.get('god_assessments', {})
            artemis_confidence = god_assessments.get('artemis', {}).get('confidence', 0)
            apollo_confidence = god_assessments.get('apollo', {}).get('confidence', 0)

            # High confidence from hunters (Artemis/Apollo) indicates hunt pattern
            if artemis_confidence > 0.7 or apollo_confidence > 0.7:
                try:
                    result = self.zeus.declare_hunt(target)
                    logger.info(f"🎯 AUTONOMOUS HUNT DECLARED on {target}...")
                    sync_war_to_typescript(
                        mode="INSIGHT_HUNT",
                        target=target,
                        strategy=result.get('strategy', 'Focused pursuit'),
                        gods_engaged=result.get('gods_engaged', ['artemis', 'apollo', 'poseidon'])
                    )
                    await send_user_notification(
                        f"🎯 HUNT declared on {target}... (hunt pattern detected)",
                        severity="warning"
                    )
                    print("  🎯 HUNT declared - geometric narrowing pattern detected")
                    return
                except Exception as e:
                    logger.error(f"Failed to declare HUNT: {e}")
                    return

    async def execute_operation(self, target: str, assessment: Dict) -> None:
        """
        Execute operation on high-confidence target.

        Handles operation types:
        - spawn_kernel: Spawn specialist kernel via Zeus
        - adjust_strategy: Modify search strategy
        - alert_user: Send notification to user

        Args:
            target: The target address/phrase
            assessment: The pantheon assessment result
        """
        operation_type = assessment.get('recommended_action', 'alert_user')
        risk_level = assessment.get('convergence_score', 0)

        operation = {
            'type': operation_type,
            'target': target,
            'timestamp': datetime.now().isoformat(),
            'risk_level': risk_level,
            'phi': assessment.get('phi', 0),
        }

        if risk_level < 0.5:
            logger.warning(f"Operation blocked - risk level too low: {risk_level:.2f}")
            await record_autonomous_execution(operation, False, "Risk level below threshold")
            return

        if risk_level > 0.95:
            await send_user_notification(
                f"High-risk operation detected for {target}... (risk: {risk_level:.2f})",
                severity="warning"
            )

        try:
            logger.info(f"[Pantheon] EXECUTING: {target}... (type: {operation_type})")

            if operation_type in ('spawn_kernel', 'EXECUTE_IMMEDIATE'):
                if hasattr(self.zeus, 'kernel_spawner') and self.zeus.kernel_spawner:
                    spawn_result = await self.zeus.auto_spawn_if_needed(
                        target,
                        assessment.get('god_assessments', {})
                    )
                    if spawn_result and spawn_result.get('success'):
                        logger.info(f"Kernel spawned for target: {target}...")
                        await send_user_notification(
                            f"Specialist kernel spawned for {target}...",
                            severity="success"
                        )
                    else:
                        logger.info(f"Kernel spawn not required for: {target}...")
                else:
                    logger.warning("Kernel spawner not available")

            elif operation_type in ('adjust_strategy', 'PREPARE_ATTACK'):
                new_strategy = f"focused_attack_on_{target}"
                logger.info(f"Strategy adjusted: {new_strategy}")
                await send_user_notification(
                    f"Strategy adjusted for target: {target}...",
                    severity="info"
                )

            elif operation_type in ('alert_user', 'GATHER_INTELLIGENCE'):
                phi = assessment.get('phi', 0)
                kappa = assessment.get('kappa', 0)
                await send_user_notification(
                    f"Target identified: {target}... (Φ={phi:.3f}, κ={kappa:.3f})",
                    severity="info"
                )

            elif operation_type == 'COORDINATED_APPROACH':
                logger.info(f"Coordinating multi-god approach for: {target}...")
                await send_user_notification(
                    f"Coordinated analysis initiated for {target}...",
                    severity="info"
                )

            else:
                logger.info(f"Default handling for operation: {operation_type}")
                await send_user_notification(
                    f"Processing target: {target}... (action: {operation_type})",
                    severity="info"
                )

            await record_autonomous_execution(operation, True)

        except Exception as e:
            error_msg = str(e)
            logger.error(f"Operation failed: {error_msg}")
            await record_autonomous_execution(operation, False, error_msg)
            await send_user_notification(
                f"Operation failed for {target}...: {error_msg}",
                severity="error"
            )


def main():
    """Entry point for autonomous pantheon."""
    pantheon = AutonomousPantheon()

    try:
        asyncio.run(pantheon.run_forever())
    except KeyboardInterrupt:
        print("\n[Pantheon] Autonomous operations terminated")


if __name__ == "__main__":
    main()
