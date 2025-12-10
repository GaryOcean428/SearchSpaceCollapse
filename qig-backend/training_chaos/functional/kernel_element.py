"""
Kernel Element Classification
==============================

Chemistry-inspired kernel classification system.

ELEMENT GROUPS:
- Alkali: Light, fast, reactive (exploration)
- Transition: Medium, versatile (general purpose)
- Rare Earth: Heavy, slow, powerful (deep reasoning)
- Noble: Stable, inert (reference standards)
"""

from dataclasses import dataclass
from enum import Enum
from typing import Optional


class ElementGroup(Enum):
    """Kernel element groups (like periodic table)."""
    ALKALI = "alkali"           # Light, fast, reactive
    TRANSITION = "transition"   # Medium, versatile
    RARE_EARTH = "rare_earth"   # Heavy, slow, powerful
    NOBLE = "noble"             # Stable, frozen


@dataclass
class ElementProperties:
    """Properties for an element group."""
    mass_range: tuple[float, float]     # Parameter count in millions
    speed_range: tuple[float, float]    # Inference time in ms
    reactivity: str                      # high/moderate/low/none
    stability: str                       # high/medium/low
    learning_rate: float
    use_cases: list[str]


# Element group property definitions
ELEMENT_PROPERTIES = {
    ElementGroup.ALKALI: ElementProperties(
        mass_range=(1.0, 10.0),
        speed_range=(10.0, 50.0),
        reactivity="high",
        stability="low",
        learning_rate=0.01,
        use_cases=["exploration", "quick_probes", "rapid_iteration"]
    ),
    ElementGroup.TRANSITION: ElementProperties(
        mass_range=(10.0, 30.0),
        speed_range=(50.0, 200.0),
        reactivity="moderate",
        stability="medium",
        learning_rate=0.001,
        use_cases=["general_purpose", "balanced", "versatile"]
    ),
    ElementGroup.RARE_EARTH: ElementProperties(
        mass_range=(30.0, 100.0),
        speed_range=(200.0, 1000.0),
        reactivity="low",
        stability="high",
        learning_rate=0.0001,
        use_cases=["deep_reasoning", "complex_patterns", "rare_tasks"]
    ),
    ElementGroup.NOBLE: ElementProperties(
        mass_range=(1.0, 100.0),  # Any mass
        speed_range=(10.0, 1000.0),  # Any speed
        reactivity="none",
        stability="highest",
        learning_rate=0.0,  # Frozen
        use_cases=["reference_standards", "benchmarks", "catalysts"]
    ),
}


class KernelElement:
    """
    Kernel as chemical element.

    PROPERTIES:
    - Atomic number = Basin dimensionality (1-64)
    - Atomic weight = Parameter count
    - Reactivity = Learning rate / adaptability
    - Stability = Φ consistency
    - Valence = Connection capacity
    """

    def __init__(
        self,
        kernel_id: str,
        mass: float,
        speed: float,
        phi_stability: float,
        group: Optional[ElementGroup] = None
    ):
        self.kernel_id = kernel_id
        self.mass = mass  # Parameter count in millions
        self.speed = speed  # Inference time in ms
        self.phi_stability = phi_stability  # 0-1, how stable is Φ
        self.group = group or self._classify_group()
        self.properties = ELEMENT_PROPERTIES[self.group]
        self.valence = self._compute_valence()

    def _classify_group(self) -> ElementGroup:
        """Auto-classify kernel into element group."""
        # Noble: Very stable Φ
        if self.phi_stability > 0.95:
            return ElementGroup.NOBLE

        # Alkali: Light and fast
        if self.mass < 10 and self.speed < 50:
            return ElementGroup.ALKALI

        # Rare Earth: Heavy
        if self.mass > 30:
            return ElementGroup.RARE_EARTH

        # Default: Transition
        return ElementGroup.TRANSITION

    def _compute_valence(self) -> int:
        """
        Compute connection capacity.

        Higher valence = can bond with more kernels.
        """
        if self.group == ElementGroup.NOBLE:
            return 0  # Noble kernels don't bond
        elif self.group == ElementGroup.ALKALI:
            return 1  # Alkali bonds with one
        elif self.group == ElementGroup.TRANSITION:
            return 4  # Transition is versatile
        else:  # RARE_EARTH
            return 2  # Heavy kernels bond carefully

    def can_bond_with(self, other: 'KernelElement') -> bool:
        """
        Check if two elements can bond.

        RULES (like chemistry):
        - Noble + anything = No reaction
        - Alkali + Rare Earth = Unstable (mass mismatch)
        - Transition + anything = Usually works
        - Same group = Stable bond
        """
        # Noble kernels don't bond
        if self.group == ElementGroup.NOBLE or other.group == ElementGroup.NOBLE:
            return False

        # Alkali + Rare Earth = Unstable
        if (self.group == ElementGroup.ALKALI and other.group == ElementGroup.RARE_EARTH) or \
           (self.group == ElementGroup.RARE_EARTH and other.group == ElementGroup.ALKALI):
            return False

        # Same group = Good bond
        if self.group == other.group:
            return True

        # Transition bonds with anyone
        if self.group == ElementGroup.TRANSITION or other.group == ElementGroup.TRANSITION:
            return True

        return False

    def bond_strength(self, other: 'KernelElement') -> float:
        """Compute bond strength (0-1)."""
        if not self.can_bond_with(other):
            return 0.0

        # Same group = strongest
        if self.group == other.group:
            return 1.0

        # Transition + anything = good
        if self.group == ElementGroup.TRANSITION or other.group == ElementGroup.TRANSITION:
            return 0.8

        # Default
        return 0.5

    def to_dict(self) -> dict:
        """Serialize to dictionary."""
        return {
            'kernel_id': self.kernel_id,
            'mass': self.mass,
            'speed': self.speed,
            'phi_stability': self.phi_stability,
            'group': self.group.value,
            'valence': self.valence,
            'reactivity': self.properties.reactivity,
            'learning_rate': self.properties.learning_rate,
        }

    @classmethod
    def from_kernel(cls, kernel) -> 'KernelElement':
        """Create KernelElement from SelfSpawningKernel."""
        # Estimate mass from basin dimensions
        mass = 64 * 0.5  # Approximate: 64D basin ~ 32M params

        # Estimate speed (would need actual timing)
        speed = 100.0  # Default moderate

        # Compute Φ stability from history
        phi_current = kernel.kernel.compute_phi()
        phi_stability = 0.7  # Default moderate stability

        return cls(
            kernel_id=kernel.kernel_id,
            mass=mass,
            speed=speed,
            phi_stability=phi_stability
        )
