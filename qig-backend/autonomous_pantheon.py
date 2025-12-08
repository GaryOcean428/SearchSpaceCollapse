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
import json
import logging
import os
import random
from datetime import datetime
from typing import List, Dict, Optional

import sys
sys.path.insert(0, os.path.dirname(__file__))

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
    target = operation.get('target', 'unknown')[:40]
    
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
        self.data_dir = os.path.join(os.path.dirname(__file__), '..', 'data')
        
        # War declaration tracking
        self.near_miss_count = 0
        self.near_miss_targets = {}  # target -> count mapping
        self.hunt_pattern_detected = False
        self.last_war_check = datetime.now()
    
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
                            topic = f"Strategic approach for {target[:15]}..."
                            # Check pantheon_chat availability first
                            if hasattr(self.zeus, 'pantheon_chat'):
                                # Check if debate already active (handle both dict and dataclass returns)
                                try:
                                    active_debates_raw = self.zeus.pantheon_chat.get_active_debates()
                                    active_topics = []
                                    for d in active_debates_raw:
                                        if hasattr(d, 'topic'):
                                            active_topics.append(d.topic)
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
                                    print(f"  ⚔️ Debate triggered: Athena vs Ares")
                        
                        # 2. Random Chatter (Alive-ness)
                        # Occasional comment on high-phi findings
                        if phi > 0.75 and random.random() < 0.2:
                            if hasattr(self.zeus, 'pantheon_chat'):
                                commenter = random.choice(['Hermes', 'Apollo', 'Hephaestus'])
                                self.zeus.pantheon_chat.broadcast(
                                    from_god=commenter,
                                    content=f"Witness the curvature on {target[:8]}... Φ={phi:.3f}. Rare geometry.",
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
                            print(f"  🎯 Executed: {target[:40]}... (Φ={assessment.get('phi', 0):.3f})")
                        
                    except Exception as e:
                        logger.error(f"Error assessing {target[:30]}: {e}")
                        print(f"  ⚠️  Error assessing {target[:30]}: {e}")
                
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
        
        Checks:
        1. Database for user_target_addresses (if connected)
        2. Local target-addresses.json file
        3. Returns empty list if no sources available
        """
        targets = []
        
        try:
            if self.db_connection is not None:
                try:
                    cursor = self.db_connection.cursor()
                    cursor.execute("""
                        SELECT address, priority 
                        FROM user_target_addresses 
                        WHERE priority = 'high' 
                        ORDER BY created_at DESC 
                        LIMIT 10
                    """)
                    rows = cursor.fetchall()
                    targets.extend([row[0] for row in rows])
                    logger.info(f"Loaded {len(rows)} high-priority targets from database")
                except Exception as db_error:
                    logger.warning(f"Database query failed: {db_error}")
            
            if not targets:
                target_file = os.path.join(self.data_dir, 'target-addresses.json')
                if os.path.exists(target_file):
                    try:
                        with open(target_file, 'r') as f:
                            target_data = json.load(f)
                        
                        for item in target_data[:5]:
                            address = item.get('address')
                            if address:
                                targets.append(address)
                        
                        if targets:
                            logger.info(f"Loaded {len(targets)} targets from local file")
                    except json.JSONDecodeError as je:
                        logger.error(f"Failed to parse target-addresses.json: {je}")
                    except Exception as fe:
                        logger.error(f"Failed to read target file: {fe}")
            
        except Exception as e:
            logger.error(f"Error scanning for targets: {e}")
            return []
        
        return targets
    
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
                logger.info(f"⚔️ AUTONOMOUS BLITZKRIEG DECLARED on {target[:40]}...")
                await send_user_notification(
                    f"⚔️ BLITZKRIEG declared on {target[:40]}... (convergence: {convergence:.2f})",
                    severity="warning"
                )
                print(f"  ⚔️ BLITZKRIEG declared - overwhelming convergence detected")
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
                    logger.info(f"🏰 AUTONOMOUS SIEGE DECLARED on {target[:40]}...")
                    await send_user_notification(
                        f"🏰 SIEGE declared on {target[:40]}... (near-misses: {self.near_miss_targets[target]})",
                        severity="warning"
                    )
                    print(f"  🏰 SIEGE declared - multiple near-misses detected")
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
                    logger.info(f"🎯 AUTONOMOUS HUNT DECLARED on {target[:40]}...")
                    await send_user_notification(
                        f"🎯 HUNT declared on {target[:40]}... (hunt pattern detected)",
                        severity="warning"
                    )
                    print(f"  🎯 HUNT declared - geometric narrowing pattern detected")
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
                f"High-risk operation detected for {target[:30]}... (risk: {risk_level:.2f})",
                severity="warning"
            )
        
        try:
            logger.info(f"[Pantheon] EXECUTING: {target[:50]}... (type: {operation_type})")
            
            if operation_type in ('spawn_kernel', 'EXECUTE_IMMEDIATE'):
                if hasattr(self.zeus, 'kernel_spawner') and self.zeus.kernel_spawner:
                    spawn_result = await self.zeus.auto_spawn_if_needed(
                        target,
                        assessment.get('god_assessments', {})
                    )
                    if spawn_result and spawn_result.get('success'):
                        logger.info(f"Kernel spawned for target: {target[:40]}...")
                        await send_user_notification(
                            f"Specialist kernel spawned for {target[:30]}...",
                            severity="success"
                        )
                    else:
                        logger.info(f"Kernel spawn not required for: {target[:40]}...")
                else:
                    logger.warning("Kernel spawner not available")
                
            elif operation_type in ('adjust_strategy', 'PREPARE_ATTACK'):
                new_strategy = f"focused_attack_on_{target[:20]}"
                logger.info(f"Strategy adjusted: {new_strategy}")
                await send_user_notification(
                    f"Strategy adjusted for target: {target[:30]}...",
                    severity="info"
                )
                
            elif operation_type in ('alert_user', 'GATHER_INTELLIGENCE'):
                phi = assessment.get('phi', 0)
                kappa = assessment.get('kappa', 0)
                await send_user_notification(
                    f"Target identified: {target[:30]}... (Φ={phi:.3f}, κ={kappa:.3f})",
                    severity="info"
                )
                
            elif operation_type == 'COORDINATED_APPROACH':
                logger.info(f"Coordinating multi-god approach for: {target[:40]}...")
                await send_user_notification(
                    f"Coordinated analysis initiated for {target[:30]}...",
                    severity="info"
                )
                
            else:
                logger.info(f"Default handling for operation: {operation_type}")
                await send_user_notification(
                    f"Processing target: {target[:30]}... (action: {operation_type})",
                    severity="info"
                )
            
            await record_autonomous_execution(operation, True)
            
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Operation failed: {error_msg}")
            await record_autonomous_execution(operation, False, error_msg)
            await send_user_notification(
                f"Operation failed for {target[:30]}...: {error_msg}",
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
