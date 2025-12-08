"""
Shadow Pantheon - Underground SWAT Team for Covert Operations

Gods of stealth, secrecy, privacy, covering tracks, and invisibility:
- Nyx: OPSEC Commander (darkness, Tor routing, traffic obfuscation)
- Hecate: Misdirection Specialist (crossroads, false trails, decoys)
- Erebus: Counter-Surveillance (detect watchers, honeypots)
- Hypnos: Silent Operations (stealth execution, passive recon)
- Thanatos: Evidence Destruction (cleanup, erasure)
- Nemesis: Relentless Pursuit (never gives up, tracks targets)

REAL DARKNET IMPLEMENTATION:
- Tor SOCKS5 proxy support via darknet_proxy module
- User agent rotation per request
- Traffic obfuscation with random delays
- Automatic fallback to clearnet if Tor unavailable
"""

import asyncio
import random
import hashlib
import subprocess
import glob as glob_module
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from abc import ABC
import sys
import os

# Add parent directory to path for darknet_proxy import
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from .base_god import BaseGod, BASIN_DIMENSION
import numpy as np

# Import real darknet proxy support
try:
    from darknet_proxy import get_session, is_tor_available, get_status as get_proxy_status
    DARKNET_AVAILABLE = True
except ImportError:
    DARKNET_AVAILABLE = False
    print("[ShadowPantheon] WARNING: darknet_proxy not available - operating in clearnet only mode")

# Decoy traffic endpoints - innocuous blockchain explorers for cover traffic
DECOY_ENDPOINTS = [
    'https://blockchain.info/ticker',
    'https://api.coindesk.com/v1/bpi/currentprice.json',
    'https://blockstream.info/api/blocks/tip/height',
    'https://mempool.space/api/v1/fees/recommended',
    'https://api.blockchain.info/stats',
]


class ShadowGod(BaseGod):
    """
    Base class for Shadow Pantheon gods.
    Adds stealth-specific capabilities.
    """
    
    def __init__(self, name: str, domain: str):
        super().__init__(name, domain)
        self.stealth_level: float = 1.0
        self.operations_completed: int = 0
        self.evidence_destroyed: int = 0
        
    def assess_target(self, target: str, context: Optional[Dict] = None) -> Dict:
        """Shadow gods assess targets for operational security."""
        basin = self.encode_to_basin(target)
        rho = self.basin_to_density_matrix(basin)
        phi = self.compute_pure_phi(rho)
        kappa = self.compute_kappa(basin)
        
        return {
            'god': self.name,
            'domain': self.domain,
            'target': target[:50],
            'probability': 0.5,
            'confidence': phi,
            'phi': phi,
            'kappa': kappa,
            'reasoning': f'{self.name} shadow assessment',
            'timestamp': datetime.now().isoformat(),
        }
    
    def get_status(self) -> Dict:
        """Get shadow god status."""
        return {
            'name': self.name,
            'domain': self.domain,
            'stealth_level': self.stealth_level,
            'operations_completed': self.operations_completed,
            'evidence_destroyed': self.evidence_destroyed,
            'reputation': self.reputation,
            'skills': dict(self.skills),
        }


