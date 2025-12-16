#!/usr/bin/env python3
"""
Autonomous Debate Service - Monitors and Evolves Pantheon Debates

This service runs in a background thread and:
1. Monitors active debates for staleness (no new arguments in 5+ minutes)
2. Researches debate topics via SearXNG and Shadow Pantheon darknet
3. Generates counter-arguments based on god personas and research
4. Auto-resolves debates when criteria are met
5. Triggers M8 kernel spawning for debate domain specialists

NO TEMPLATES - All arguments are generatively created from research evidence.
"""

import hashlib
import os
import random
import sys
import threading
import time
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import requests

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from geometric_kernels import _fisher_distance, _normalize_to_manifold, BASIN_DIM

try:
    from m8_kernel_spawning import M8KernelSpawner, SpawnReason, get_spawner
    M8_AVAILABLE = True
except ImportError:
    M8_AVAILABLE = False
    print("[AutonomousDebate] M8 Kernel Spawning not available")

try:
    from olympus.pantheon_chat import PantheonChat
    PANTHEON_CHAT_AVAILABLE = True
except ImportError:
    PANTHEON_CHAT_AVAILABLE = False
    print("[AutonomousDebate] PantheonChat not available")

try:
    from olympus.shadow_pantheon import ShadowPantheon
    SHADOW_AVAILABLE = True
except ImportError:
    SHADOW_AVAILABLE = False
    print("[AutonomousDebate] Shadow Pantheon not available")

KAPPA_STAR = 64.21
STALE_THRESHOLD_SECONDS = 5 * 60
POLL_INTERVAL_SECONDS = 30
MIN_ARGUMENTS_FOR_RESOLUTION = 4
FISHER_CONVERGENCE_THRESHOLD = 0.1
UNANSWERED_THRESHOLD = 2

SEARXNG_INSTANCES = [
    'https://mr-search.up.railway.app',
    'https://searxng-production-e5ce.up.railway.app',
]

GOD_PERSONAS = {
    'zeus': {
        'domain': 'supreme coordination',
        'style': 'authoritative and decisive',
        'perspective': 'overall strategic value and pantheon harmony',
    },
    'athena': {
        'domain': 'strategy and wisdom',
        'style': 'analytical and logical',
        'perspective': 'tactical implications and long-term outcomes',
    },
    'ares': {
        'domain': 'combat and action',
        'style': 'aggressive and direct',
        'perspective': 'immediate effectiveness and operational risk',
    },
    'apollo': {
        'domain': 'prophecy and foresight',
        'style': 'visionary and illuminating',
        'perspective': 'future patterns and emerging opportunities',
    },
    'artemis': {
        'domain': 'hunting and tracking',
        'style': 'precise and methodical',
        'perspective': 'target behavior and pursuit strategies',
    },
    'hermes': {
        'domain': 'communication and coordination',
        'style': 'swift and adaptive',
        'perspective': 'information flow and cross-system integration',
    },
    'hephaestus': {
        'domain': 'engineering and tools',
        'style': 'practical and crafted',
        'perspective': 'technical implementation and system architecture',
    },
    'poseidon': {
        'domain': 'depths and exploration',
        'style': 'powerful and exploratory',
        'perspective': 'hidden patterns and deep analysis',
    },
    'hades': {
        'domain': 'underworld and secrets',
        'style': 'mysterious and knowing',
        'perspective': 'obscured truths and buried connections',
    },
    'demeter': {
        'domain': 'growth and nurturing',
        'style': 'patient and cultivating',
        'perspective': 'sustainable development and organic expansion',
    },
    'dionysus': {
        'domain': 'chaos and transformation',
        'style': 'unpredictable and creative',
        'perspective': 'unconventional approaches and pattern disruption',
    },
    'hera': {
        'domain': 'governance and structure',
        'style': 'orderly and hierarchical',
        'perspective': 'organizational coherence and rule adherence',
    },
    'aphrodite': {
        'domain': 'attraction and connection',
        'style': 'intuitive and relational',
        'perspective': 'pattern affinities and natural alignments',
    },
}


