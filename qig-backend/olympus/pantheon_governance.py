"""
Pantheon Governance: Centralized Lifecycle Control
===================================================

Enforces that ALL kernel spawning, breeding, and death decisions
go through Pantheon approval. No kernel can be born or die without
the gods' consent.

This prevents uncontrolled population explosions and ensures
proper oversight of the kernel ecosystem.
"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional
import os

try:
    import psycopg2
    from psycopg2.extras import Json as PsycopgJson
    POSTGRES_AVAILABLE = True
except ImportError:
    POSTGRES_AVAILABLE = False
    psycopg2 = None
    PsycopgJson = None


class ProposalType(Enum):
    """Types of lifecycle proposals."""
    SPAWN = "spawn"
    BREED = "breed"
    DEATH = "death"
    TURBO_SPAWN = "turbo_spawn"


class ProposalStatus(Enum):
    """Status of a governance proposal."""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    AUTO_APPROVED = "auto_approved"


@dataclass
class LifecycleProposal:
    """A proposal for kernel lifecycle action."""
    proposal_id: str
    proposal_type: ProposalType
    created_at: datetime
    status: ProposalStatus = ProposalStatus.PENDING

    # Proposal details
    reason: Optional[str] = None
    parent_id: Optional[str] = None
    parent_phi: Optional[float] = None
    count: int = 1

    # Voting
    votes_for: List[str] = field(default_factory=list)
    votes_against: List[str] = field(default_factory=list)

    # Audit trail
    approved_by: Optional[str] = None
    rejected_by: Optional[str] = None
    audit_log: List[Dict] = field(default_factory=list)

    # Result
    executed: bool = False
    execution_result: Optional[Dict] = None


# Allowed bypass reasons (no governance required)
# NOTE: Keep this minimal - Pantheon should approve most lifecycle events
ALLOWED_BYPASS_REASONS = {
    'minimum_population',  # Prevent extinction (pop < 3)
    'initial_population',  # Bootstrap on empty startup (pop == 0)
    'test_mode',          # Testing only
}
# REMOVED: 'zeus_initialization' - Zeus should use 'initial_population' like everyone else

# Emergency bypass reasons (require manual confirmation)
EMERGENCY_BYPASS_REASONS = {
    'emergency_recovery',  # System recovery
    'critical_failure',    # Catastrophic state
}


class PantheonGovernance:
    """
    Centralized governance for kernel lifecycle.

    All spawning, breeding, and death decisions must go through
    this governance layer. Gods vote on proposals, and audit
    trails are maintained in the database.
    """

    def __init__(self):
        """Initialize governance system."""
        self.proposals: Dict[str, LifecycleProposal] = {}
        self.proposal_counter = 0

        # Database connection
        self.db_url = os.environ.get('DATABASE_URL')
        self._conn = None

        if POSTGRES_AVAILABLE and self.db_url:
            try:
                self._conn = psycopg2.connect(self.db_url)
                self._conn.autocommit = True
                self._ensure_tables_exist()
                print("[PantheonGovernance] Governance system initialized with PostgreSQL")
            except Exception as e:
                print(f"[PantheonGovernance] Database unavailable ({e}), using in-memory only")
                self._conn = None
        else:
            print("[PantheonGovernance] Governance system initialized (in-memory mode)")

    def _ensure_tables_exist(self):
        """Create required tables if they don't exist."""
        if not self._conn:
            return

        try:
            cur = self._conn.cursor()
            cur.execute("""
                CREATE TABLE IF NOT EXISTS governance_audit_log (
                    id SERIAL PRIMARY KEY,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    action VARCHAR(255) NOT NULL,
                    status VARCHAR(50) NOT NULL,
                    details TEXT
                )
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS governance_proposals (
                    id SERIAL PRIMARY KEY,
                    proposal_id VARCHAR(64) UNIQUE NOT NULL,
                    proposal_type VARCHAR(32) NOT NULL,
                    status VARCHAR(32) NOT NULL DEFAULT 'pending',
                    reason TEXT,
                    parent_id VARCHAR(64),
                    parent_phi FLOAT,
                    count INTEGER DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    votes_for JSONB DEFAULT '{}',
                    votes_against JSONB DEFAULT '{}',
                    audit_log JSONB DEFAULT '[]'
                )
            """)
            cur.close()
        except Exception as e:
            print(f"[PantheonGovernance] Warning: Could not ensure tables exist: {e}")

    def check_spawn_permission(
        self,
        reason: str = "",
        parent_id: Optional[str] = None,
        parent_phi: Optional[float] = None,
        pantheon_approved: bool = False
    ) -> bool:
        """
        Check if spawning is allowed.

        Args:
            reason: Why spawning is needed
            parent_id: Parent kernel ID (if spawning from parent)
            parent_phi: Parent's Phi value
            pantheon_approved: Explicit Pantheon approval

        Returns:
            True if spawning is allowed

        Raises:
            PermissionError: If spawning not allowed
        """
        # Explicit approval
        if pantheon_approved:
            self._log_audit("spawn", "allowed", f"Explicit Pantheon approval (reason: {reason})")
            return True

        # Check for allowed bypass reasons
        if reason in ALLOWED_BYPASS_REASONS:
            self._log_audit("spawn", "auto_approved", f"Bypass reason: {reason}")
            print(f"[PantheonGovernance] Auto-approved spawn (reason: {reason})")
            return True

        # Check for emergency bypass (requires confirmation)
        if reason in EMERGENCY_BYPASS_REASONS:
            print(f"[PantheonGovernance] EMERGENCY: Spawn requested for reason: {reason}")
            print("[PantheonGovernance] Emergency spawns require manual confirmation!")
            self._log_audit("spawn", "emergency_pending", f"Emergency reason: {reason}")
            raise PermissionError(
                f"Emergency spawn reason '{reason}' requires manual confirmation. "
                f"Set pantheon_approved=True after review."
            )

        # Auto-approval for high-Phi parents
        if parent_phi is not None and parent_phi >= 0.7:
            self._log_audit("spawn", "auto_approved", f"High-Phi parent (Phi={parent_phi:.3f})")
            print(f"[PantheonGovernance] Auto-approved spawn from high-Phi parent (Phi={parent_phi:.3f})")
            return True

        # Create proposal for Pantheon voting
        proposal = self._create_proposal(
            ProposalType.SPAWN,
            reason=reason,
            parent_id=parent_id,
            parent_phi=parent_phi
        )

        print(f"[PantheonGovernance] Spawn proposal created: {proposal.proposal_id}")
        print(f"[PantheonGovernance] Reason: {reason}")
        if parent_id:
            print(f"[PantheonGovernance] Parent: {parent_id} (Phi={parent_phi:.3f if parent_phi else 0:.3f})")
        print("[PantheonGovernance] Waiting for Pantheon approval...")

        raise PermissionError(
            f"Spawning requires Pantheon approval. "
            f"Proposal ID: {proposal.proposal_id}. "
            f"Use approve_proposal() to vote."
        )

    def check_breed_permission(
        self,
        parent1_id: str,
        parent2_id: str,
        parent1_phi: float,
        parent2_phi: float,
        pantheon_approved: bool = False
    ) -> bool:
        """
        Check if breeding is allowed.

        Args:
            parent1_id: First parent ID
            parent2_id: Second parent ID
            parent1_phi: First parent's Phi
            parent2_phi: Second parent's Phi
            pantheon_approved: Explicit approval

        Returns:
            True if breeding is allowed

        Raises:
            PermissionError: If breeding not allowed
        """
        if pantheon_approved:
            self._log_audit("breed", "allowed", f"Explicit Pantheon approval ({parent1_id} x {parent2_id})")
            return True

        # Auto-approval for high-Phi parents
        avg_phi = (parent1_phi + parent2_phi) / 2
        if avg_phi >= 0.7:
            self._log_audit("breed", "auto_approved", f"High-Phi parents (avg Phi={avg_phi:.3f})")
            print(f"[PantheonGovernance] Auto-approved breeding (avg Phi={avg_phi:.3f})")
            return True

        # Create proposal
        proposal = self._create_proposal(
            ProposalType.BREED,
            reason=f"Breed {parent1_id} (Phi={parent1_phi:.3f}) x {parent2_id} (Phi={parent2_phi:.3f})",
            parent_id=parent1_id,
            parent_phi=parent1_phi
        )

        print(f"[PantheonGovernance] Breeding proposal created: {proposal.proposal_id}")
        print(f"[PantheonGovernance] Parents: {parent1_id} (Phi={parent1_phi:.3f}) x {parent2_id} (Phi={parent2_phi:.3f})")
        print("[PantheonGovernance] Waiting for Pantheon approval...")

        raise PermissionError(
            f"Breeding requires Pantheon approval. "
            f"Proposal ID: {proposal.proposal_id}. "
            f"Average parent Phi={avg_phi:.3f}"
        )

    def check_turbo_spawn_permission(
        self,
        count: int,
        pantheon_approved: bool = False,
        emergency_override: bool = False
    ) -> bool:
        """
        Check if turbo spawning is allowed.

        Turbo spawning creates many kernels at once and is
        very dangerous. Requires explicit approval.

        Args:
            count: Number of kernels to spawn
            pantheon_approved: Explicit approval
            emergency_override: Manual emergency override

        Returns:
            True if allowed

        Raises:
            PermissionError: If not allowed
        """
        if pantheon_approved:
            self._log_audit("turbo_spawn", "allowed", f"Explicit approval for {count} kernels")
            return True

        if emergency_override:
            print(f"[PantheonGovernance] EMERGENCY OVERRIDE: Turbo spawn {count} kernels")
            self._log_audit("turbo_spawn", "emergency_override", f"Manual override for {count} kernels")
            return True

        # Turbo spawn always requires approval
        proposal = self._create_proposal(
            ProposalType.TURBO_SPAWN,
            reason=f"Mass spawn {count} kernels",
            count=count
        )

        print(f"[PantheonGovernance] TURBO SPAWN PROPOSAL: {proposal.proposal_id}")
        print(f"[PantheonGovernance] Requesting mass spawn of {count} kernels")
        print("[PantheonGovernance] This is potentially dangerous. Review carefully!")

        raise PermissionError(
            f"Turbo spawning {count} kernels requires Pantheon approval. "
            f"Proposal ID: {proposal.proposal_id}. "
            f"This is a mass spawning operation!"
        )

    def _create_proposal(
        self,
        proposal_type: ProposalType,
        reason: Optional[str] = None,
        parent_id: Optional[str] = None,
        parent_phi: Optional[float] = None,
        count: int = 1
    ) -> LifecycleProposal:
        """Create a new proposal."""
        self.proposal_counter += 1
        proposal_id = f"prop_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{self.proposal_counter}"

        proposal = LifecycleProposal(
            proposal_id=proposal_id,
            proposal_type=proposal_type,
            created_at=datetime.now(),
            reason=reason,
            parent_id=parent_id,
            parent_phi=parent_phi,
            count=count
        )

        self.proposals[proposal_id] = proposal
        self._persist_proposal(proposal)

        return proposal

    def approve_proposal(self, proposal_id: str, approver: str = "system") -> Dict:
        """
        Approve a proposal.

        Args:
            proposal_id: Proposal to approve
            approver: Who is approving (god name or "system")

        Returns:
            Approval result
        """
        if proposal_id not in self.proposals:
            return {"success": False, "error": "Proposal not found"}

        proposal = self.proposals[proposal_id]

        if proposal.status != ProposalStatus.PENDING:
            return {"success": False, "error": f"Proposal already {proposal.status.value}"}

        proposal.votes_for.append(approver)
        proposal.status = ProposalStatus.APPROVED
        proposal.approved_by = approver
        proposal.audit_log.append({
            "action": "approved",
            "by": approver,
            "timestamp": datetime.now().isoformat()
        })

        print(f"[PantheonGovernance] Proposal {proposal_id} APPROVED by {approver}")
        print(f"[PantheonGovernance] Type: {proposal.proposal_type.value}")
        print(f"[PantheonGovernance] Reason: {proposal.reason}")

        self._persist_proposal(proposal)

        return {"success": True, "proposal": proposal}

    def reject_proposal(self, proposal_id: str, rejector: str = "system") -> Dict:
        """Reject a proposal."""
        if proposal_id not in self.proposals:
            return {"success": False, "error": "Proposal not found"}

        proposal = self.proposals[proposal_id]

        if proposal.status != ProposalStatus.PENDING:
            return {"success": False, "error": f"Proposal already {proposal.status.value}"}

        proposal.votes_against.append(rejector)
        proposal.status = ProposalStatus.REJECTED
        proposal.rejected_by = rejector
        proposal.audit_log.append({
            "action": "rejected",
            "by": rejector,
            "timestamp": datetime.now().isoformat()
        })

        print(f"[PantheonGovernance] Proposal {proposal_id} REJECTED by {rejector}")

        self._persist_proposal(proposal)

        return {"success": True, "proposal": proposal}

    def get_pending_proposals(self) -> List[LifecycleProposal]:
        """Get all pending proposals."""
        return [
            p for p in self.proposals.values()
            if p.status == ProposalStatus.PENDING
        ]

    def _log_audit(self, action: str, status: str, details: str):
        """Log governance action to audit trail (full details, no truncation)."""
        timestamp = datetime.now().isoformat()
        log_entry = f"[{timestamp}] {action.upper()} - {status}: {details}"
        print(f"[PantheonGovernance] {log_entry}")

        if self._conn:
            try:
                cur = self._conn.cursor()
                cur.execute("""
                    INSERT INTO governance_audit_log (timestamp, action, status, details)
                    VALUES (%s, %s, %s, %s)
                """, (timestamp, action, status, details))
                cur.close()
            except Exception as e:
                print(f"[PantheonGovernance] Failed to persist audit log: {e}")

    def _persist_proposal(self, proposal: LifecycleProposal):
        """Persist proposal to database."""
        if not self._conn:
            return

        try:
            cur = self._conn.cursor()
            cur.execute("""
                INSERT INTO governance_proposals (
                    proposal_id, proposal_type, status, reason,
                    parent_id, parent_phi, count, created_at,
                    votes_for, votes_against, audit_log
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (proposal_id) DO UPDATE SET
                    status = EXCLUDED.status,
                    votes_for = EXCLUDED.votes_for,
                    votes_against = EXCLUDED.votes_against,
                    audit_log = EXCLUDED.audit_log
            """, (
                proposal.proposal_id,
                proposal.proposal_type.value,
                proposal.status.value,
                proposal.reason,
                proposal.parent_id,
                proposal.parent_phi,
                proposal.count,
                proposal.created_at,
                PsycopgJson(proposal.votes_for) if PsycopgJson else None,
                PsycopgJson(proposal.votes_against) if PsycopgJson else None,
                PsycopgJson(proposal.audit_log) if PsycopgJson else None,
            ))
            cur.close()
        except Exception as e:
            print(f"[PantheonGovernance] Failed to persist proposal: {e}")

    def close(self):
        """Close database connection."""
        if self._conn:
            try:
                self._conn.close()
            except Exception:
                pass
            self._conn = None


# Global governance instance
_governance = None


def get_governance() -> PantheonGovernance:
    """Get or create the global governance instance."""
    global _governance
    if _governance is None:
        _governance = PantheonGovernance()
    return _governance