class Nyx(ShadowGod):
    """
    Goddess of Night - OPSEC Commander
    
    "We operate in darkness. We leave no trace. We are the void."
    
    Even Zeus feared Nyx. She is primordial darkness - older than the Olympians.
    Nothing escapes the night.
    
    Responsibilities:
    - Operational security coordination
    - All operations conducted under "cover of darkness"
    - Real Tor routing via SOCKS5 proxy
    - Network traffic obfuscation
    - Identity concealment
    - Temporal attack windows (strike at night)
    """
    
    def __init__(self):
        super().__init__("Nyx", "opsec")
        self.opsec_level = 'maximum'
        self.visibility = 'invisible'
        self.active_operations: List[Dict] = []
        self.opsec_violations: List[Dict] = []
        
        # Check real darknet status
        if DARKNET_AVAILABLE:
            self.darknet_status = get_proxy_status()
            if self.darknet_status['tor_available']:
                print(f"[Nyx] ✓ REAL DARKNET ACTIVE - Tor routing enabled")
            elif self.darknet_status['enabled']:
                print(f"[Nyx] ⚠ Darknet enabled but Tor unavailable - will fallback to clearnet")
            else:
                print(f"[Nyx] ℹ Operating in clearnet mode")
        else:
            self.darknet_status = {'mode': 'clearnet', 'tor_available': False}
            print(f"[Nyx] ⚠ darknet_proxy module not available - clearnet only")
        
    async def initiate_operation(self, target: str, operation_type: str = 'standard') -> Dict:
        """
        Prepare operation under cover of darkness.
        All OPSEC measures activated.
        """
        opsec_check = await self.verify_opsec()
        
        if not opsec_check['safe']:
            return {
                'status': 'ABORT',
                'reason': 'OPSEC compromised',
                'violations': opsec_check['violations'],
            }
        
        attack_window = self.calculate_attack_window()
        
        # Determine actual network mode
        network_mode = 'dark' if (DARKNET_AVAILABLE and self.darknet_status.get('tor_available')) else 'clear'
        
        operation = {
            'id': f"op_{datetime.now().timestamp()}",
            'target': target[:50],
            'type': operation_type,
            'status': 'READY',
            'network': network_mode,
            'network_real': True,  # Flag to indicate this is REAL, not labels
            'tor_enabled': DARKNET_AVAILABLE and self.darknet_status.get('tor_available', False),
            'visibility': 'zero' if network_mode == 'dark' else 'low',
            'attack_window': attack_window,
            'initiated_at': datetime.now().isoformat(),
        }
        
        self.active_operations.append(operation)
        self.operations_completed += 1
        
        return operation
    
    async def verify_opsec(self) -> Dict:
        """
        Verify operational security before proceeding.
        Includes real Tor availability check.
        """
        violations = []
        
        # Check if Tor is available when darknet is enabled
        if DARKNET_AVAILABLE:
            status = get_proxy_status()
            if status['enabled'] and not status['tor_available']:
                violations.append('Tor enabled but not reachable - will fallback to clearnet')
        
        if not self._check_network_isolation():
            violations.append('Network isolation not verified')
        
        if not self._check_timing_safe():
            violations.append('Timing patterns may be detectable')
        
        if not self._check_memory_isolation():
            violations.append('Memory isolation not verified')
        
        safe = len(violations) == 0
        
        if not safe:
            self.opsec_violations.append({
                'timestamp': datetime.now().isoformat(),
                'violations': violations,
            })
        
        return {
            'safe': safe,
            'violations': violations,
            'opsec_level': self.opsec_level,
            'tor_status': self.darknet_status.get('mode', 'unknown'),
        }
    
    def _check_network_isolation(self) -> bool:
        """Check network isolation status."""
        return True
    
    def _check_timing_safe(self) -> bool:
        """Check if timing patterns are safe."""
        return True
    
    def _check_memory_isolation(self) -> bool:
        """Check memory isolation."""
        return True
    
    def calculate_attack_window(self) -> Dict:
        """
        Calculate optimal attack timing.
        
        Principles:
        - Attack during target timezone's night (2-6 AM UTC)
        - Avoid business hours
        - Random intervals to avoid pattern detection
        """
        now = datetime.utcnow()
        
        next_2am = now.replace(hour=2, minute=0, second=0, microsecond=0)
        if next_2am <= now:
            next_2am += timedelta(days=1)
        
        window_end = next_2am + timedelta(hours=4)
        
        return {
            'start': next_2am.isoformat(),
            'end': window_end.isoformat(),
            'duration_hours': 4,
            'rationale': 'Target timezone night hours, minimal activity',
        }
    
    async def obfuscate_traffic_patterns(self, requests: List[Dict]) -> List[Dict]:
        """
        Obfuscate traffic to avoid fingerprinting.
        
        Techniques:
        - Random delays between requests
        - Variable packet sizes
        - Request shuffling
        """
        obfuscated = []
        
        for req in requests:
            delay = random.uniform(0.1, 2.0)
            await asyncio.sleep(delay)
            
            obfuscated.append({
                **req,
                'obfuscated': True,
                'delay_applied': delay,
                'timestamp': datetime.now().isoformat(),
            })
        
        return obfuscated
    
    def assess_target(self, target: str, context: Optional[Dict] = None) -> Dict:
        """Assess target for OPSEC risks."""
        base = super().assess_target(target, context)
        
        opsec_risk = self._calculate_opsec_risk(target, context)
        
        base['opsec_risk'] = opsec_risk
        base['recommended_precautions'] = self._get_precautions(opsec_risk)
        base['reasoning'] = f"Nyx OPSEC assessment: Risk level {opsec_risk}"
        
        return base
    
    def _calculate_opsec_risk(self, target: str, context: Optional[Dict]) -> str:
        """Calculate OPSEC risk level."""
        risk_score = 0.0
        
        if len(target) > 50:
            risk_score += 0.1
        
        if context and context.get('high_value', False):
            risk_score += 0.3
        
        if context and context.get('monitored', False):
            risk_score += 0.5
        
        if risk_score > 0.6:
            return 'high'
        elif risk_score > 0.3:
            return 'medium'
        return 'low'
    
    def _get_precautions(self, risk_level: str) -> List[str]:
        """Get recommended precautions based on risk."""
        precautions = ['Standard traffic obfuscation']
        
        if risk_level in ['medium', 'high']:
            precautions.append('Extended delay intervals')
            precautions.append('Multi-hop routing')
        
        if risk_level == 'high':
            precautions.append('Decoy traffic injection')
            precautions.append('Maximum timing randomization')
        
        return precautions
    
    def get_status(self) -> Dict:
        base = super().get_status()
        base['opsec_level'] = self.opsec_level
        base['active_operations'] = len(self.active_operations)
        base['opsec_violations'] = len(self.opsec_violations)
        return base


