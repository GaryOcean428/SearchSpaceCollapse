"""
Modular Cannibalism
===================

Selective absorption of useful modules from dying kernels.
Like organ transplants - extract what works, discard the rest.

Module Types:
- Attention modules (what to focus on)
- Memory modules (what to remember)
- Decision modules (how to choose)
- Pattern modules (what patterns to recognize)
"""

import hashlib
import random
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional


class ModuleType(Enum):
    """Types of extractable modules."""
    ATTENTION = "attention"     # Focus/selection mechanisms
    MEMORY = "memory"           # Storage/retrieval patterns
    DECISION = "decision"       # Choice/action selection
    PATTERN = "pattern"         # Pattern recognition
    INTEGRATION = "integration" # Cross-module coordination


@dataclass
class ExtractedModule:
    """A module extracted from a kernel."""
    module_id: str
    module_type: ModuleType
    source_kernel_id: str
    source_phi: float
    source_domain: str
    weights_hash: str  # Hash of module weights for deduplication
    extraction_score: float  # Quality score at extraction
    usage_count: int = 0
    success_rate: float = 0.0
    metadata: Dict = field(default_factory=dict)


class ModularCannibalism:
    """
    Manages extraction and integration of modules between kernels.

    When a kernel dies or underperforms, valuable modules can be
    extracted and transplanted into other kernels.
    """

    def __init__(self, max_library_size: int = 500):
        self.module_library: Dict[str, ExtractedModule] = {}
        self.max_library_size = max_library_size
        self.extraction_history: List[Dict] = []
        self.transplant_history: List[Dict] = []

    def evaluate_module_quality(
        self,
        module_type: ModuleType,
        phi: float,
        success_rate: float,
        domain_relevance: float
    ) -> float:
        """
        Evaluate the quality of a module for extraction.

        Higher scores indicate more valuable modules.
        """
        # Base quality from Φ and success rate
        base_quality = (phi * 0.4) + (success_rate * 0.4) + (domain_relevance * 0.2)

        # Module type multipliers (some types are more valuable)
        type_multipliers = {
            ModuleType.ATTENTION: 1.2,     # Attention is valuable
            ModuleType.MEMORY: 1.1,        # Memory is useful
            ModuleType.DECISION: 1.0,      # Decisions are standard
            ModuleType.PATTERN: 1.15,      # Pattern recognition valuable
            ModuleType.INTEGRATION: 0.9,   # Integration is context-specific
        }

        return base_quality * type_multipliers.get(module_type, 1.0)

    def extract_modules(
        self,
        kernel_id: str,
        kernel_phi: float,
        kernel_domain: str,
        kernel_weights: Dict[str, Any],
        min_quality: float = 0.5
    ) -> List[ExtractedModule]:
        """
        Extract valuable modules from a kernel.

        Called when a kernel dies or is being recycled.
        """
        extracted = []

        # Simulate module extraction for each type
        for module_type in ModuleType:
            # Generate a fake weights hash (in real impl, hash actual weights)
            weights_key = f"{kernel_id}_{module_type.value}"
            weights_hash = hashlib.md5(weights_key.encode()).hexdigest()[:16]

            # Calculate extraction score
            domain_relevance = 0.5 + random.random() * 0.5  # Simulated
            success_rate = random.random()  # Would come from real metrics

            score = self.evaluate_module_quality(
                module_type, kernel_phi, success_rate, domain_relevance
            )

            if score >= min_quality:
                module = ExtractedModule(
                    module_id=f"mod_{kernel_id}_{module_type.value}",
                    module_type=module_type,
                    source_kernel_id=kernel_id,
                    source_phi=kernel_phi,
                    source_domain=kernel_domain,
                    weights_hash=weights_hash,
                    extraction_score=score,
                    metadata={
                        'extracted_at': 'now',  # Would use actual timestamp
                        'domain_relevance': domain_relevance,
                    }
                )
                extracted.append(module)

                # Add to library (with size management)
                self._add_to_library(module)

        # Record extraction
        self.extraction_history.append({
            'kernel_id': kernel_id,
            'phi': kernel_phi,
            'domain': kernel_domain,
            'modules_extracted': len(extracted),
        })

        return extracted

    def _add_to_library(self, module: ExtractedModule) -> None:
        """Add a module to the library, managing size limits."""
        # Check for duplicates (same weights hash)
        for existing_id, existing in self.module_library.items():
            if existing.weights_hash == module.weights_hash:
                # Keep the one with higher score
                if module.extraction_score > existing.extraction_score:
                    del self.module_library[existing_id]
                    break
                else:
                    return  # Existing is better, don't add

        # Add new module
        self.module_library[module.module_id] = module

        # Prune if over limit
        if len(self.module_library) > self.max_library_size:
            self._prune_library()

    def _prune_library(self) -> None:
        """Remove lowest quality modules to stay under size limit."""
        # Sort by quality score
        sorted_modules = sorted(
            self.module_library.items(),
            key=lambda x: x[1].extraction_score,
            reverse=True
        )

        # Keep top modules
        keep_count = int(self.max_library_size * 0.8)
        self.module_library = dict(sorted_modules[:keep_count])

    def find_compatible_modules(
        self,
        target_kernel_id: str,
        target_domain: str,
        needed_types: Optional[List[ModuleType]] = None,
        max_results: int = 5
    ) -> List[ExtractedModule]:
        """
        Find modules compatible with a target kernel.

        Compatibility based on domain similarity and module quality.
        """
        candidates = []

        for module in self.module_library.values():
            # Filter by type if specified
            if needed_types and module.module_type not in needed_types:
                continue

            # Skip self-sourced modules
            if module.source_kernel_id == target_kernel_id:
                continue

            # Calculate compatibility score
            domain_match = 1.0 if module.source_domain == target_domain else 0.5
            quality = module.extraction_score
            usage_bonus = min(0.2, module.usage_count * 0.02)  # Proven modules
            success_bonus = module.success_rate * 0.3

            compatibility = (quality * 0.5 + domain_match * 0.3 +
                           usage_bonus + success_bonus)

            candidates.append((module, compatibility))

        # Sort by compatibility and return top results
        candidates.sort(key=lambda x: x[1], reverse=True)
        return [m for m, _ in candidates[:max_results]]

    def transplant_module(
        self,
        module: ExtractedModule,
        target_kernel_id: str,
        target_domain: str
    ) -> Dict[str, Any]:
        """
        Transplant a module into a target kernel.

        Returns transplant result with success probability.
        """
        # Calculate transplant success probability
        domain_match = 1.0 if module.source_domain == target_domain else 0.6
        quality_factor = module.extraction_score
        usage_factor = min(1.0, 0.7 + module.usage_count * 0.05)

        success_prob = domain_match * quality_factor * usage_factor
        success = random.random() < success_prob

        # Update module stats
        module.usage_count += 1
        if success:
            module.success_rate = (
                (module.success_rate * (module.usage_count - 1) + 1.0) /
                module.usage_count
            )
        else:
            module.success_rate = (
                (module.success_rate * (module.usage_count - 1)) /
                module.usage_count
            )

        # Record transplant
        result = {
            'module_id': module.module_id,
            'module_type': module.module_type.value,
            'source_kernel': module.source_kernel_id,
            'target_kernel': target_kernel_id,
            'success': success,
            'success_probability': success_prob,
        }
        self.transplant_history.append(result)

        return result

    def get_library_stats(self) -> Dict[str, Any]:
        """Get statistics about the module library."""
        stats = {
            'total_modules': len(self.module_library),
            'by_type': {},
            'avg_quality': 0,
            'total_extractions': len(self.extraction_history),
            'total_transplants': len(self.transplant_history),
            'transplant_success_rate': 0,
        }

        if self.module_library:
            for module_type in ModuleType:
                count = sum(1 for m in self.module_library.values()
                           if m.module_type == module_type)
                stats['by_type'][module_type.value] = count

            stats['avg_quality'] = sum(
                m.extraction_score for m in self.module_library.values()
            ) / len(self.module_library)

        if self.transplant_history:
            successes = sum(1 for t in self.transplant_history if t['success'])
            stats['transplant_success_rate'] = successes / len(self.transplant_history)

        return stats
