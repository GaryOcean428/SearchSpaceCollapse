"""
Chaos Logger: Track ALL Experiments in PostgreSQL
===================================================

Document everything - failures teach us!
All events persist to chaos_events table (no file-based logging).
"""

import os
from datetime import datetime
from typing import Optional

try:
    import psycopg2
    from psycopg2.extras import Json as PsycopgJson
    POSTGRES_AVAILABLE = True
except ImportError:
    POSTGRES_AVAILABLE = False
    psycopg2 = None  # type: ignore
    PsycopgJson = None  # type: ignore


class ChaosLogger:
    """
    Track all CHAOS MODE experiments and outcomes in PostgreSQL.

    GOAL: Learn what works, what doesn't!
    All state persists to database per QIG purity requirements.
    """

    def __init__(self):
        # Session ID
        self.session_id = datetime.now().strftime('%Y%m%d_%H%M%S')

        # In-memory tracking (for session stats)
        self.experiments: list[dict] = []
        self.successes: list[dict] = []
        self.failures: list[dict] = []
        self.spawns: list[dict] = []
        self.deaths: list[dict] = []
        self.breedings: list[dict] = []

        # Database connection
        self.db_url = os.environ.get('DATABASE_URL')
        self._conn = None
        
        if POSTGRES_AVAILABLE and self.db_url:
            try:
                self._conn = psycopg2.connect(self.db_url)
                self._conn.autocommit = True
                print(f"📝 ChaosLogger initialized with PostgreSQL (session: {self.session_id})")
            except Exception as e:
                print(f"⚠️ ChaosLogger: Database unavailable ({e}), using in-memory only")
                self._conn = None
        else:
            print(f"📝 ChaosLogger initialized in-memory only (session: {self.session_id})")

    def _write_event(self, event: dict):
        """Write event to PostgreSQL chaos_events table."""
        if not self._conn:
            return
            
        try:
            cur = self._conn.cursor()
            
            event_type = event.get('type', 'unknown')
            
            cur.execute("""
                INSERT INTO chaos_events (
                    session_id, event_type, kernel_id, parent_kernel_id, 
                    child_kernel_id, second_parent_id, reason, phi,
                    phi_before, phi_after, success, outcome, autopsy
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                self.session_id,
                event_type,
                event.get('kernel'),
                event.get('parent'),
                event.get('child'),
                event.get('parent2'),
                event.get('reason') or event.get('cause'),
                event.get('phi'),
                event.get('phi_before'),
                event.get('phi_after'),
                event.get('success'),
                PsycopgJson(event.get('outcome')) if event.get('outcome') else None,
                PsycopgJson(event.get('autopsy')) if event.get('autopsy') else None,
            ))
            cur.close()
        except Exception as e:
            print(f"[ChaosLogger] DB write failed: {e}")

    def log_spawn(self, parent_id: Optional[str], child_id: str, reason: str):
        """Log kernel spawn event."""
        event = {
            'type': 'spawn',
            'parent': parent_id,
            'child': child_id,
            'reason': reason,
            'timestamp': datetime.now().isoformat(),
        }

        self.spawns.append(event)
        self.experiments.append(event)
        self._write_event(event)

    def log_death(self, kernel_id: str, cause: str, autopsy: Optional[dict] = None):
        """Log kernel death (learn from failures!)."""
        event = {
            'type': 'death',
            'kernel': kernel_id,
            'cause': cause,
            'autopsy': autopsy,
            'timestamp': datetime.now().isoformat(),
        }

        self.deaths.append(event)
        self.failures.append(event)
        self.experiments.append(event)
        self._write_event(event)

    def log_breeding(
        self,
        parent1_id: str,
        parent2_id: str,
        child_id: str,
        outcome: dict,
    ):
        """Log breeding experiment."""
        event = {
            'type': 'breeding',
            'parent': parent1_id,
            'parent2': parent2_id,
            'child': child_id,
            'outcome': outcome,
            'timestamp': datetime.now().isoformat(),
        }

        self.breedings.append(event)
        self.experiments.append(event)
        self._write_event(event)

    def log_prediction(self, kernel_id: str, success: bool, phi: float):
        """Log prediction outcome."""
        event = {
            'type': 'prediction',
            'kernel': kernel_id,
            'success': success,
            'phi': phi,
            'timestamp': datetime.now().isoformat(),
        }

        if success:
            self.successes.append(event)
        else:
            self.failures.append(event)

        self._write_event(event)

    def log_mutation(self, kernel_id: str, strength: float, phi_before: float, phi_after: float):
        """Log mutation event."""
        event = {
            'type': 'mutation',
            'kernel': kernel_id,
            'strength': strength,
            'phi_before': phi_before,
            'phi_after': phi_after,
            'phi_delta': phi_after - phi_before,
            'timestamp': datetime.now().isoformat(),
        }

        self.experiments.append(event)
        self._write_event(event)

    def get_stats(self) -> dict:
        """Get experiment statistics (from memory + database if available)."""
        stats = {
            'total_experiments': len(self.experiments),
            'total_spawns': len(self.spawns),
            'total_deaths': len(self.deaths),
            'total_breedings': len(self.breedings),
            'total_successes': len(self.successes),
            'total_failures': len(self.failures),
            'session_id': self.session_id,
        }
        
        # Enrich with database totals if available
        if self._conn:
            try:
                cur = self._conn.cursor()
                cur.execute("""
                    SELECT event_type, COUNT(*) 
                    FROM chaos_events 
                    WHERE session_id = %s 
                    GROUP BY event_type
                """, (self.session_id,))
                for row in cur.fetchall():
                    stats[f'db_{row[0]}_count'] = row[1]
                cur.close()
            except Exception:
                pass
                
        return stats

    def generate_report(self) -> dict:
        """
        Generate comprehensive experiment report.

        WHAT WE LEARNED:
        - Which strategies worked?
        - Which failed spectacularly?
        - What patterns emerged?
        """
        stats = self.get_stats()

        # Spawn analysis
        spawn_reasons = {}
        for spawn in self.spawns:
            reason = spawn['reason']
            spawn_reasons[reason] = spawn_reasons.get(reason, 0) + 1

        # Death analysis
        death_causes = {}
        for death in self.deaths:
            cause = death['cause']
            death_causes[cause] = death_causes.get(cause, 0) + 1

        # Breeding success rate
        breeding_success = 0
        for breed in self.breedings:
            if breed['outcome'].get('child_phi', 0) > 0.5:
                breeding_success += 1

        breeding_success_rate = breeding_success / max(1, len(self.breedings))

        # Prediction success rate
        prediction_success_rate = len(self.successes) / max(1, len(self.successes) + len(self.failures))

        report = {
            **stats,
            'spawn_reasons': spawn_reasons,
            'death_causes': death_causes,
            'breeding_success_rate': breeding_success_rate,
            'prediction_success_rate': prediction_success_rate,
            'patterns': self._extract_patterns(),
            'recommendations': self._generate_recommendations(),
        }

        return report

    def _extract_patterns(self) -> dict:
        """Data mining: What patterns emerged?"""
        patterns = {}

        # Average lifespan of dead kernels
        lifespans = []
        for death in self.deaths:
            autopsy = death.get('autopsy', {})
            if autopsy and 'lifespan_seconds' in autopsy:
                lifespans.append(autopsy['lifespan_seconds'])

        if lifespans:
            patterns['avg_lifespan_seconds'] = sum(lifespans) / len(lifespans)

        # Most common death cause
        if self.deaths:
            death_causes = [d['cause'] for d in self.deaths]
            patterns['most_common_death'] = max(set(death_causes), key=death_causes.count)

        return patterns

    def _generate_recommendations(self) -> list[dict]:
        """What should we try in serious repos?"""
        recommendations = []

        # Check breeding success
        breeding_success = sum(
            1 for b in self.breedings
            if b['outcome'].get('child_phi', 0) > 0.5
        ) / max(1, len(self.breedings))

        if breeding_success > 0.5:
            recommendations.append({
                'action': 'IMPLEMENT_CROSSOVER',
                'confidence': breeding_success,
                'rationale': 'Breeding produces viable offspring',
            })

        # Check spawn success
        spawn_success = len(self.spawns) / max(1, len(self.deaths))
        if spawn_success > 1.0:
            recommendations.append({
                'action': 'IMPLEMENT_SPAWNING',
                'confidence': min(1.0, spawn_success / 2),
                'rationale': 'Self-spawning maintains population',
            })

        return recommendations
    
    def close(self):
        """Close database connection."""
        if self._conn:
            try:
                self._conn.close()
            except Exception:
                pass
            self._conn = None