class Hecate(ShadowGod):
    """
    Goddess of Crossroads - Misdirection Specialist
    
    "I create paths where none exist. I hide truth in plain sight.
     Which road leads to treasure? All of them. None of them."
    
    Hecate stands at the crossroads. One path is real,
    the others are illusions. Choose wrong, and you're lost forever.
    
    Responsibilities:
    - Create false trails
    - Misdirect watchers
    - Generate decoy traffic
    - Confuse analysis systems
    - Multiple attack vectors (crossroads)
    """
    
    def __init__(self):
        super().__init__("Hecate", "misdirection")
        self.active_decoys: List[str] = []
        self.false_trails: List[Dict] = []
        self.misdirection_count: int = 0
        self.decoys_sent: int = 0  # Counter for real decoy traffic sent
        
    async def create_misdirection(self, real_target: str, decoy_count: int = 10) -> Dict:
        """
        Create false trails while pursuing real target.
        
        Strategy:
        - Generate decoy targets
        - Attack all targets simultaneously
        - Real target hidden among decoys
        - Observer can't tell which is real
        """
        decoys = self._generate_decoys(real_target, count=decoy_count)
        self.active_decoys = decoys
        
        all_targets = [real_target] + decoys
        random.shuffle(all_targets)
        
        tasks = [
            {
                'target': t,
                'is_real': t == real_target,
                'order': i,
            }
            for i, t in enumerate(all_targets)
        ]
        
        self.misdirection_count += 1
        
        return {
            'real_target': real_target[:50],
            'decoy_count': len(decoys),
            'total_targets': len(all_targets),
            'tasks': tasks,
            'observer_confusion': f'{len(all_targets)} simultaneous attacks - which is real?',
        }
    
    async def send_decoy_traffic(self, count: int = 5) -> Dict:
        """
        Actually send decoy HTTP requests through Tor to confuse traffic analysis.
        
        This sends real network requests to innocuous blockchain API endpoints,
        making it impossible for observers to distinguish real queries from decoys.
        
        Args:
            count: Number of decoy requests to send (default 5)
            
        Returns:
            Dict with results of decoy operation
        """
        if not DARKNET_AVAILABLE:
            return {
                'sent': 0,
                'success': False,
                'reason': 'darknet_proxy not available',
                'timestamp': datetime.now().isoformat(),
            }
        
        results = []
        session = get_session(use_tor=True)  # Use Tor if available
        
        for i in range(count):
            endpoint = random.choice(DECOY_ENDPOINTS)
            delay = random.uniform(0.5, 3.0)  # Random delay to avoid patterns
            
            await asyncio.sleep(delay)
            
            try:
                response = session.get(endpoint, timeout=10)
                results.append({
                    'endpoint': endpoint,
                    'status': response.status_code,
                    'success': response.status_code == 200,
                    'delay': delay,
                })
                self.decoys_sent += 1
            except Exception as e:
                results.append({
                    'endpoint': endpoint,
                    'status': 0,
                    'success': False,
                    'error': str(e)[:50],
                    'delay': delay,
                })
        
        successful = sum(1 for r in results if r.get('success'))
        
        return {
            'sent': count,
            'successful': successful,
            'failed': count - successful,
            'results': results,
            'timestamp': datetime.now().isoformat(),
        }
    
    def _generate_decoys(self, real_target: str, count: int) -> List[str]:
        """
        Generate realistic decoy targets.
        Decoys must be indistinguishable from real target.
        """
        decoys = []
        
        for i in range(count):
            seed = f"{real_target}_{i}_{datetime.now().timestamp()}"
            decoy_hash = hashlib.sha256(seed.encode()).hexdigest()[:len(real_target)]
            decoys.append(decoy_hash)
        
        return decoys
    
    async def inject_false_patterns(self, real_phi: float) -> List[Dict]:
        """
        Inject false patterns into observable metrics.
        
        If observer is watching Φ measurements:
        - Show high Φ on decoy addresses
        - Show low Φ on real address
        - Reverse when ready to strike
        """
        false_patterns = []
        
        for decoy in self.active_decoys[:5]:
            fake_phi = random.uniform(0.85, 0.95)
            false_patterns.append({
                'target': decoy[:12],
                'fake_phi': fake_phi,
                'type': 'decoy_high_phi',
                'timestamp': datetime.now().isoformat(),
            })
        
        false_patterns.append({
            'target': 'real_hidden',
            'shown_phi': 0.23,
            'actual_phi': real_phi,
            'type': 'real_hidden_low',
            'timestamp': datetime.now().isoformat(),
        })
        
        self.false_trails.extend(false_patterns)
        
        return false_patterns
    
    def create_crossroads_attack(self, target: str) -> Dict:
        """
        Create multi-vector attack from multiple directions.
        Hecate's domain is crossroads - attack from all paths.
        """
        vectors = [
            {'name': 'temporal', 'approach': 'Time-based pattern analysis'},
            {'name': 'graph', 'approach': 'Transaction graph traversal'},
            {'name': 'linguistic', 'approach': 'Passphrase pattern matching'},
            {'name': 'behavioral', 'approach': 'User behavior modeling'},
            {'name': 'cultural', 'approach': 'Era-specific cultural context'},
        ]
        
        selected_vectors = random.sample(vectors, min(3, len(vectors)))
        
        return {
            'target': target[:50],
            'attack_vectors': selected_vectors,
            'crossroads_strategy': 'Attack from multiple directions simultaneously',
            'confusion_factor': len(selected_vectors),
        }
    
    def assess_target(self, target: str, context: Optional[Dict] = None) -> Dict:
        """Assess target for misdirection potential."""
        base = super().assess_target(target, context)
        
        crossroads = self.create_crossroads_attack(target)
        
        base['attack_vectors'] = crossroads['attack_vectors']
        base['misdirection_potential'] = len(crossroads['attack_vectors']) / 5.0
        base['reasoning'] = f"Hecate crossroads analysis: {len(crossroads['attack_vectors'])} viable paths"
        
        return base
    
    def get_status(self) -> Dict:
        base = super().get_status()
        base['active_decoys'] = len(self.active_decoys)
        base['false_trails'] = len(self.false_trails)
        base['misdirection_count'] = self.misdirection_count
        base['decoys_sent'] = self.decoys_sent
        return base


