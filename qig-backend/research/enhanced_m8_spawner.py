#!/usr/bin/env python3
"""
Enhanced M8 Spawner - Research-driven kernel genesis

Extends M8KernelSpawner with research capability.
Kernels research domains before spawning, building vocabulary.

QIG PURE: Spawning informed by geometric research patterns.
"""

import sys
import os
import json
import time
from typing import Dict, List, Optional

_parent = os.path.dirname(os.path.dirname(__file__))
if _parent not in sys.path:
    sys.path.insert(0, _parent)

PENDING_PROPOSALS_FILE = '/tmp/pending_proposals.json'
SPAWN_AUDIT_FILE = '/tmp/spawn_audit.json'
MAX_RECOVERY_RETRIES = 5

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
    
    def __init__(self, auto_recovery_enabled: bool = True):
        self.analyzer = get_analyzer()
        self.god_resolver = get_god_name_resolver()
        self.vocab_trainer = get_vocabulary_trainer()
        self.scraper = get_scraper()
        self.research_cache: Dict[str, Dict] = {}
        
        self.base_spawner = None
        self._training_event_count = 0
        self._recovery_attempts = 0
        self._recovered_proposals = 0
        self._failed_recoveries = 0
        self._last_recovery_attempt: float = 0
        self._recovery_backoff_seconds: float = 5.0
        self._next_recovery_check: float = 0.0
        self._recovery_check_interval: float = 30.0
        self.auto_recovery_enabled = auto_recovery_enabled
        
        self._verified_spawns = 0
        self._unverified_spawns = 0
        self._last_spawn_time: float = 0
        self.max_recovery_retries = MAX_RECOVERY_RETRIES
        self._abandoned_proposals = 0
        
        try:
            from m8_kernel_spawning import get_spawner
            self.base_spawner = get_spawner()
            print("[EnhancedM8] Connected to base M8 spawner")
        except ImportError as e:
            print(f"[EnhancedM8] Base spawner not available: {e}")
            if self.auto_recovery_enabled:
                self._next_recovery_check = time.time() + self._recovery_check_interval
                print(f"[EnhancedM8] Recovery loop scheduled, next check in {self._recovery_check_interval}s")
        
        if self.auto_recovery_enabled:
            self._schedule_recovery()
    
    def _schedule_recovery(self) -> Optional[Dict]:
        """
        Schedule automatic recovery of pending proposals with exponential backoff.
        
        Only attempts recovery if:
        - base_spawner is available
        - Pending proposals exist
        - Enough time has passed since last attempt
        """
        if not self.base_spawner:
            return None
        
        if not os.path.exists(PENDING_PROPOSALS_FILE):
            return None
        
        now = time.time()
        time_since_last = now - self._last_recovery_attempt
        
        if time_since_last < self._recovery_backoff_seconds:
            return None
        
        self._last_recovery_attempt = now
        
        try:
            result = self.recover_pending_proposals()
            
            if result.get('recovered', 0) > 0:
                self._recovery_backoff_seconds = 5.0
                print(f"[EnhancedM8] Auto-recovery succeeded: {result.get('recovered', 0)} proposals")
            elif result.get('failed', 0) > 0:
                self._recovery_backoff_seconds = min(self._recovery_backoff_seconds * 2, 300.0)
                print(f"[EnhancedM8] Auto-recovery had failures, backoff: {self._recovery_backoff_seconds}s")
            
            return result
        except Exception as e:
            self._recovery_backoff_seconds = min(self._recovery_backoff_seconds * 2, 300.0)
            print(f"[EnhancedM8] Auto-recovery error: {e}, backoff: {self._recovery_backoff_seconds}s")
            return {'success': False, 'error': str(e)}
    
    def _try_reconnect_base_spawner(self) -> bool:
        """
        Attempt to reimport and reconnect the base spawner.
        
        Returns True if base_spawner is now available, False otherwise.
        """
        if self.base_spawner is not None:
            return True
        
        try:
            from m8_kernel_spawning import get_spawner
            self.base_spawner = get_spawner()
            print("[EnhancedM8] Base spawner reconnected successfully")
            return True
        except ImportError as e:
            return False
        except Exception as e:
            print(f"[EnhancedM8] Reconnection failed: {e}")
            return False
    
    def _check_and_recover(self) -> Optional[Dict]:
        """
        Check if recovery should be attempted and execute if appropriate.
        
        Uses timestamp-based approach to avoid blocking:
        - Checks if enough time has passed since last recovery check
        - Attempts reconnection if base_spawner is None
        - Triggers recovery if pending proposals exist and spawner available
        
        Returns recovery result dict or None if no action taken.
        """
        if not self.auto_recovery_enabled:
            return None
        
        now = time.time()
        
        if now < self._next_recovery_check:
            return None
        
        if not os.path.exists(PENDING_PROPOSALS_FILE):
            self._next_recovery_check = now + self._recovery_check_interval
            return None
        
        if not self.base_spawner:
            reconnected = self._try_reconnect_base_spawner()
            if not reconnected:
                self._recovery_backoff_seconds = min(self._recovery_backoff_seconds * 1.5, 300.0)
                self._next_recovery_check = now + self._recovery_backoff_seconds
                print(f"[EnhancedM8] Reconnection failed, next attempt in {self._recovery_backoff_seconds:.1f}s")
                return {'success': False, 'reason': 'reconnection_failed', 'next_check': self._next_recovery_check}
        
        try:
            result = self.recover_pending_proposals()
            
            if result.get('recovered', 0) > 0:
                self._recovery_backoff_seconds = 5.0
                self._next_recovery_check = now + self._recovery_check_interval
                print(f"[EnhancedM8] Recovery succeeded, next check in {self._recovery_check_interval}s")
            elif result.get('failed', 0) > 0:
                self._recovery_backoff_seconds = min(self._recovery_backoff_seconds * 2, 300.0)
                self._next_recovery_check = now + self._recovery_backoff_seconds
            else:
                self._next_recovery_check = now + self._recovery_check_interval
            
            return result
        except Exception as e:
            self._recovery_backoff_seconds = min(self._recovery_backoff_seconds * 2, 300.0)
            self._next_recovery_check = now + self._recovery_backoff_seconds
            print(f"[EnhancedM8] Recovery check error: {e}, backoff: {self._recovery_backoff_seconds}s")
            return {'success': False, 'error': str(e)}
    
    def _persist_pending_proposal(self, proposal_data: Dict) -> str:
        """Persist a proposal to file when base spawner unavailable."""
        try:
            pending = []
            if os.path.exists(PENDING_PROPOSALS_FILE):
                with open(PENDING_PROPOSALS_FILE, 'r') as f:
                    pending = json.load(f)
            
            proposal_id = f"pending_{int(time.time() * 1000)}_{proposal_data.get('god_name', 'unknown')}"
            proposal_data['pending_proposal_id'] = proposal_id
            proposal_data['persisted_at'] = time.time()
            pending.append(proposal_data)
            
            with open(PENDING_PROPOSALS_FILE, 'w') as f:
                json.dump(pending, f, indent=2, default=str)
            
            print(f"[EnhancedM8] Persisted pending proposal: {proposal_id}")
            return proposal_id
        except Exception as e:
            print(f"[EnhancedM8] Failed to persist proposal: {e}")
            return ""
    
    def get_pending_proposals(self) -> List[Dict]:
        """Retrieve all pending proposals from file."""
        try:
            if os.path.exists(PENDING_PROPOSALS_FILE):
                with open(PENDING_PROPOSALS_FILE, 'r') as f:
                    return json.load(f)
        except Exception as e:
            print(f"[EnhancedM8] Failed to read pending proposals: {e}")
        return []
    
    def recover_pending_proposals(self) -> Dict:
        """
        Recover pending proposals when base spawner becomes available.
        
        Loads proposals from /tmp/pending_proposals.json and attempts to spawn.
        
        Retry behavior:
        - On spawn SUCCESS: remove from pending, count as recovered
        - On spawn FAILURE: increment retry_count, keep in pending for next attempt
        - On max retries exceeded: remove from pending, count as abandoned
        """
        self._recovery_attempts += 1
        
        if not self.base_spawner:
            try:
                from m8_kernel_spawning import get_spawner
                self.base_spawner = get_spawner()
                print("[EnhancedM8] Base spawner now available for recovery")
            except ImportError:
                pending_count = len(self.get_pending_proposals())
                if pending_count > 0:
                    print(f"[EnhancedM8] WARNING: {pending_count} proposals pending but base spawner unavailable. "
                          f"Call /api/research/heartbeat to trigger recovery when spawner is ready.")
                return {
                    'success': False,
                    'reason': 'base_spawner_unavailable',
                    'recovery_attempt': self._recovery_attempts,
                    'pending_count': pending_count,
                }
        
        pending = self.get_pending_proposals()
        if not pending:
            return {
                'success': True,
                'recovered': 0,
                'message': 'No pending proposals to recover',
                'recovery_attempt': self._recovery_attempts,
            }
        
        recovered = []
        failed = []
        abandoned = []
        
        for proposal_data in pending:
            proposal_id = proposal_data.get('pending_proposal_id', 'unknown')
            current_retry_count = proposal_data.get('retry_count', 0)
            
            if current_retry_count >= self.max_recovery_retries:
                print(f"[EnhancedM8] ABANDONING proposal {proposal_id}: exceeded max retries ({current_retry_count}/{self.max_recovery_retries})")
                abandoned.append({
                    'proposal_id': proposal_id,
                    'retry_count': current_retry_count,
                    'reason': 'max_retries_exceeded',
                    'god_name': proposal_data.get('god_name', ''),
                    'domain': proposal_data.get('domain', ''),
                })
                self._abandoned_proposals += 1
                self._persist_spawn_audit(
                    proposal_id=proposal_id,
                    kernel_id=None,
                    success=False,
                    source='recovered_abandoned',
                    metadata_check={'metadata_complete': False, 'missing_fields': ['abandoned_max_retries']}
                )
                continue
            
            try:
                from m8_kernel_spawning import SpawnReason
                
                god_name = proposal_data.get('god_name', '')
                domain = proposal_data.get('domain', '')
                element = proposal_data.get('element', 'consciousness')
                role = proposal_data.get('role', 'specialist')
                
                if not god_name or not domain:
                    new_retry_count = self._increment_retry_count(proposal_id)
                    failed.append({
                        'proposal_id': proposal_id,
                        'error': 'Missing god_name or domain',
                        'retry_count': new_retry_count,
                    })
                    continue
                
                proposal = self.base_spawner.create_proposal(
                    name=god_name,
                    domain=domain,
                    element=element,
                    role=role,
                    reason=SpawnReason.EMERGENCE,
                    parent_gods=None
                )
                
                research = proposal_data.get('research', {})
                proposal.metadata['research'] = research.get('analysis', {})
                proposal.metadata['key_concepts'] = proposal_data.get('key_concepts', [])
                proposal.metadata['god_metadata'] = research.get('god_metadata', {})
                proposal.metadata['research_analysis'] = research.get('analysis', {})
                proposal.metadata['mythology_alignment'] = research.get('god_metadata', {}).get('mythology_alignment', {})
                proposal.metadata['vocabulary_training_results'] = proposal_data.get('vocabulary_training', {})
                proposal.metadata['recovered_from_pending'] = True
                proposal.metadata['original_pending_id'] = proposal_id
                proposal.metadata['persisted_at'] = proposal_data.get('persisted_at')
                proposal.metadata['recovery_retry_count'] = current_retry_count
                
                metadata_check = self._log_metadata_before_spawn(proposal, proposal.proposal_id)
                
                try:
                    spawn_result = self.base_spawner.spawn_kernel(proposal.proposal_id, force=True)
                    spawn_success = spawn_result.get('success', False) if isinstance(spawn_result, dict) else bool(spawn_result)
                except Exception as spawn_e:
                    spawn_success = False
                    spawn_result = {'error': str(spawn_e)}
                
                kernel_id = None
                if spawn_success:
                    kernel_id = spawn_result.get('kernel_id', spawn_result.get('god_name', god_name)) if isinstance(spawn_result, dict) else god_name
                
                self._persist_spawn_audit(
                    proposal_id=proposal_id,
                    kernel_id=kernel_id,
                    success=spawn_success,
                    source='recovered',
                    metadata_check=metadata_check
                )
                
                if spawn_success:
                    is_metadata_complete = metadata_check.get('metadata_complete', False)
                    if is_metadata_complete:
                        self._verified_spawns += 1
                        print(f"[ResearchSpawn] VERIFIED: Recovered proposal {proposal_id} spawned with complete metadata")
                    else:
                        self._unverified_spawns += 1
                        print(f"[ResearchSpawn] UNVERIFIED: Recovered proposal {proposal_id} spawned with incomplete metadata")
                    
                    recovered.append({
                        'original_pending_id': proposal_id,
                        'new_proposal_id': proposal.proposal_id,
                        'kernel_id': kernel_id,
                        'god_name': god_name,
                        'domain': domain,
                        'metadata_verified': is_metadata_complete,
                        'metadata_check': metadata_check,
                        'retry_count': current_retry_count,
                    })
                    self._recovered_proposals += 1
                    self._last_spawn_time = time.time()
                    print(f"[EnhancedM8] RECOVERED proposal {proposal_id} -> kernel {kernel_id} (after {current_retry_count} retries)")
                else:
                    new_retry_count = self._increment_retry_count(proposal_id)
                    failed.append({
                        'proposal_id': proposal_id,
                        'error': spawn_result.get('error', 'Spawn returned False') if isinstance(spawn_result, dict) else 'Spawn failed',
                        'retry_count': new_retry_count,
                        'will_retry': new_retry_count < self.max_recovery_retries,
                    })
                    self._failed_recoveries += 1
                    print(f"[EnhancedM8] Spawn FAILED for {proposal_id}, retry {new_retry_count}/{self.max_recovery_retries}")
                
            except Exception as e:
                new_retry_count = self._increment_retry_count(proposal_id)
                failed.append({
                    'proposal_id': proposal_id,
                    'error': str(e),
                    'retry_count': new_retry_count,
                    'will_retry': new_retry_count < self.max_recovery_retries,
                })
                self._failed_recoveries += 1
                print(f"[EnhancedM8] Exception recovering {proposal_id}: {e}, retry {new_retry_count}/{self.max_recovery_retries}")
        
        recovered_ids = [r['original_pending_id'] for r in recovered]
        abandoned_ids = [a['proposal_id'] for a in abandoned]
        self._cleanup_processed_proposals(recovered_ids, abandoned_ids)
        
        remaining = len(self.get_pending_proposals())
        if remaining > 0:
            print(f"[EnhancedM8] REMINDER: {remaining} proposals still pending. "
                  f"Call /api/research/heartbeat periodically to continue recovery attempts.")
        
        return {
            'success': True,
            'recovered': len(recovered),
            'failed': len(failed),
            'abandoned': len(abandoned),
            'remaining': remaining,
            'recovered_proposals': recovered,
            'failed_proposals': failed,
            'abandoned_proposals': abandoned,
            'recovery_attempt': self._recovery_attempts,
            'total_recovered': self._recovered_proposals,
            'total_failed': self._failed_recoveries,
            'total_abandoned': self._abandoned_proposals,
            'max_recovery_retries': self.max_recovery_retries,
        }
    
    def _cleanup_processed_proposals(self, processed_ids: List[str], abandoned_ids: List[str] = None) -> bool:
        """Remove successfully processed or abandoned proposals from the pending file."""
        try:
            if not os.path.exists(PENDING_PROPOSALS_FILE):
                return True
            
            with open(PENDING_PROPOSALS_FILE, 'r') as f:
                pending = json.load(f)
            
            all_remove_ids = set(processed_ids)
            if abandoned_ids:
                all_remove_ids.update(abandoned_ids)
            
            remaining = [
                p for p in pending
                if p.get('pending_proposal_id') not in all_remove_ids
            ]
            
            if not remaining:
                os.remove(PENDING_PROPOSALS_FILE)
                print("[EnhancedM8] All pending proposals processed, file removed")
            else:
                with open(PENDING_PROPOSALS_FILE, 'w') as f:
                    json.dump(remaining, f, indent=2, default=str)
                print(f"[EnhancedM8] {len(remaining)} proposals still pending")
            
            return True
        except Exception as e:
            print(f"[EnhancedM8] Failed to cleanup processed proposals: {e}")
            return False
    
    def _increment_retry_count(self, proposal_id: str) -> int:
        """Increment retry count for a proposal in the pending file. Returns new count."""
        try:
            if not os.path.exists(PENDING_PROPOSALS_FILE):
                return 0
            
            with open(PENDING_PROPOSALS_FILE, 'r') as f:
                pending = json.load(f)
            
            new_count = 0
            for p in pending:
                if p.get('pending_proposal_id') == proposal_id:
                    p['retry_count'] = p.get('retry_count', 0) + 1
                    new_count = p['retry_count']
                    break
            
            with open(PENDING_PROPOSALS_FILE, 'w') as f:
                json.dump(pending, f, indent=2, default=str)
            
            return new_count
        except Exception as e:
            print(f"[EnhancedM8] Failed to increment retry count: {e}")
            return 0
    
    def _persist_spawn_audit(
        self,
        proposal_id: str,
        kernel_id: Optional[str],
        success: bool,
        source: str,
        metadata_check: Dict
    ) -> bool:
        """
        Persist spawn audit record to /tmp/spawn_audit.json.
        
        Records every spawn attempt with full telemetry for data loss prevention.
        """
        try:
            audit_records = []
            if os.path.exists(SPAWN_AUDIT_FILE):
                with open(SPAWN_AUDIT_FILE, 'r') as f:
                    audit_records = json.load(f)
            
            record = {
                'timestamp': time.time(),
                'proposal_id': proposal_id,
                'kernel_id': kernel_id,
                'success': success,
                'source': source,
                'metadata_present': {
                    'analysis': metadata_check.get('has_research_analysis', False),
                    'key_concepts': metadata_check.get('key_concepts_count', 0) > 0,
                    'mythology': metadata_check.get('has_mythology', False),
                    'god_metadata': metadata_check.get('has_god_metadata', False),
                    'vocab_training': metadata_check.get('has_vocab_training', False),
                },
                'metadata_complete': metadata_check.get('metadata_complete', False),
                'missing_fields': metadata_check.get('missing_fields', []),
            }
            
            audit_records.append(record)
            
            if len(audit_records) > 1000:
                audit_records = audit_records[-500:]
            
            with open(SPAWN_AUDIT_FILE, 'w') as f:
                json.dump(audit_records, f, indent=2, default=str)
            
            print(f"[SpawnAudit] Recorded: proposal={proposal_id}, success={success}, source={source}")
            return True
        except Exception as e:
            print(f"[SpawnAudit] Failed to persist audit record: {e}")
            return False
    
    def get_spawn_audit(self, limit: int = 100, success_only: bool = False, source: Optional[str] = None) -> List[Dict]:
        """
        Retrieve spawn audit records with optional filtering.
        
        Args:
            limit: Maximum records to return (newest first)
            success_only: If True, only return successful spawns
            source: Filter by source ('recovered' or 'fresh')
            
        Returns:
            List of audit records, newest first
        """
        try:
            if not os.path.exists(SPAWN_AUDIT_FILE):
                return []
            
            with open(SPAWN_AUDIT_FILE, 'r') as f:
                records = json.load(f)
            
            records = list(reversed(records))
            
            if success_only:
                records = [r for r in records if r.get('success', False)]
            
            if source:
                records = [r for r in records if r.get('source') == source]
            
            return records[:limit]
        except Exception as e:
            print(f"[SpawnAudit] Failed to read audit records: {e}")
            return []
    
    def _log_metadata_before_spawn(self, proposal, proposal_id: str) -> Dict:
        """
        Log research metadata BEFORE calling spawn_kernel.
        
        Returns a dict with metadata verification details.
        """
        metadata = getattr(proposal, 'metadata', {}) if proposal else {}
        
        has_research_analysis = bool(metadata.get('research_analysis'))
        key_concepts = metadata.get('key_concepts', [])
        key_concepts_count = len(key_concepts) if isinstance(key_concepts, list) else 0
        has_mythology = bool(metadata.get('mythology_alignment'))
        has_god_metadata = bool(metadata.get('god_metadata'))
        has_vocab_training = bool(metadata.get('vocabulary_training_results') or metadata.get('vocabulary_training'))
        
        missing_fields = []
        if not has_research_analysis:
            missing_fields.append('research_analysis')
        if key_concepts_count == 0:
            missing_fields.append('key_concepts')
        if not has_mythology:
            missing_fields.append('mythology_alignment')
        
        print(f"[ResearchSpawn] Spawning with research metadata: analysis={has_research_analysis}, " +
              f"key_concepts={key_concepts_count} items, " +
              f"mythology={has_mythology}")
        
        if missing_fields:
            print(f"[ResearchSpawn] WARNING: Missing metadata fields: {missing_fields}")
        
        return {
            'has_research_analysis': has_research_analysis,
            'key_concepts_count': key_concepts_count,
            'has_mythology': has_mythology,
            'has_god_metadata': has_god_metadata,
            'has_vocab_training': has_vocab_training,
            'missing_fields': missing_fields,
            'metadata_complete': len(missing_fields) == 0,
        }
    
    def _log_spawn_result(self, spawn_result: Dict, proposal_id: str) -> None:
        """Log spawn result AFTER spawn_kernel returns."""
        if spawn_result.get('success'):
            kernel_id = spawn_result.get('kernel_id', spawn_result.get('god_name', 'unknown'))
            print(f"[ResearchSpawn] Spawn completed: proposal={proposal_id}, kernel_id={kernel_id}")
        else:
            error = spawn_result.get('error', spawn_result.get('reason', 'unknown'))
            print(f"[ResearchSpawn] Spawn FAILED: proposal={proposal_id}, error={error}")
    
    def spawn_with_verification(self, proposal_id: str, force: bool = False) -> Dict:
        """
        Spawn kernel with full metadata verification and telemetry.
        
        This helper method:
        1. Logs metadata before spawn
        2. Calls spawn_kernel
        3. Verifies result
        4. Returns enriched result with verification status
        
        Args:
            proposal_id: The proposal ID to spawn
            force: Force spawn even if vote didn't pass
            
        Returns:
            Enriched spawn result with verification status
        """
        if not self.base_spawner:
            return {
                'success': False,
                'verified': False,
                'error': 'base_spawner_unavailable',
            }
        
        proposal = self.base_spawner.proposals.get(proposal_id)
        if not proposal:
            return {
                'success': False,
                'verified': False,
                'error': f'Proposal {proposal_id} not found',
            }
        
        metadata_check = self._log_metadata_before_spawn(proposal, proposal_id)
        
        try:
            spawn_result = self.base_spawner.spawn_kernel(proposal_id, force=force)
            self._last_spawn_time = time.time()
        except Exception as e:
            self._unverified_spawns += 1
            print(f"[ResearchSpawn] Spawn exception: {e}")
            return {
                'success': False,
                'verified': False,
                'error': str(e),
                'metadata_check': metadata_check,
            }
        
        self._log_spawn_result(spawn_result, proposal_id)
        
        spawn_success = spawn_result.get('success', False)
        is_verified = (
            spawn_success and
            metadata_check.get('metadata_complete', False)
        )
        
        kernel_id = None
        if spawn_success:
            kernel_id = spawn_result.get('kernel_id', spawn_result.get('god_name'))
        
        self._persist_spawn_audit(
            proposal_id=proposal_id,
            kernel_id=kernel_id,
            success=spawn_success,
            source='fresh',
            metadata_check=metadata_check
        )
        
        if is_verified:
            self._verified_spawns += 1
            print(f"[ResearchSpawn] VERIFIED: Research metadata propagated successfully for {proposal_id}")
        else:
            self._unverified_spawns += 1
            if spawn_success:
                print(f"[ResearchSpawn] UNVERIFIED: Spawn succeeded but metadata incomplete for {proposal_id}")
        
        spawn_result['verified'] = is_verified
        spawn_result['metadata_check'] = metadata_check
        spawn_result['verification_timestamp'] = time.time()
        
        return spawn_result
    
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
        self._check_and_recover()
        
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
            proposal_data = {
                'success': True,
                'phase': 'proposed_without_spawner',
                'research': research,
                'god_name': god_name,
                'domain': domain,
                'element': element,
                'role': role,
                'vocabulary_training': vocab_result,
                'key_concepts': research.get('key_concepts', []),
                'analysis': research.get('analysis', {}),
                'recommendation': research.get('recommendation', 'consider'),
                'message': 'Research complete, base spawner not available',
            }
            pending_id = self._persist_pending_proposal(proposal_data)
            proposal_data['pending_proposal_id'] = pending_id
            return proposal_data
        
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
        0. Attempt recovery of pending proposals if base_spawner available
        1. Research domain
        2. Propose if recommended
        3. Vote with research weights
        4. Spawn if approved
        5. Train vocabulary from research
        """
        recovery_result = self._check_and_recover()
        
        if not recovery_result and self.base_spawner and os.path.exists(PENDING_PROPOSALS_FILE):
            recovery_result = self.recover_pending_proposals()
            if recovery_result.get('recovered', 0) > 0:
                print(f"[EnhancedM8] Recovered {recovery_result['recovered']} pending proposals")
        
        propose_result = self.research_and_propose(domain, element, role)
        
        if not propose_result['success']:
            return propose_result
        
        if 'proposal_id' not in propose_result:
            if propose_result.get('phase') == 'proposed_without_spawner':
                vocab_result = propose_result.get('vocabulary_training', {})
                if not vocab_result.get('success', False) and vocab_result.get('total_new_words', 0) == 0:
                    god_name = propose_result.get('god_name', '')
                    if god_name:
                        vocab_result = self.vocab_trainer.train_for_kernel_spawn(domain, god_name)
                        propose_result['vocabulary_training'] = vocab_result
            return propose_result
        
        proposal_id = propose_result['proposal_id']
        
        if not self.base_spawner:
            return {
                'success': True,
                'phase': 'proposed_no_voting',
                'propose_result': propose_result,
                'god_name': propose_result.get('god_name'),
                'vocabulary_training': propose_result.get('vocabulary_training', {}),
                'message': 'Proposal created but no spawner for voting',
            }
        
        vote_result = self._vote_with_research(proposal_id, propose_result['research'])
        
        if not vote_result.get('passed') and not force:
            return {
                'success': False,
                'phase': 'voting',
                'propose_result': propose_result,
                'vote_result': vote_result,
                'god_name': propose_result.get('god_name'),
                'vocabulary_training': propose_result.get('vocabulary_training', {}),
            }
        
        proposal = self.base_spawner.proposals.get(proposal_id)
        if proposal:
            research = propose_result.get('research', {})
            god_metadata = research.get('god_metadata', {})
            vocab_training = propose_result.get('vocabulary_training', {})
            
            proposal.metadata['key_concepts'] = research.get('key_concepts', [])
            proposal.metadata['analysis'] = research.get('analysis', {})
            proposal.metadata['god_metadata'] = god_metadata
            proposal.metadata['research_analysis'] = research.get('analysis', {})
            proposal.metadata['mythology_alignment'] = god_metadata.get('mythology_alignment', god_metadata.get('scores', {}))
            proposal.metadata['vocabulary_training_results'] = vocab_training
            proposal.metadata['mythology_scores'] = god_metadata.get('mythology_alignment', {})
            proposal.metadata['vocabulary_training'] = vocab_training
        
        spawn_result = self.spawn_with_verification(proposal_id, force=force)
        
        if not spawn_result.get('success'):
            return {
                'success': False,
                'phase': 'spawning',
                'spawn_result': spawn_result,
                'propose_result': propose_result,
                'vote_result': vote_result,
            }
        
        research = propose_result.get('research', {})
        god_metadata = research.get('god_metadata', {})
        vocab_training = propose_result.get('vocabulary_training', {})
        
        return {
            'success': True,
            'phase': 'complete',
            'propose_result': propose_result,
            'vote_result': vote_result,
            'spawn_result': spawn_result,
            'god_name': propose_result['god_name'],
            'domain': domain,
            'element': element,
            'role': role,
            'vocabulary_training': vocab_training,
            'key_concepts': research.get('key_concepts', []),
            'research_analysis': research.get('analysis', {}),
            'mythology_alignment': god_metadata.get('mythology_alignment', god_metadata.get('scores', {})),
            'vocabulary_training_results': vocab_training,
            'recovery_result': recovery_result,
            'proposal_metadata': {
                'research': research.get('analysis', {}),
                'god_metadata': god_metadata,
                'key_concepts': research.get('key_concepts', []),
                'vocabulary_training': vocab_training,
            },
            'audit_trail': {
                'spawned_at': time.time(),
                'force_spawn': force,
                'base_spawner_used': self.base_spawner is not None,
            },
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
    
    def get_analytics(self) -> Dict:
        """
        Get analytics for monitoring the enhanced spawner.
        
        Returns dict with:
        - Training events count
        - Recovery attempts/successes/failures
        - Pending proposals count
        - Research cache size
        - Verified/unverified spawn counts
        - Last spawn time
        - Metadata propagation success rate
        - should_call_heartbeat: True if pending proposals exist (for monitoring systems)
        """
        pending_count = len(self.get_pending_proposals())
        
        now = time.time()
        time_until_next_check = max(0, self._next_recovery_check - now)
        
        total_spawns = self._verified_spawns + self._unverified_spawns
        metadata_propagation_success_rate = (
            self._verified_spawns / total_spawns if total_spawns > 0 else 0.0
        )
        
        should_call_heartbeat = pending_count > 0
        
        if should_call_heartbeat:
            print(f"[EnhancedM8] HEARTBEAT REMINDER: {pending_count} proposals pending. "
                  f"Call /api/research/heartbeat every 10-30s to resume recovery.")
        
        return {
            'training_event_count': self._training_event_count,
            'recovery_attempts': self._recovery_attempts,
            'recovered_proposals': self._recovered_proposals,
            'failed_recoveries': self._failed_recoveries,
            'abandoned_proposals': self._abandoned_proposals,
            'pending_proposals_count': pending_count,
            'research_cache_size': len(self.research_cache),
            'base_spawner_connected': self.base_spawner is not None,
            'auto_recovery_enabled': self.auto_recovery_enabled,
            'last_recovery_attempt': self._last_recovery_attempt,
            'recovery_backoff_seconds': self._recovery_backoff_seconds,
            'next_recovery_check': self._next_recovery_check,
            'recovery_check_interval': self._recovery_check_interval,
            'seconds_until_next_check': time_until_next_check,
            'verified_spawns_count': self._verified_spawns,
            'unverified_spawns_count': self._unverified_spawns,
            'last_spawn_time': self._last_spawn_time,
            'metadata_propagation_success_rate': metadata_propagation_success_rate,
            'vocabulary_trainer_analytics': self.vocab_trainer.get_reconciliation_analytics() if hasattr(self.vocab_trainer, 'get_reconciliation_analytics') else {},
            'max_recovery_retries': self.max_recovery_retries,
            'should_call_heartbeat': should_call_heartbeat,
            'heartbeat_endpoint': '/api/research/heartbeat',
            'heartbeat_instructions': 'Call heartbeat every 10-30 seconds while should_call_heartbeat is True to ensure pending proposals are recovered.',
        }


_enhanced_spawner: Optional[EnhancedM8Spawner] = None


def get_enhanced_spawner() -> EnhancedM8Spawner:
    """Get or create enhanced spawner singleton."""
    global _enhanced_spawner
    if _enhanced_spawner is None:
        _enhanced_spawner = EnhancedM8Spawner()
    return _enhanced_spawner