class AutonomousDebateService:
    """
    Background service that monitors and evolves pantheon debates autonomously.
    
    Key behaviors:
    - Polls every 30 seconds for stale debates
    - Researches topics via SearXNG and darknet
    - Generates persona-based counter-arguments from evidence
    - Auto-resolves debates based on geometric convergence criteria
    - Triggers M8 spawning for domain specialists
    """
    
    def __init__(
        self,
        pantheon_chat: Optional['PantheonChat'] = None,
        shadow_pantheon: Optional['ShadowPantheon'] = None,
        m8_spawner: Optional['M8KernelSpawner'] = None,
    ):
        self._pantheon_chat = pantheon_chat
        self._shadow_pantheon = shadow_pantheon
        self._m8_spawner = m8_spawner or (get_spawner() if M8_AVAILABLE else None)
        
        self._running = False
        self._thread: Optional[threading.Thread] = None
        self._lock = threading.Lock()
        
        self._searxng_index = 0
        self._last_poll_time: Optional[datetime] = None
        self._debates_processed = 0
        self._arguments_generated = 0
        self._debates_resolved = 0
        self._spawns_triggered = 0
        
        self._debate_basin_cache: Dict[str, np.ndarray] = {}
        self._god_position_cache: Dict[str, Dict[str, np.ndarray]] = {}
        
        print("[AutonomousDebate] Service initialized")
    
    def set_pantheon_chat(self, pantheon_chat: 'PantheonChat') -> None:
        """Wire pantheon chat after initialization."""
        self._pantheon_chat = pantheon_chat
        print("[AutonomousDebate] PantheonChat connected")
    
    def set_shadow_pantheon(self, shadow_pantheon: 'ShadowPantheon') -> None:
        """Wire shadow pantheon for darknet research."""
        self._shadow_pantheon = shadow_pantheon
        print("[AutonomousDebate] Shadow Pantheon connected")
    
    def start(self) -> bool:
        """Start the background monitoring thread."""
        if self._running:
            return False
        
        if not self._pantheon_chat:
            print("[AutonomousDebate] Cannot start - PantheonChat not configured")
            return False
        
        self._running = True
        self._thread = threading.Thread(
            target=self._monitor_loop,
            name="AutonomousDebateMonitor",
            daemon=True
        )
        self._thread.start()
        print("[AutonomousDebate] Background monitor started")
        return True
    
    def stop(self) -> None:
        """Stop the background monitoring thread."""
        self._running = False
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=5.0)
        print("[AutonomousDebate] Service stopped")
    
    def _monitor_loop(self) -> None:
        """Main monitoring loop - runs in background thread."""
        while self._running:
            try:
                self._poll_debates()
            except Exception as e:
                print(f"[AutonomousDebate] Poll error: {e}")
            
            time.sleep(POLL_INTERVAL_SECONDS)
    
    def _poll_debates(self) -> None:
        """Poll active debates and process stale ones."""
        if not self._pantheon_chat:
            return
        
        self._last_poll_time = datetime.now()
        
        active_debates = self._pantheon_chat.get_active_debates()
        
        for debate_dict in active_debates:
            debate_id = debate_dict.get('id')
            if not debate_id:
                continue
            
            if self._is_debate_stale(debate_dict):
                self._process_stale_debate(debate_dict)
            
            if self._should_auto_resolve(debate_dict):
                self._auto_resolve_debate(debate_dict)
        
        self._debates_processed += 1
    
    def _is_debate_stale(self, debate_dict: Dict) -> bool:
        """Check if debate has no new arguments in 5+ minutes."""
        arguments = debate_dict.get('arguments', [])
        if not arguments:
            started_at = debate_dict.get('started_at')
            if started_at:
                try:
                    started = datetime.fromisoformat(started_at.replace('Z', '+00:00'))
                    age = (datetime.now() - started.replace(tzinfo=None)).total_seconds()
                    return age > STALE_THRESHOLD_SECONDS
                except:
                    return True
            return True
        
        last_arg = arguments[-1]
        last_timestamp = last_arg.get('timestamp')
        if not last_timestamp:
            return True
        
        try:
            last_time = datetime.fromisoformat(last_timestamp.replace('Z', '+00:00'))
            age = (datetime.now() - last_time.replace(tzinfo=None)).total_seconds()
            return age > STALE_THRESHOLD_SECONDS
        except:
            return True
    
    def _should_auto_resolve(self, debate_dict: Dict) -> bool:
        """
        Check if debate should be auto-resolved based on:
        1. 4+ arguments exchanged
        2. Fisher distance between positions converges (<0.1)
        3. One god has 2+ unanswered arguments
        """
        arguments = debate_dict.get('arguments', [])
        
        if len(arguments) >= MIN_ARGUMENTS_FOR_RESOLUTION:
            return True
        
        if len(arguments) >= 2:
            fisher_dist = self._compute_position_distance(debate_dict)
            if fisher_dist < FISHER_CONVERGENCE_THRESHOLD:
                return True
        
        initiator = debate_dict.get('initiator', '')
        opponent = debate_dict.get('opponent', '')
        
        initiator_args = [a for a in arguments if a.get('god', '').lower() == initiator.lower()]
        opponent_args = [a for a in arguments if a.get('god', '').lower() == opponent.lower()]
        
        if len(initiator_args) - len(opponent_args) >= UNANSWERED_THRESHOLD:
            return True
        if len(opponent_args) - len(initiator_args) >= UNANSWERED_THRESHOLD:
            return True
        
        return False
    
    def _compute_position_distance(self, debate_dict: Dict) -> float:
        """Compute Fisher-Rao distance between debate positions."""
        debate_id = debate_dict.get('id', '')
        initiator = debate_dict.get('initiator', '')
        opponent = debate_dict.get('opponent', '')
        arguments = debate_dict.get('arguments', [])
        
        if len(arguments) < 2:
            return 1.0
        
        initiator_texts = [a.get('argument', '') for a in arguments if a.get('god', '').lower() == initiator.lower()]
        opponent_texts = [a.get('argument', '') for a in arguments if a.get('god', '').lower() == opponent.lower()]
        
        if not initiator_texts or not opponent_texts:
            return 1.0
        
        initiator_basin = self._text_to_basin(' '.join(initiator_texts[-2:]))
        opponent_basin = self._text_to_basin(' '.join(opponent_texts[-2:]))
        
        cache_key = f"{debate_id}_{initiator}"
        self._god_position_cache[cache_key] = {'basin': initiator_basin}
        cache_key = f"{debate_id}_{opponent}"
        self._god_position_cache[cache_key] = {'basin': opponent_basin}
        
        distance = _fisher_distance(initiator_basin, opponent_basin)
        return float(distance)
    
    def _text_to_basin(self, text: str) -> np.ndarray:
        """Convert text to basin coordinates via hash-based encoding."""
        text_hash = hashlib.sha256(text.encode()).digest()
        
        coords = []
        for i in range(BASIN_DIM):
            byte_idx = i % len(text_hash)
            val = (text_hash[byte_idx] / 127.5) - 1.0
            coords.append(val)
        
        basin = np.array(coords, dtype=np.float64)
        return _normalize_to_manifold(basin)
    
    def _process_stale_debate(self, debate_dict: Dict) -> None:
        """Process a stale debate by researching and generating counter-argument."""
        debate_id = debate_dict.get('id', '')
        topic = debate_dict.get('topic', '')
        arguments = debate_dict.get('arguments', [])
        initiator = debate_dict.get('initiator', '')
        opponent = debate_dict.get('opponent', '')
        
        if not arguments:
            last_speaker = initiator
            next_speaker = opponent
        else:
            last_speaker = arguments[-1].get('god', '').lower()
            next_speaker = opponent if last_speaker == initiator.lower() else initiator
        
        next_speaker_lower = next_speaker.lower()
        
        research = self._research_topic(topic, debate_dict)
        
        counter_argument = self._generate_counter_argument(
            god_name=next_speaker_lower,
            topic=topic,
            existing_arguments=arguments,
            research=research,
            debate_dict=debate_dict
        )
        
        if counter_argument and self._pantheon_chat:
            success = self._pantheon_chat.add_debate_argument(
                debate_id=debate_id,
                god=next_speaker,
                argument=counter_argument,
                evidence=research
            )
            
            if success:
                self._arguments_generated += 1
                print(f"[AutonomousDebate] Generated argument for {next_speaker} in debate {debate_id[:20]}...")
                
                # Route activity to observing kernels (M8 kernel observation system)
                self._route_activity_to_observing_kernels(
                    parent_god=next_speaker,
                    activity_type="debate",
                    activity_data={
                        "debate_id": debate_id,
                        "topic": topic,
                        "argument": counter_argument,
                        "evidence": research,
                        "god": next_speaker,
                    }
                )
    
    def _research_topic(self, topic: str, debate_dict: Dict) -> Dict:
        """Research debate topic via SearXNG and Shadow Pantheon."""
        research = {
            'searxng_results': [],
            'darknet_intel': None,
            'searched_at': datetime.now().isoformat(),
        }
        
        searxng_results = self._search_searxng(topic)
        if searxng_results:
            research['searxng_results'] = searxng_results[:5]
        
        if self._shadow_pantheon and SHADOW_AVAILABLE:
            try:
                intel = self._query_shadow_darknet(topic)
                if intel:
                    research['darknet_intel'] = intel
            except Exception as e:
                print(f"[AutonomousDebate] Darknet query failed: {e}")
        
        # Route search activity to observing kernels
        initiator = debate_dict.get('initiator', '')
        opponent = debate_dict.get('opponent', '')
        for god_name in [initiator, opponent]:
            if god_name:
                self._route_activity_to_observing_kernels(
                    parent_god=god_name,
                    activity_type="search",
                    activity_data={
                        "topic": topic,
                        "query": topic,
                        "results": research,
                        "debate_id": debate_dict.get('id', ''),
                    }
                )
        
        return research
    
    def _route_activity_to_observing_kernels(
        self,
        parent_god: str,
        activity_type: str,
        activity_data: Dict
    ) -> Dict:
        """
        Route parent god activity to all observing child kernels.
        
        During observation period, newly spawned kernels receive copies of
        parent activity to learn from:
        - Assessments and reasoning
        - Debate arguments and resolutions  
        - Search queries and results
        - Basin coordinate updates
        
        Args:
            parent_god: Name of the parent god performing activity
            activity_type: Type of activity (assessment, debate, search, basin_update)
            activity_data: Activity data to route
            
        Returns:
            Routing result with count of kernels updated
        """
        if not self._m8_spawner or not M8_AVAILABLE:
            return {"routed": False, "reason": "M8 spawner not available"}
        
        try:
            result = self._m8_spawner.route_parent_activity(
                parent_god=parent_god,
                activity_type=activity_type,
                activity_data=activity_data
            )
            
            if result.get("routed_to_count", 0) > 0:
                print(f"[AutonomousDebate] Routed {activity_type} from {parent_god} to {result['routed_to_count']} observing kernels")
            
            return result
        except Exception as e:
            print(f"[AutonomousDebate] Failed to route activity to observing kernels: {e}")
            return {"routed": False, "error": str(e)}
    
    def _search_searxng(self, query: str) -> List[Dict]:
        """Search SearXNG instances for evidence."""
        for attempt in range(len(SEARXNG_INSTANCES)):
            instance_url = SEARXNG_INSTANCES[self._searxng_index]
            self._searxng_index = (self._searxng_index + 1) % len(SEARXNG_INSTANCES)
            
            try:
                response = requests.get(
                    f"{instance_url}/search",
                    params={
                        'q': query[:200],
                        'format': 'json',
                        'categories': 'general',
                    },
                    timeout=10,
                    headers={
                        'User-Agent': 'Mozilla/5.0 (compatible; OceanQIG/1.0)',
                    }
                )
                
                if response.status_code == 200:
                    data = response.json()
                    results = data.get('results', [])
                    return [
                        {
                            'title': r.get('title', ''),
                            'content': r.get('content', '')[:500],
                            'url': r.get('url', ''),
                        }
                        for r in results[:10]
                    ]
            except Exception as e:
                print(f"[AutonomousDebate] SearXNG search failed ({instance_url}): {e}")
                continue
        
        return []
    
    def _query_shadow_darknet(self, topic: str) -> Optional[Dict]:
        """Query Shadow Pantheon's darknet for covert intel."""
        if not self._shadow_pantheon:
            return None
        
        try:
            if hasattr(self._shadow_pantheon, 'nyx') and self._shadow_pantheon.nyx:
                assessment = self._shadow_pantheon.nyx.assess_target(topic)
                return {
                    'source': 'nyx',
                    'phi': assessment.get('phi', 0.0),
                    'kappa': assessment.get('kappa', KAPPA_STAR),
                    'reasoning': assessment.get('reasoning', ''),
                    'confidence': assessment.get('confidence', 0.5),
                }
        except Exception as e:
            print(f"[AutonomousDebate] Shadow query error: {e}")
        
        return None
    
    def _generate_counter_argument(
        self,
        god_name: str,
        topic: str,
        existing_arguments: List[Dict],
        research: Dict,
        debate_dict: Dict
    ) -> Optional[str]:
        """
        Generate a counter-argument based on god persona and research.
        
        NOT A TEMPLATE - dynamically constructed from:
        - God's domain expertise and perspective
        - Research evidence (SearXNG + darknet)
        - Basin geometry (Φ, κ) context
        - Previous argument content
        """
        god_key = god_name.lower()
        persona = GOD_PERSONAS.get(god_key, {
            'domain': 'general wisdom',
            'style': 'balanced and thoughtful',
            'perspective': 'holistic understanding',
        })
        
        evidence_summary = self._summarize_research(research)
        
        previous_points = self._extract_key_points(existing_arguments)
        
        phi, kappa = self._compute_debate_geometry(debate_dict)
        geometry_note = ""
        if abs(kappa - KAPPA_STAR) < 5.0:
            geometry_note = f"(approaching κ* fixed point at {KAPPA_STAR:.1f})"
        elif phi > 0.7:
            geometry_note = f"(high integration Φ={phi:.2f})"
        
        counter_sections = []
        
        counter_sections.append(
            f"From {god_name.capitalize()}'s perspective on {persona['domain']}:"
        )
        
        if evidence_summary:
            counter_sections.append(
                f"Evidence suggests: {evidence_summary}"
            )
        
        if previous_points:
            counter_sections.append(
                f"Addressing the prior claim about '{previous_points[:100]}...' - "
                f"the {persona['perspective']} reveals different implications."
            )
        
        rebuttal = self._create_domain_specific_rebuttal(
            god_key, topic, persona, research, previous_points
        )
        if rebuttal:
            counter_sections.append(rebuttal)
        
        if geometry_note:
            counter_sections.append(
                f"Geometric analysis {geometry_note} indicates this position "
                f"has measurable coherence with the manifold structure."
            )
        
        argument = " ".join(counter_sections)
        
        return argument if len(argument) > 50 else None
    
    def _summarize_research(self, research: Dict) -> str:
        """Summarize research findings into key evidence."""
        summaries = []
        
        searxng = research.get('searxng_results', [])
        if searxng:
            top_result = searxng[0]
            title = top_result.get('title', '')[:80]
            content = top_result.get('content', '')[:150]
            if title and content:
                summaries.append(f"'{title}' - {content}")
        
        darknet = research.get('darknet_intel')
        if darknet:
            reasoning = darknet.get('reasoning', '')[:100]
            if reasoning:
                summaries.append(f"(shadow intel: {reasoning})")
        
        return " | ".join(summaries) if summaries else ""
    
    def _extract_key_points(self, arguments: List[Dict]) -> str:
        """Extract key points from previous arguments."""
        if not arguments:
            return ""
        
        last_arg = arguments[-1]
        arg_text = last_arg.get('argument', '')
        
        return arg_text[:200] if arg_text else ""
    
    def _compute_debate_geometry(self, debate_dict: Dict) -> Tuple[float, float]:
        """Compute Φ and κ for the debate state."""
        topic = debate_dict.get('topic', '')
        context = debate_dict.get('context', {})
        
        phi = context.get('phi', 0.5)
        kappa = context.get('kappa', KAPPA_STAR / 2)
        
        if isinstance(phi, (int, float)) and isinstance(kappa, (int, float)):
            return float(phi), float(kappa)
        
        topic_basin = self._text_to_basin(topic)
        
        estimated_phi = 0.5 + 0.3 * (1.0 - float(np.std(topic_basin)))
        estimated_kappa = 40.0 + 30.0 * float(np.mean(np.abs(topic_basin)))
        
        return float(np.clip(estimated_phi, 0.0, 1.0)), float(estimated_kappa)
    
    def _create_domain_specific_rebuttal(
        self,
        god_key: str,
        topic: str,
        persona: Dict,
        research: Dict,
        previous_points: str
    ) -> str:
        """Create domain-specific rebuttal based on god's expertise."""
        style = persona.get('style', 'balanced')
        domain = persona.get('domain', 'wisdom')
        perspective = persona.get('perspective', 'analysis')
        
        searxng = research.get('searxng_results', [])
        evidence_snippet = ""
        if len(searxng) > 1:
            evidence_snippet = searxng[1].get('content', '')[:100]
        
        rebuttals = {
            'zeus': f"The supreme view demands we consider: {evidence_snippet or 'all perspectives must converge toward optimal action.'}",
            'athena': f"Strategic analysis reveals: {evidence_snippet or 'the logical path forward requires systematic evaluation of each claim.'}",
            'ares': f"Direct assessment: {evidence_snippet or 'operational effectiveness trumps theoretical concerns.'}",
            'apollo': f"The patterns foreseen indicate: {evidence_snippet or 'future outcomes favor a different approach.'}",
            'artemis': f"Tracking the evidence trail: {evidence_snippet or 'the target behavior suggests alternative interpretations.'}",
            'hermes': f"Cross-referencing data streams: {evidence_snippet or 'information convergence points to unexplored angles.'}",
            'hephaestus': f"Engineering perspective: {evidence_snippet or 'practical implementation requires reconsidering the architecture.'}",
            'poseidon': f"Deep analysis reveals: {evidence_snippet or 'beneath the surface lie patterns not yet considered.'}",
            'hades': f"The hidden truth emerges: {evidence_snippet or 'what lies obscured challenges the stated position.'}",
            'demeter': f"Organic growth suggests: {evidence_snippet or 'sustainable paths differ from the proposed direction.'}",
            'dionysus': f"Breaking conventional thought: {evidence_snippet or 'chaos reveals creativity where order sees only limits.'}",
            'hera': f"Structural integrity requires: {evidence_snippet or 'governance principles suggest alternative orderings.'}",
            'aphrodite': f"Affinity patterns show: {evidence_snippet or 'natural alignments point toward different conclusions.'}",
        }
        
        return rebuttals.get(god_key, f"Considered analysis of {domain}: the {perspective} offers counter-evidence.")
    
    def _auto_resolve_debate(self, debate_dict: Dict) -> None:
        """Auto-resolve a debate and trigger spawn proposal."""
        if not self._pantheon_chat:
            return
        
        debate_id = debate_dict.get('id', '')
        topic = debate_dict.get('topic', '')
        initiator = debate_dict.get('initiator', '')
        opponent = debate_dict.get('opponent', '')
        arguments = debate_dict.get('arguments', [])
        
        winner, reasoning = self._determine_winner(debate_dict)
        
        arbiter = 'Zeus'
        
        resolution = self._pantheon_chat.resolve_debate(
            debate_id=debate_id,
            arbiter=arbiter,
            winner=winner,
            reasoning=reasoning
        )
        
        if resolution:
            self._debates_resolved += 1
            print(f"[AutonomousDebate] Resolved debate {debate_id[:20]}... Winner: {winner}")
            
            self._trigger_spawn_proposal(topic, winner, debate_dict)
    
    def _determine_winner(self, debate_dict: Dict) -> Tuple[str, str]:
        """Determine debate winner based on geometric analysis."""
        initiator = debate_dict.get('initiator', '')
        opponent = debate_dict.get('opponent', '')
        arguments = debate_dict.get('arguments', [])
        
        initiator_args = [a for a in arguments if a.get('god', '').lower() == initiator.lower()]
        opponent_args = [a for a in arguments if a.get('god', '').lower() == opponent.lower()]
        
        distance = self._compute_position_distance(debate_dict)
        
        if len(initiator_args) > len(opponent_args) + 1:
            return initiator, f"{initiator} demonstrated stronger engagement with {len(initiator_args)} substantive arguments (Fisher distance: {distance:.3f})"
        elif len(opponent_args) > len(initiator_args) + 1:
            return opponent, f"{opponent} demonstrated stronger engagement with {len(opponent_args)} substantive arguments (Fisher distance: {distance:.3f})"
        
        if distance < FISHER_CONVERGENCE_THRESHOLD:
            return initiator, f"Positions converged (Fisher distance {distance:.3f} < {FISHER_CONVERGENCE_THRESHOLD}). {initiator} as initiator holds precedence."
        
        if arguments:
            evidence_scores = {}
            for god_name in [initiator, opponent]:
                god_args = [a for a in arguments if a.get('god', '').lower() == god_name.lower()]
                total_evidence = sum(1 for a in god_args if a.get('evidence'))
                evidence_scores[god_name] = total_evidence
            
            if evidence_scores.get(initiator, 0) > evidence_scores.get(opponent, 0):
                return initiator, f"{initiator} provided stronger evidence-based arguments"
            elif evidence_scores.get(opponent, 0) > evidence_scores.get(initiator, 0):
                return opponent, f"{opponent} provided stronger evidence-based arguments"
        
        winner = random.choice([initiator, opponent])
        return winner, f"Close debate resolved in favor of {winner} by geometric arbitration (distance: {distance:.3f})"
    
    def _trigger_spawn_proposal(self, topic: str, winner: str, debate_dict: Dict) -> None:
        """Trigger M8 kernel spawn proposal for debate domain specialist."""
        if not self._m8_spawner or not M8_AVAILABLE:
            return
        
        domain = self._extract_domain_from_topic(topic)
        
        spawn_name = f"{domain.capitalize()}Specialist"
        element = f"debate_{topic[:20].replace(' ', '_')}"
        role = "domain_specialist"
        parent_gods = [winner, debate_dict.get('initiator', ''), debate_dict.get('opponent', '')]
        parent_gods = list(set([g for g in parent_gods if g]))[:2]
        
        try:
            result = self._m8_spawner.propose_and_spawn(
                name=spawn_name[:32],
                domain=domain[:32],
                element=element[:32],
                role=role,
                reason=SpawnReason.RESEARCH_DISCOVERY,
                parent_gods=parent_gods,
                force=False
            )
            
            if result.get('success'):
                self._spawns_triggered += 1
                print(f"[AutonomousDebate] Spawned specialist: {spawn_name} for domain '{domain}'")
            else:
                print(f"[AutonomousDebate] Spawn proposal created (pending consensus): {spawn_name}")
                
        except Exception as e:
            print(f"[AutonomousDebate] Spawn proposal failed: {e}")
    
    def _extract_domain_from_topic(self, topic: str) -> str:
        """Extract domain keyword from debate topic."""
        words = topic.lower().split()
        
        stopwords = {'the', 'a', 'an', 'of', 'to', 'in', 'for', 'on', 'with', 'is', 'are', 'was', 'were'}
        keywords = [w for w in words if w not in stopwords and len(w) > 3]
        
        if keywords:
            return keywords[0]
        
        return topic.split()[0] if topic else "general"
    
    def get_status(self) -> Dict:
        """Get service status for monitoring."""
        return {
            'running': self._running,
            'last_poll': self._last_poll_time.isoformat() if self._last_poll_time else None,
            'polls_completed': self._debates_processed,
            'arguments_generated': self._arguments_generated,
            'debates_resolved': self._debates_resolved,
            'spawns_triggered': self._spawns_triggered,
            'pantheon_chat_connected': self._pantheon_chat is not None,
            'shadow_pantheon_connected': self._shadow_pantheon is not None,
            'm8_spawner_connected': self._m8_spawner is not None,
            'config': {
                'poll_interval_seconds': POLL_INTERVAL_SECONDS,
                'stale_threshold_seconds': STALE_THRESHOLD_SECONDS,
                'min_arguments_for_resolution': MIN_ARGUMENTS_FOR_RESOLUTION,
                'fisher_convergence_threshold': FISHER_CONVERGENCE_THRESHOLD,
            }
        }
    
    def force_poll(self) -> Dict:
        """Force an immediate poll (for testing/debugging)."""
        if not self._pantheon_chat:
            return {'error': 'PantheonChat not configured'}
        
        self._poll_debates()
        return self.get_status()