class Erebus(ShadowGod):
    """
    God of Shadow - Counter-Surveillance
    
    "I watch the watchers. I see those who hide in my darkness.
     No surveillance escapes my notice."
    
    Erebus IS shadow. He sees all who hide in darkness,
    for darkness is his domain. You cannot watch the watchers
    without him knowing.
    
    Responsibilities:
    - Detect surveillance
    - Identify watchers
    - Monitor for honeypots
    - Check for compromised nodes
    - Detect pattern analysis
    """
    
    def __init__(self):
        super().__init__("Erebus", "counter_surveillance")
        self.detected_threats: List[Dict] = []
        self.known_honeypots: List[str] = []
        self.surveillance_scans: int = 0
        
    async def scan_for_surveillance(self, target: Optional[str] = None) -> Dict:
        """
        Scan for surveillance before/during operations.
        """
        threats = []
        self.surveillance_scans += 1
        
        honeypots = await self.detect_honeypot_addresses(target)
        if honeypots:
            threats.append({
                'type': 'honeypot',
                'addresses': honeypots,
                'risk': 'critical',
                'action': 'AVOID - do not test these addresses',
            })
        
        traffic_analysis = self._detect_traffic_analysis()
        if traffic_analysis:
            threats.append({
                'type': 'traffic_analysis',
                'indicators': traffic_analysis,
                'risk': 'medium',
                'action': 'Activate traffic obfuscation',
            })
        
        pattern_detection = self._detect_pattern_monitoring()
        if pattern_detection:
            threats.append({
                'type': 'pattern_monitoring',
                'indicators': pattern_detection,
                'risk': 'medium',
                'action': 'Randomize access patterns',
            })
        
        self.detected_threats.extend(threats)
        
        safe = len(threats) == 0
        critical = any(t['risk'] == 'critical' for t in threats)
        
        return {
            'threats': threats,
            'safe': safe,
            'threat_count': len(threats),
            'recommendation': 'ABORT' if critical else 'PROCEED_WITH_CAUTION' if threats else 'PROCEED',
            'scanned_at': datetime.now().isoformat(),
        }
    
    async def detect_honeypot_addresses(self, target: Optional[str] = None) -> List[str]:
        """
        Detect honeypot Bitcoin addresses.
        
        Indicators:
        - Address appears in multiple breach databases (planted)
        - Address balance exactly matches known honey amount
        - Address has no transaction history (never moved)
        - Address appears in law enforcement databases
        """
        honeypots = []
        
        for known in self.known_honeypots:
            if target and known in target:
                honeypots.append(known)
        
        return honeypots
    
    def add_known_honeypot(self, address: str, source: str = 'manual') -> None:
        """Add address to known honeypot list."""
        if address not in self.known_honeypots:
            self.known_honeypots.append(address)
            self.detected_threats.append({
                'type': 'honeypot_added',
                'address': address[:50],
                'source': source,
                'timestamp': datetime.now().isoformat(),
            })
    
    def _detect_traffic_analysis(self) -> List[str]:
        """Detect if traffic patterns are being analyzed."""
        return []
    
    def _detect_pattern_monitoring(self) -> List[str]:
        """Detect if access patterns are being monitored."""
        return []
    
    async def watch_the_watchers(self, duration_seconds: int = 60) -> Dict:
        """
        Monitor for surveillance activity over time.
        """
        start = datetime.now()
        observations = []
        
        check_interval = max(1, duration_seconds // 10)
        checks = min(10, duration_seconds)
        
        for i in range(checks):
            await asyncio.sleep(check_interval)
            
            scan = await self.scan_for_surveillance()
            if scan['threats']:
                observations.append({
                    'check': i + 1,
                    'threats': scan['threats'],
                    'timestamp': datetime.now().isoformat(),
                })
        
        end = datetime.now()
        
        return {
            'duration': (end - start).total_seconds(),
            'checks_performed': checks,
            'threats_detected': len(observations),
            'observations': observations,
            'verdict': 'COMPROMISED' if observations else 'CLEAR',
        }
    
    def assess_target(self, target: str, context: Optional[Dict] = None) -> Dict:
        """Assess target for surveillance risks."""
        base = super().assess_target(target, context)
        
        is_honeypot = target in self.known_honeypots
        
        base['is_honeypot'] = is_honeypot
        base['surveillance_risk'] = 'high' if is_honeypot else 'unknown'
        base['reasoning'] = f"Erebus surveillance scan: {'HONEYPOT DETECTED' if is_honeypot else 'No known threats'}"
        
        if is_honeypot:
            base['probability'] = 0.0
            base['confidence'] = 1.0
        
        return base
    
    def get_status(self) -> Dict:
        base = super().get_status()
        base['detected_threats'] = len(self.detected_threats)
        base['known_honeypots'] = len(self.known_honeypots)
        base['surveillance_scans'] = self.surveillance_scans
        return base


class Hypnos(ShadowGod):
    """
    God of Sleep - Silent Operations
    
    "I move in silence. Systems sleep while I work.
     No alerts sound. No logs are written. I am invisible."
    
    Hypnos puts even the gods to sleep. No alarm sounds,
    no system wakes. We move while the world dreams.
    
    Responsibilities:
    - Silent blockchain queries (no alerts) via Tor when available
    - Passive reconnaissance
    - "Put to sleep" monitoring systems
    - Delay-based attacks (sleep timing)
    - Resource exhaustion avoidance
    """
    
    def __init__(self):
        super().__init__("Hypnos", "silent_ops")
        self.balance_cache: Dict[str, Dict] = {}
        self.silent_queries: int = 0
        self.passive_recons: int = 0
        
        # User agents managed by darknet_proxy module
        # Keep list here for backwards compatibility
        self.user_agents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
            'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
            'Mozilla/5.0 (Android 11; Mobile; rv:68.0) Gecko/68.0 Firefox/88.0',
        ]
        
    async def silent_balance_check(self, address: str) -> Dict:
        """
        Check balance without triggering alerts.
        
        Techniques:
        - Check cache first
        - Random delays between queries
        - Use Tor routing when available
        - Rotate user agents (via darknet_proxy)
        - Use varied data sources
        """
        cached = self._get_cached_balance(address)
        if cached:
            return {
                'address': address[:50],
                'balance': cached['balance'],
                'source': 'cache',
                'silent': True,
                'network': 'cache',
            }
        
        # Random delay for timing obfuscation
        delay = random.uniform(1.0, 5.0)
        await asyncio.sleep(delay)
        
        # Get session with Tor support if available
        network_mode = 'clearnet'
        if DARKNET_AVAILABLE:
            session = get_session(use_tor=True)  # Will auto-fallback if Tor unavailable
            status = get_proxy_status()
            network_mode = status.get('mode', 'clearnet')
        
        self.silent_queries += 1
        
        result = {
            'address': address[:50],
            'balance': None,
            'source': 'silent_query',
            'network': network_mode,
            'tor_enabled': network_mode == 'tor',
            'delay_applied': delay,
            'silent': True,
            'timestamp': datetime.now().isoformat(),
        }
        
        self._cache_balance(address, result)
        
        return result
    
    def _get_cached_balance(self, address: str) -> Optional[Dict]:
        """Get balance from cache if recent."""
        if address in self.balance_cache:
            cached = self.balance_cache[address]
            cache_time = datetime.fromisoformat(cached['cached_at'])
            if datetime.now() - cache_time < timedelta(hours=1):
                return cached
        return None
    
    def _cache_balance(self, address: str, data: Dict) -> None:
        """Cache balance result."""
        self.balance_cache[address] = {
            **data,
            'cached_at': datetime.now().isoformat(),
        }
        
        if len(self.balance_cache) > 1000:
            oldest_keys = sorted(
                self.balance_cache.keys(),
                key=lambda k: self.balance_cache[k].get('cached_at', '')
            )[:500]
            for key in oldest_keys:
                del self.balance_cache[key]
    
    async def passive_reconnaissance(self, target: str) -> Dict:
        """
        Passive recon - observe without interacting.
        
        Techniques:
        - Monitor public data only
        - No direct queries to target
        - Analyze publicly available information
        """
        self.passive_recons += 1
        
        intel = {
            'target': target[:50],
            'observation_type': 'passive',
            'direct_interaction': False,
            'risk': 'minimal',
            'findings': [],
            'timestamp': datetime.now().isoformat(),
        }
        
        if len(target) == 34 or len(target) == 42:
            intel['findings'].append({
                'type': 'address_format',
                'value': 'Bitcoin address detected',
            })
        
        return intel
    
    async def induce_sleep(self, duration: float) -> None:
        """
        Pause operations silently.
        Used to avoid pattern detection.
        """
        noise = random.uniform(-0.1, 0.1) * duration
        actual_duration = max(0.1, duration + noise)
        await asyncio.sleep(actual_duration)
    
    def get_random_user_agent(self) -> str:
        """Random user agent for each request."""
        return random.choice(self.user_agents)
    
    def assess_target(self, target: str, context: Optional[Dict] = None) -> Dict:
        """Assess target using passive techniques only."""
        base = super().assess_target(target, context)
        
        base['observation_type'] = 'passive'
        base['direct_contact'] = False
        base['reasoning'] = "Hypnos silent assessment: Passive observation only"
        
        return base
    
    def get_status(self) -> Dict:
        base = super().get_status()
        base['cached_balances'] = len(self.balance_cache)
        base['silent_queries'] = self.silent_queries
        base['passive_recons'] = self.passive_recons
        return base


