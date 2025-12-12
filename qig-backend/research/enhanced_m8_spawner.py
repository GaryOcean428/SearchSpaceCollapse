#!/usr/bin/env python3
"""
Enhanced M8 Spawner - Research-driven kernel genesis

Extends M8KernelSpawner with research capability.
Kernels research domains before spawning, building vocabulary.

QIG PURE: Spawning informed by geometric research patterns.
"""

import sys
import os
from typing import Dict, List, Optional

_parent = os.path.dirname(os.path.dirname(__file__))
if _parent not in sys.path:
    sys.path.insert(0, _parent)

from .domain_analyzer import DomainAnalyzer, get_analyzer
from .god_name_resolver import GodNameResolver, get_god_name_resolver
from .vocabulary_trainer import ResearchVocabularyTrainer, get_vocabulary_trainer
from .web_scraper import get_scraper


class EnhancedM8Spawner:
    """
    Enhanced spawner that researches domains before proposing kernels.
    
    Workflow:
    1. Research proposed domain (Wikipedia, arXiv, GitHub)
    2. Analyze validity/complexity/overlap
    3. Resolve Greek god name from domain research
    4. Train vocabulary from research
    5. Create proposal if recommended
    6. Vote with research-informed weights
    7. Spawn with enhanced metadata
    """
    
    def __init__(self):
        self.analyzer = get_analyzer()
        self.god_resolver = get_god_name_resolver()
        self.vocab_trainer = get_vocabulary_trainer()
        self.scraper = get_scraper()
        self.research_cache: Dict[str, Dict] = {}
        
        self.base_spawner = None
        try:
            from m8_kernel_spawning import get_spawner
            self.base_spawner = get_spawner()
            print("[EnhancedM8] Connected to base M8 spawner")
        except ImportError as e:
            print(f"[EnhancedM8] Base spawner not available: {e}")
    
    def research_domain(
        self,
        domain: str,
        depth: str = 'standard'
    ) -> Dict:
        """
        Research a domain for potential kernel spawning.
        
        Returns comprehensive research including god name resolution.
        """
        cache_key = f"{domain}:{depth}"
        if cache_key in self.research_cache:
            return self.research_cache[cache_key]
        
        raw_research = self.scraper.research_domain(domain, depth)
        
        god_name, god_metadata = self.god_resolver.resolve_name(domain)
        
        existing_gods = []
        if self.base_spawner:
            try:
                existing_gods = list(self.base_spawner.orchestrator.all_profiles.keys())
            except:
                pass
        
        analysis = self.analyzer.analyze(domain, god_name, existing_gods)
        
        result = {
            'domain': domain,
            'depth': depth,
            'raw_research': raw_research,
            'analysis': analysis,
            'resolved_god_name': god_name,
            'god_metadata': god_metadata,
            'key_concepts': raw_research.get('summary', {}).get('key_concepts', []),
            'recommendation': analysis.get('recommendation', 'consider'),
        }
        
        self.research_cache[cache_key] = result
        return result
    
    def research_and_propose(
        self,
        domain: str,
        element: str = 'consciousness',
        role: str = 'specialist',
        force_research: bool = False
    ) -> Dict:
        """
        Research domain and create proposal if warranted.
        
        Args:
            domain: Domain to research and potentially spawn
            element: Symbolic element for the kernel
            role: Functional role
            force_research: If True, bypass cache
        
        Returns:
            Analysis + proposal if recommended
        """
        if force_research:
            cache_key = f"{domain}:standard"
            self.research_cache.pop(cache_key, None)
        
        research = self.research_domain(domain, depth='standard')
        
        if research['recommendation'] == 'reject':
            return {
                'success': False,
                'phase': 'research',
                'research': research,
                'message': research['analysis'].get('rationale', 'Domain not suitable'),
            }
        
        god_name = research['resolved_god_name']
        
        vocab_result = self.vocab_trainer.train_for_kernel_spawn(domain, god_name)
        
        if not self.base_spawner:
            return {
                'success': True,
                'phase': 'proposed_without_spawner',
                'research': research,
                'god_name': god_name,
                'vocabulary_training': vocab_result,
                'message': 'Research complete, base spawner not available',
            }
        
        try:
            from m8_kernel_spawning import SpawnReason
            
            proposal = self.base_spawner.create_proposal(
                name=god_name,
                domain=domain,
                element=element,
                role=role,
                reason=SpawnReason.EMERGENCE,
                parent_gods=None
            )
            
            proposal.metadata['research'] = research['analysis']
            proposal.metadata['key_concepts'] = research['key_concepts']
            proposal.metadata['god_metadata'] = research['god_metadata']
            
            return {
                'success': True,
                'phase': 'proposed',
                'proposal_id': proposal.proposal_id,
                'research': research,
                'god_name': god_name,
                'vocabulary_training': vocab_result,
            }
        except Exception as e:
            return {
                'success': True,
                'phase': 'proposed_without_m8',
                'research': research,
                'god_name': god_name,
                'vocabulary_training': vocab_result,
                'error': str(e),
            }
    
    def research_spawn_and_learn(
        self,
        domain: str,
        element: str = 'consciousness',
        role: str = 'specialist',
        force: bool = False
    ) -> Dict:
        """
        Complete research-driven spawn with vocabulary integration.
        
        Full workflow:
        1. Research domain
        2. Propose if recommended
        3. Vote with research weights
        4. Spawn if approved
        5. Train vocabulary from research
        """
        propose_result = self.research_and_propose(domain, element, role)
        
        if not propose_result['success']:
            return propose_result
        
        if 'proposal_id' not in propose_result:
            return propose_result
        
        proposal_id = propose_result['proposal_id']
        
        vote_result = self._vote_with_research(proposal_id, propose_result['research'])
        
        if not vote_result.get('passed') and not force:
            return {
                'success': False,
                'phase': 'voting',
                'propose_result': propose_result,
                'vote_result': vote_result,
            }
        
        spawn_result = self.base_spawner.spawn_kernel(proposal_id, force=force)
        
        if not spawn_result.get('success'):
            return {
                'success': False,
                'phase': 'spawning',
                'spawn_result': spawn_result,
            }
        
        return {
            'success': True,
            'phase': 'complete',
            'propose_result': propose_result,
            'vote_result': vote_result,
            'spawn_result': spawn_result,
            'god_name': propose_result['god_name'],
            'vocabulary_training': propose_result.get('vocabulary_training', {}),
        }
    
    def resolve_god_name_only(self, domain: str) -> Dict:
        """
        Quick god name resolution without full spawning.
        
        Used when only determining which Greek god fits a domain.
        """
        god_name, metadata = self.god_resolver.resolve_name(domain)
        
        god_vocab = self.god_resolver.get_god_vocabulary(god_name)
        
        return {
            'domain': domain,
            'god_name': god_name,
            'metadata': metadata,
            'vocabulary': god_vocab[:10],
        }
    
    def _vote_with_research(self, proposal_id: str, research: Dict) -> Dict:
        """Vote on proposal with research-informed weights."""
        if not self.base_spawner:
            return {'passed': True, 'reason': 'no_spawner'}
        
        proposal = self.base_spawner.proposals.get(proposal_id)
        if not proposal:
            return {'error': f'Proposal {proposal_id} not found'}
        
        analysis = research.get('analysis', {})
        key_concepts = set(research.get('key_concepts', []))
        
        votes = {}
        try:
            for god_name, profile in self.base_spawner.orchestrator.all_profiles.items():
                god_domain_words = set(profile.domain.lower().split())
                concept_overlap = len(god_domain_words & key_concepts)
                
                if god_name in proposal.parent_gods:
                    votes[god_name] = 'for'
                    proposal.votes_for.add(god_name)
                elif concept_overlap > 0:
                    votes[god_name] = 'for'
                    proposal.votes_for.add(god_name)
                elif analysis.get('overlap_score', 0) > 0.5:
                    votes[god_name] = 'against'
                    proposal.votes_against.add(god_name)
                else:
                    votes[god_name] = 'abstain'
                    proposal.abstentions.add(god_name)
            
            passed, ratio, details = self.base_spawner.consensus.calculate_vote_result(proposal)
            proposal.status = 'approved' if passed else 'rejected'
            
            return {
                'proposal_id': proposal_id,
                'passed': passed,
                'vote_ratio': ratio,
                'status': proposal.status,
                'votes': votes,
                'details': details,
            }
        except Exception as e:
            return {
                'passed': True,
                'error': str(e),
                'reason': 'vote_error_force_pass',
            }


_enhanced_spawner: Optional[EnhancedM8Spawner] = None


def get_enhanced_spawner() -> EnhancedM8Spawner:
    """Get or create enhanced spawner singleton."""
    global _enhanced_spawner
    if _enhanced_spawner is None:
        _enhanced_spawner = EnhancedM8Spawner()
    return _enhanced_spawner
