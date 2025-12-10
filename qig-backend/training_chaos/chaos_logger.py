"""
Chaos Logger: Track ALL Experiments
====================================

Document everything - failures teach us!
"""

import json
from datetime import datetime
from pathlib import Path
from typing import Optional


class ChaosLogger:
    """
    Track all CHAOS MODE experiments and outcomes.

    GOAL: Learn what works, what doesn't!
    """

    def __init__(self, log_dir: str = '/tmp/chaos_logs'):
        self.log_dir = Path(log_dir)
        self.log_dir.mkdir(parents=True, exist_ok=True)

        # In-memory tracking
        self.experiments: list[dict] = []
        self.successes: list[dict] = []
        self.failures: list[dict] = []
        self.spawns: list[dict] = []
        self.deaths: list[dict] = []
        self.breedings: list[dict] = []

        # Session ID
        self.session_id = datetime.now().strftime('%Y%m%d_%H%M%S')
        self.session_log = self.log_dir / f"session_{self.session_id}.jsonl"

        print(f"📝 ChaosLogger initialized: {self.log_dir}")

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

        # Write detailed autopsy
        if autopsy:
            autopsy_path = self.log_dir / f"{kernel_id}_autopsy.json"
            with open(autopsy_path, 'w') as f:
                json.dump(autopsy, f, indent=2, default=str)

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
            'parent1': parent1_id,
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

    def _write_event(self, event: dict):
        """Append event to session log."""
        with open(self.session_log, 'a') as f:
            f.write(json.dumps(event, default=str) + '\n')

    def get_stats(self) -> dict:
        """Get experiment statistics."""
        return {
            'total_experiments': len(self.experiments),
            'total_spawns': len(self.spawns),
            'total_deaths': len(self.deaths),
            'total_breedings': len(self.breedings),
            'total_successes': len(self.successes),
            'total_failures': len(self.failures),
            'session_id': self.session_id,
        }

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

        # Save report
        report_path = self.log_dir / f"report_{self.session_id}.json"
        with open(report_path, 'w') as f:
            json.dump(report, f, indent=2, default=str)

        return report

    def _extract_patterns(self) -> dict:
        """Data mining: What patterns emerged?"""
        patterns = {}

        # Average lifespan of dead kernels
        lifespans = []
        for death in self.deaths:
            autopsy = death.get('autopsy', {})
            if 'lifespan_seconds' in autopsy:
                lifespans.append(autopsy['lifespan_seconds'])

        if lifespans:
            patterns['avg_lifespan_seconds'] = sum(lifespans) / len(lifespans)

        # Most common death cause
        if self.deaths:
            death_causes = [d['cause'] for d in self.deaths]
            patterns['most_common_death'] = max(set(death_causes), key=death_causes.count)

        # Generation depth
        generations = []
        for spawn in self.spawns:
            # Extract generation from spawns
            pass

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