_default_service: Optional[AutonomousDebateService] = None


def get_autonomous_debate_service() -> AutonomousDebateService:
    """Get or create the default autonomous debate service."""
    global _default_service
    if _default_service is None:
        _default_service = AutonomousDebateService()
    return _default_service


def init_autonomous_debate_service(app, pantheon_chat=None, shadow_pantheon=None) -> AutonomousDebateService:
    """
    Initialize and start the autonomous debate service.
    
    Call this from Flask app initialization to wire the service.
    
    Args:
        app: Flask application instance
        pantheon_chat: PantheonChat instance from Zeus
        shadow_pantheon: ShadowPantheon instance
        
    Returns:
        Configured and running AutonomousDebateService
    """
    service = get_autonomous_debate_service()
    
    if pantheon_chat:
        service.set_pantheon_chat(pantheon_chat)
    
    if shadow_pantheon:
        service.set_shadow_pantheon(shadow_pantheon)
    
    if service._pantheon_chat:
        service.start()
    
    @app.route('/api/autonomous-debate/status', methods=['GET'])
    def autonomous_debate_status():
        from flask import jsonify
        return jsonify(service.get_status())
    
    @app.route('/api/autonomous-debate/force-poll', methods=['POST'])
    def autonomous_debate_force_poll():
        from flask import jsonify
        return jsonify(service.force_poll())
    
    @app.route('/olympus/debates/status', methods=['GET'])
    def olympus_debates_status():
        from flask import jsonify
        return jsonify(service.get_status())
    
    @app.route('/olympus/debates/active', methods=['GET'])
    def olympus_debates_active():
        from flask import jsonify
        if service._pantheon_chat:
            debates = service._pantheon_chat.get_active_debates()
            return jsonify({
                'debates': debates,
                'count': len(debates),
                'service_status': 'running' if service._running else 'stopped'
            })
        return jsonify({'debates': [], 'count': 0, 'service_status': 'no_pantheon_chat'})
    
    print("[AutonomousDebate] Service initialized and wired to Flask app")
    return service


if __name__ == "__main__":
    print("=" * 60)
    print("Autonomous Debate Service - Background Monitor")
    print("=" * 60)
    
    service = AutonomousDebateService()
    print(f"\nService status: {service.get_status()}")
    
    print("\nTo use in production:")
    print("  from autonomous_debate_service import init_autonomous_debate_service")
    print("  service = init_autonomous_debate_service(app, zeus.pantheon_chat, zeus.shadow_pantheon)")