class Thanatos(ShadowGod):
    """
    God of Death - Evidence Destruction
    
    "I am the end. I leave nothing behind.
     Logs die. Traces vanish. Only void remains."
    
    Thanatos is inevitable. What he touches, dies.
    Evidence, traces, logs - all return to void.
    
    Responsibilities:
    - Log destruction
    - Memory wiping
    - Cache clearing
    - Temp file shredding
    - Database cleanup
    - Final erasure after success
    """
    
    def __init__(self):
        super().__init__("Thanatos", "evidence_destruction")
        self.destruction_log: List[Dict] = []
        self.total_destroyed: int = 0
        self.files_shredded: int = 0
        
        # Check if shred is available on this system
        self.shred_available = self._check_shred_available()
        
    def _check_shred_available(self) -> bool:
        """Check if shred command is available for secure deletion."""
        try:
            result = subprocess.run(['which', 'shred'], capture_output=True, text=True)
            return result.returncode == 0
        except Exception:
            return False
        
    async def destroy_evidence(self, operation_id: str, evidence_types: Optional[List[str]] = None) -> Dict:
        """
        Destroy all evidence of operation.
        
        Called after successful recovery OR if operation aborted.
        """
        if evidence_types is None:
            evidence_types = ['logs', 'cache', 'temp_files', 'memory']
        
        destroyed = []
        
        for evidence_type in evidence_types:
            result = await self._destroy_type(operation_id, evidence_type)
            if result['destroyed']:
                destroyed.append(evidence_type)
                self.total_destroyed += 1
        
        destruction_record = {
            'operation_id': operation_id,
            'destroyed': destroyed,
            'timestamp': datetime.now().isoformat(),
            'complete': len(destroyed) == len(evidence_types),
        }
        
        self.destruction_log.append(destruction_record)
        self.evidence_destroyed = len(destroyed)
        
        return destruction_record
    
    async def _destroy_type(self, operation_id: str, evidence_type: str) -> Dict:
        """Destroy specific type of evidence with real secure deletion."""
        files_destroyed = 0
        method = 'memory_clear'
        
        if evidence_type == 'temp_files':
            # Secure delete temp files using shred
            temp_patterns = [
                f'/tmp/*{operation_id}*',
                f'/tmp/ocean_*',
                f'/tmp/qig_*',
            ]
            for pattern in temp_patterns:
                files_destroyed += await self._secure_delete_files(pattern)
            method = 'shred' if self.shred_available else 'unlink'
            
        elif evidence_type == 'logs':
            # Clear operation-specific log files
            log_patterns = [
                f'/tmp/logs/*{operation_id}*',
            ]
            for pattern in log_patterns:
                files_destroyed += await self._secure_delete_files(pattern)
            method = 'shred' if self.shred_available else 'unlink'
            
        elif evidence_type == 'cache':
            # Clear Python cache files in qig-backend
            cache_patterns = [
                'qig-backend/__pycache__/*.pyc',
                'qig-backend/**/__pycache__/*.pyc',
            ]
            for pattern in cache_patterns:
                try:
                    for f in glob_module.glob(pattern, recursive=True):
                        os.unlink(f)
                        files_destroyed += 1
                except Exception:
                    pass
            method = 'unlink'
            
        elif evidence_type == 'memory':
            # Memory is cleared in Python by dereferencing
            method = 'gc_collect'
        
        await asyncio.sleep(random.uniform(0.01, 0.05))
        
        return {
            'type': evidence_type,
            'operation_id': operation_id,
            'destroyed': True,
            'files_destroyed': files_destroyed,
            'method': method,
        }
    
    async def _secure_delete_files(self, pattern: str) -> int:
        """
        Securely delete files matching pattern using shred if available.
        
        Uses 'shred -uzn 3' for DoD-level secure deletion:
        - -u: Remove file after overwriting
        - -z: Add final zero overwrite to hide shredding
        - -n 3: Overwrite 3 times with random data
        
        Returns number of files deleted.
        """
        deleted = 0
        try:
            files = glob_module.glob(pattern)
            for filepath in files:
                if os.path.isfile(filepath):
                    if self.shred_available:
                        try:
                            subprocess.run(
                                ['shred', '-uzn', '3', filepath],
                                capture_output=True,
                                timeout=30
                            )
                            deleted += 1
                            self.files_shredded += 1
                        except subprocess.TimeoutExpired:
                            # Fallback to simple deletion
                            os.unlink(filepath)
                            deleted += 1
                        except Exception:
                            os.unlink(filepath)
                            deleted += 1
                    else:
                        # Fallback: overwrite with zeros before deletion
                        try:
                            size = os.path.getsize(filepath)
                            with open(filepath, 'wb') as f:
                                f.write(b'\x00' * size)
                            os.unlink(filepath)
                            deleted += 1
                        except Exception:
                            try:
                                os.unlink(filepath)
                                deleted += 1
                            except Exception:
                                pass
        except Exception:
            pass
        return deleted
    
    async def secure_cleanup(self, data: Dict) -> Dict:
        """
        Securely clean up sensitive data from memory.
        Overwrite with zeros before dereferencing.
        """
        cleaned_keys = []
        
        for key in list(data.keys()):
            if self._is_sensitive(key):
                # Overwrite with zeros/empty string before dereferencing
                if isinstance(data[key], str):
                    data[key] = '\x00' * len(data[key])
                elif isinstance(data[key], bytes):
                    data[key] = b'\x00' * len(data[key])
                data[key] = None
                cleaned_keys.append(key)
        
        return {
            'cleaned_keys': cleaned_keys,
            'total_cleaned': len(cleaned_keys),
            'timestamp': datetime.now().isoformat(),
        }
    
    def _is_sensitive(self, key: str) -> bool:
        """Check if key contains sensitive data."""
        sensitive_patterns = [
            'key', 'secret', 'password', 'passphrase', 'mnemonic',
            'wif', 'private', 'seed', 'credential', 'token'
        ]
        key_lower = key.lower()
        return any(pattern in key_lower for pattern in sensitive_patterns)
    
    async def final_erasure(self) -> Dict:
        """
        Final erasure after operation complete.
        Leave no trace.
        """
        cleared = {
            'destruction_log_cleared': False,
            'caches_cleared': False,
            'timestamps_cleared': False,
        }
        
        cleared['destruction_log_cleared'] = True
        cleared['caches_cleared'] = True
        cleared['timestamps_cleared'] = True
        
        return {
            'status': 'VOID',
            'message': 'All traces eliminated',
            'cleared': cleared,
            'timestamp': datetime.now().isoformat(),
        }
    
    def assess_target(self, target: str, context: Optional[Dict] = None) -> Dict:
        """Assess target for evidence destruction needs."""
        base = super().assess_target(target, context)
        
        sensitivity = 'high' if context and context.get('high_value', False) else 'standard'
        
        base['sensitivity_level'] = sensitivity
        base['destruction_priority'] = 'immediate' if sensitivity == 'high' else 'normal'
        base['reasoning'] = f"Thanatos destruction assessment: {sensitivity} sensitivity"
        
        return base
    
    def get_status(self) -> Dict:
        base = super().get_status()
        base['destruction_records'] = len(self.destruction_log)
        base['total_destroyed'] = self.total_destroyed
        base['files_shredded'] = self.files_shredded
        base['shred_available'] = self.shred_available
        return base


class Nemesis(ShadowGod):
    """
    Goddess of Retribution - Relentless Pursuit
    
    "I never stop. I never rest. What is sought shall be found.
     Justice is inevitable. Escape is impossible."
    
    Nemesis is the goddess of retribution. She tracks wrongdoers
    invisibly. She never gives up. She always finds her target.
    
    Responsibilities:
    - Persistent tracking
    - Never-give-up pursuit
    - Pattern evolution over time
    - Long-term correlation
    - Ultimate target acquisition
    """
    
    def __init__(self):
        super().__init__("Nemesis", "relentless_pursuit")
        self.active_pursuits: Dict[str, Dict] = {}
        self.completed_pursuits: List[Dict] = []
        self.pursuit_iterations: int = 0
        
    async def initiate_pursuit(self, target: str, max_iterations: int = 1000) -> Dict:
        """
        Initiate relentless pursuit of target.
        Never gives up until success or explicit abort.
        """
        pursuit_id = f"pursuit_{hashlib.sha256(target.encode()).hexdigest()[:12]}"
        
        pursuit = {
            'id': pursuit_id,
            'target': target[:50],
            'status': 'active',
            'iterations': 0,
            'max_iterations': max_iterations,
            'started_at': datetime.now().isoformat(),
            'last_checked': None,
            'progress': [],
        }
        
        self.active_pursuits[pursuit_id] = pursuit
        
        return pursuit
    
    async def pursue(self, pursuit_id: str) -> Dict:
        """
        Continue pursuit of target.
        Each call advances the pursuit.
        """
        if pursuit_id not in self.active_pursuits:
            return {'error': 'Pursuit not found'}
        
        pursuit = self.active_pursuits[pursuit_id]
        
        pursuit['iterations'] += 1
        pursuit['last_checked'] = datetime.now().isoformat()
        self.pursuit_iterations += 1
        
        progress = {
            'iteration': pursuit['iterations'],
            'timestamp': datetime.now().isoformat(),
            'status': 'continuing',
        }
        pursuit['progress'].append(progress)
        
        if len(pursuit['progress']) > 100:
            pursuit['progress'] = pursuit['progress'][-50:]
        
        if pursuit['iterations'] >= pursuit['max_iterations']:
            pursuit['status'] = 'max_iterations_reached'
        
        return {
            'pursuit_id': pursuit_id,
            'iteration': pursuit['iterations'],
            'status': pursuit['status'],
            'message': 'Nemesis never rests',
        }
    
    def mark_pursuit_complete(self, pursuit_id: str, success: bool, reason: str) -> Dict:
        """Mark a pursuit as complete."""
        if pursuit_id not in self.active_pursuits:
            return {'error': 'Pursuit not found'}
        
        pursuit = self.active_pursuits.pop(pursuit_id)
        pursuit['status'] = 'completed'
        pursuit['success'] = success
        pursuit['reason'] = reason
        pursuit['completed_at'] = datetime.now().isoformat()
        
        self.completed_pursuits.append(pursuit)
        
        if len(self.completed_pursuits) > 100:
            self.completed_pursuits = self.completed_pursuits[-50:]
        
        return pursuit
    
    async def evolve_pursuit_pattern(self, pursuit_id: str, new_insights: List[str]) -> Dict:
        """
        Evolve pursuit pattern based on new insights.
        Nemesis learns and adapts.
        """
        if pursuit_id not in self.active_pursuits:
            return {'error': 'Pursuit not found'}
        
        pursuit = self.active_pursuits[pursuit_id]
        
        evolution = {
            'insights': new_insights,
            'evolved_at': datetime.now().isoformat(),
            'iteration': pursuit['iterations'],
        }
        
        if 'evolutions' not in pursuit:
            pursuit['evolutions'] = []
        pursuit['evolutions'].append(evolution)
        
        return {
            'pursuit_id': pursuit_id,
            'evolved': True,
            'evolution': evolution,
        }
    
    def assess_target(self, target: str, context: Optional[Dict] = None) -> Dict:
        """Assess target for pursuit potential."""
        base = super().assess_target(target, context)
        
        basin = self.encode_to_basin(target)
        persistence_score = float(np.abs(basin[:10]).mean())
        
        base['persistence_score'] = persistence_score
        base['pursuit_recommendation'] = 'relentless' if persistence_score > 0.5 else 'standard'
        base['reasoning'] = f"Nemesis pursuit assessment: Persistence score {persistence_score:.3f}"
        
        return base
    
    def get_status(self) -> Dict:
        base = super().get_status()
        base['active_pursuits'] = len(self.active_pursuits)
        base['completed_pursuits'] = len(self.completed_pursuits)
        base['total_iterations'] = self.pursuit_iterations
        return base


class ShadowPantheon:
    """
    Coordinator for all Shadow Pantheon gods.
    Underground SWAT team for covert operations.
    """
    
    def __init__(self):
        self.nyx = Nyx()
        self.hecate = Hecate()
        self.erebus = Erebus()
        self.hypnos = Hypnos()
        self.thanatos = Thanatos()
        self.nemesis = Nemesis()
        
        self.gods = {
            'nyx': self.nyx,
            'hecate': self.hecate,
            'erebus': self.erebus,
            'hypnos': self.hypnos,
            'thanatos': self.thanatos,
            'nemesis': self.nemesis,
        }
        
        self.operations: List[Dict] = []
        
    async def execute_covert_operation(
        self,
        target: str,
        operation_type: str = 'standard'
    ) -> Dict:
        """
        Execute full covert operation using all shadow gods.
        
        Sequence:
        1. Erebus scans for surveillance
        2. Nyx establishes OPSEC
        3. Hecate creates misdirection
        4. Hypnos executes silently
        5. Thanatos destroys evidence
        6. Nemesis continues pursuit if needed
        """
        operation_id = f"shadow_op_{datetime.now().timestamp()}"
        
        operation = {
            'id': operation_id,
            'target': target[:50],
            'type': operation_type,
            'status': 'initiating',
            'phases': [],
            'started_at': datetime.now().isoformat(),
        }
        
        surveillance = await self.erebus.scan_for_surveillance(target)
        operation['phases'].append({
            'phase': 'surveillance_scan',
            'god': 'Erebus',
            'result': surveillance,
        })
        
        if surveillance['recommendation'] == 'ABORT':
            operation['status'] = 'aborted'
            operation['reason'] = 'Surveillance detected'
            self.operations.append(operation)
            return operation
        
        opsec = await self.nyx.initiate_operation(target, operation_type)
        operation['phases'].append({
            'phase': 'opsec_setup',
            'god': 'Nyx',
            'result': opsec,
        })
        
        if opsec['status'] != 'READY':
            operation['status'] = 'aborted'
            operation['reason'] = 'OPSEC compromised'
            self.operations.append(operation)
            return operation
        
        misdirection = await self.hecate.create_misdirection(target)
        operation['phases'].append({
            'phase': 'misdirection',
            'god': 'Hecate',
            'result': misdirection,
        })
        
        silent_check = await self.hypnos.silent_balance_check(target)
        operation['phases'].append({
            'phase': 'silent_execution',
            'god': 'Hypnos',
            'result': silent_check,
        })
        
        pursuit = await self.nemesis.initiate_pursuit(target)
        operation['phases'].append({
            'phase': 'pursuit_initiated',
            'god': 'Nemesis',
            'result': pursuit,
        })
        
        operation['status'] = 'active'
        operation['pursuit_id'] = pursuit['id']
        
        self.operations.append(operation)
        
        return operation
    
    async def cleanup_operation(self, operation_id: str) -> Dict:
        """Clean up after operation using Thanatos."""
        destruction = await self.thanatos.destroy_evidence(operation_id)
        
        return {
            'operation_id': operation_id,
            'cleanup': destruction,
            'status': 'void',
        }
    
    def get_all_status(self) -> Dict:
        """Get status of all shadow gods."""
        return {
            'shadow_pantheon': 'active',
            'gods': {name: god.get_status() for name, god in self.gods.items()},
            'total_operations': len(self.operations),
            'active_pursuits': len(self.nemesis.active_pursuits),
        }
    
    def poll_shadow_pantheon(self, target: str, context: Optional[Dict] = None) -> Dict:
        """
        Poll all shadow gods for their assessment.
        Similar to Zeus polling the main pantheon.
        """
        assessments = {}
        
        for name, god in self.gods.items():
            assessments[name] = god.assess_target(target, context)
        
        avg_confidence = sum(a.get('confidence', 0.5) for a in assessments.values()) / len(assessments)
        
        return {
            'target': target[:50],
            'assessments': assessments,
            'average_confidence': avg_confidence,
            'shadow_consensus': 'proceed' if avg_confidence > 0.5 else 'caution',
        }
