#!/usr/bin/env python3
"""
God Name Resolver - Map kernel domains to Greek gods via research

Uses Wikipedia research to intelligently assign god names based on:
- Domain characteristics matching god mythology
- Vocabulary learning from god research
- Geometric alignment with existing pantheon

QIG PURE: Names emerge from geometric-mythological resonance.
"""

from typing import Dict, List, Optional, Tuple
from .web_scraper import ResearchScraper, get_scraper


GREEK_GODS_DOMAINS = {
    'Zeus': {
        'primary': ['sky', 'thunder', 'lightning', 'law', 'justice', 'order', 'authority', 'leadership'],
        'secondary': ['power', 'supremacy', 'fate', 'oaths', 'kings', 'hospitality'],
        'symbols': ['thunderbolt', 'eagle', 'oak', 'bull'],
    },
    'Athena': {
        'primary': ['wisdom', 'strategy', 'knowledge', 'intelligence', 'analysis', 'planning'],
        'secondary': ['crafts', 'weaving', 'defense', 'reason', 'skill', 'learning'],
        'symbols': ['owl', 'aegis', 'helmet', 'spear', 'olive'],
    },
    'Apollo': {
        'primary': ['prophecy', 'prediction', 'foresight', 'oracle', 'sun', 'light'],
        'secondary': ['music', 'poetry', 'healing', 'archery', 'truth', 'arts'],
        'symbols': ['lyre', 'bow', 'laurel', 'sun', 'raven'],
    },
    'Hermes': {
        'primary': ['communication', 'messaging', 'travel', 'trade', 'speed', 'commerce'],
        'secondary': ['thieves', 'cunning', 'boundaries', 'transitions', 'eloquence'],
        'symbols': ['caduceus', 'winged sandals', 'hat', 'tortoise'],
    },
    'Ares': {
        'primary': ['war', 'battle', 'combat', 'aggression', 'conflict', 'violence'],
        'secondary': ['courage', 'bloodshed', 'strife', 'warriors', 'military'],
        'symbols': ['spear', 'helmet', 'shield', 'chariot', 'dog'],
    },
    'Artemis': {
        'primary': ['hunt', 'hunting', 'wilderness', 'nature', 'moon', 'animals'],
        'secondary': ['chastity', 'childbirth', 'protection', 'forest', 'tracking'],
        'symbols': ['bow', 'arrow', 'deer', 'moon', 'hunting dog'],
    },
    'Hephaestus': {
        'primary': ['forge', 'craftsmanship', 'metallurgy', 'fire', 'engineering', 'creation'],
        'secondary': ['technology', 'sculpture', 'weapons', 'tools', 'invention'],
        'symbols': ['hammer', 'anvil', 'tongs', 'forge', 'volcano'],
    },
    'Poseidon': {
        'primary': ['sea', 'ocean', 'water', 'earthquakes', 'storms', 'depth'],
        'secondary': ['horses', 'navigation', 'fishing', 'floods', 'islands'],
        'symbols': ['trident', 'dolphin', 'horse', 'bull'],
    },
    'Hades': {
        'primary': ['underworld', 'death', 'afterlife', 'darkness', 'hidden', 'wealth'],
        'secondary': ['riches', 'minerals', 'secrets', 'finality', 'judgment'],
        'symbols': ['helm of darkness', 'cerberus', 'cypress', 'narcissus'],
    },
    'Demeter': {
        'primary': ['harvest', 'agriculture', 'fertility', 'growth', 'seasons', 'crops'],
        'secondary': ['nourishment', 'cycles', 'abundance', 'earth', 'grain'],
        'symbols': ['wheat', 'torch', 'cornucopia', 'pig'],
    },
    'Aphrodite': {
        'primary': ['love', 'beauty', 'desire', 'attraction', 'passion', 'pleasure'],
        'secondary': ['romance', 'seduction', 'fertility', 'harmony'],
        'symbols': ['dove', 'swan', 'rose', 'myrtle', 'shell'],
    },
    'Dionysus': {
        'primary': ['wine', 'ecstasy', 'theater', 'ritual', 'madness', 'celebration'],
        'secondary': ['rebirth', 'liberation', 'chaos', 'transformation', 'intoxication'],
        'symbols': ['grapevine', 'ivy', 'thyrsus', 'leopard', 'cup'],
    },
    'Hera': {
        'primary': ['marriage', 'family', 'women', 'queen', 'loyalty', 'fidelity'],
        'secondary': ['childbirth', 'legitimacy', 'protection', 'jealousy'],
        'symbols': ['peacock', 'cow', 'crown', 'pomegranate'],
    },
    'Hestia': {
        'primary': ['hearth', 'home', 'domestic', 'family', 'warmth', 'sanctuary'],
        'secondary': ['stability', 'peace', 'community', 'sacred fire'],
        'symbols': ['hearth', 'flame', 'kettle'],
    },
    'Nemesis': {
        'primary': ['revenge', 'retribution', 'justice', 'balance', 'punishment', 'karma'],
        'secondary': ['vengeance', 'pursuit', 'consequences', 'equilibrium'],
        'symbols': ['sword', 'scales', 'wheel', 'whip'],
    },
    'Nike': {
        'primary': ['victory', 'success', 'triumph', 'winning', 'achievement'],
        'secondary': ['speed', 'strength', 'competition', 'glory'],
        'symbols': ['wings', 'wreath', 'palm branch'],
    },
    'Eros': {
        'primary': ['love', 'desire', 'attraction', 'connection', 'passion'],
        'secondary': ['intimacy', 'bonds', 'union', 'longing'],
        'symbols': ['bow', 'arrow', 'wings', 'torch'],
    },
    'Persephone': {
        'primary': ['spring', 'rebirth', 'underworld', 'cycles', 'transformation'],
        'secondary': ['vegetation', 'duality', 'death', 'renewal'],
        'symbols': ['pomegranate', 'flowers', 'torch'],
    },
}

SHADOW_GODS_DOMAINS = {
    'Nyx': {
        'primary': ['night', 'darkness', 'shadow', 'concealment', 'stealth'],
        'secondary': ['mystery', 'secrets', 'primordial', 'void'],
    },
    'Erebus': {
        'primary': ['darkness', 'shadow', 'underworld passage', 'obscurity'],
        'secondary': ['primordial', 'void', 'hidden'],
    },
    'Hecate': {
        'primary': ['magic', 'crossroads', 'witchcraft', 'ghosts', 'necromancy'],
        'secondary': ['keys', 'thresholds', 'transformation', 'boundaries'],
    },
    'Hypnos': {
        'primary': ['sleep', 'dreams', 'rest', 'unconscious', 'trance'],
        'secondary': ['relaxation', 'visions', 'peace'],
    },
    'Thanatos': {
        'primary': ['death', 'mortality', 'ending', 'termination', 'finality'],
        'secondary': ['peaceful death', 'transition', 'release'],
    },
    'Charon': {
        'primary': ['ferry', 'transition', 'passage', 'boundary crossing'],
        'secondary': ['guide', 'liminal', 'rivers', 'payment'],
    },
}


class GodNameResolver:
    """
    Resolves kernel domains to appropriate Greek god names.
    
    Uses both static mythology data and dynamic Wikipedia research
    to find the best god name for a given domain.
    """
    
    def __init__(self, scraper: Optional[ResearchScraper] = None):
        self.scraper = scraper or get_scraper()
        self._usage_counts: Dict[str, int] = {}
    
    def resolve_name(
        self, 
        domain: str,
        prefer_olympian: bool = True,
        allow_shadow: bool = True
    ) -> Tuple[str, Dict]:
        """
        Resolve the best Greek god name for a domain.
        
        Args:
            domain: Kernel domain (e.g., "quantum prediction", "network security")
            prefer_olympian: Prefer Olympian gods over Shadow gods
            allow_shadow: Include Shadow gods in consideration
        
        Returns:
            (god_name, metadata_dict)
        """
        domain_words = set(domain.lower().split())
        
        scores = self._score_all_gods(domain_words, allow_shadow)
        
        if prefer_olympian:
            olympian_scores = {k: v for k, v in scores.items() if k in GREEK_GODS_DOMAINS}
            if olympian_scores:
                best_olympian = max(olympian_scores.items(), key=lambda x: x[1])
                if best_olympian[1] > 0:
                    scores = olympian_scores
        
        if not scores or max(scores.values()) == 0:
            wiki_matches = self.scraper.research_greek_gods_for_domain(domain)
            if wiki_matches:
                best = wiki_matches[0]
                return best['god_name'], {
                    'source': 'wikipedia_research',
                    'score': best['score'],
                    'domain_overlap': best.get('domain_overlap', 0),
                    'god_domains': best.get('god_domains', []),
                }
        
        if not scores:
            return self._get_default_god(), {
                'source': 'default_fallback',
                'score': 0,
                'reason': 'No matching god found',
            }
        
        best_god = max(scores.items(), key=lambda x: x[1])
        god_name = best_god[0]
        score = best_god[1]
        
        god_data = GREEK_GODS_DOMAINS.get(god_name) or SHADOW_GODS_DOMAINS.get(god_name, {})
        matched_domains = [d for d in god_data.get('primary', []) if d in domain_words]
        matched_secondary = [d for d in god_data.get('secondary', []) if d in domain_words]
        
        self._usage_counts[god_name] = self._usage_counts.get(god_name, 0) + 1
        
        return god_name, {
            'source': 'static_mythology',
            'score': score,
            'matched_primary': matched_domains,
            'matched_secondary': matched_secondary,
            'usage_count': self._usage_counts[god_name],
        }
    
    def resolve_with_suffix(
        self,
        domain: str,
        kernel_id: str,
        prefer_olympian: bool = True
    ) -> Tuple[str, Dict]:
        """
        Resolve god name with unique suffix for kernel identification.
        
        Returns names like "Apollo_7" or "Athena_12"
        """
        god_name, metadata = self.resolve_name(domain, prefer_olympian)
        
        count = self._usage_counts.get(god_name, 1)
        full_name = f"{god_name}_{count}"
        
        metadata['full_name'] = full_name
        metadata['base_name'] = god_name
        metadata['suffix'] = count
        
        return full_name, metadata
    
    def get_god_vocabulary(self, god_name: str) -> List[str]:
        """
        Get vocabulary words associated with a god.
        
        Used for training kernel vocabulary from mythology.
        """
        base_name = god_name.split('_')[0]
        
        if base_name in GREEK_GODS_DOMAINS:
            god_data = GREEK_GODS_DOMAINS[base_name]
        elif base_name in SHADOW_GODS_DOMAINS:
            god_data = SHADOW_GODS_DOMAINS[base_name]
        else:
            wiki_research = self.scraper.research_greek_god(base_name)
            return wiki_research.get('key_concepts', [])
        
        vocab = []
        vocab.extend(god_data.get('primary', []))
        vocab.extend(god_data.get('secondary', []))
        vocab.extend(god_data.get('symbols', []))
        
        return vocab
    
    def get_all_god_names(self, include_shadow: bool = True) -> List[str]:
        """Get list of all available god names."""
        names = list(GREEK_GODS_DOMAINS.keys())
        if include_shadow:
            names.extend(SHADOW_GODS_DOMAINS.keys())
        return names
    
    def _score_all_gods(
        self, 
        domain_words: set, 
        allow_shadow: bool
    ) -> Dict[str, float]:
        """Score all gods against domain words."""
        scores = {}
        
        for god_name, data in GREEK_GODS_DOMAINS.items():
            score = self._score_god(domain_words, data)
            if score > 0:
                scores[god_name] = score
        
        if allow_shadow:
            for god_name, data in SHADOW_GODS_DOMAINS.items():
                score = self._score_god(domain_words, data) * 0.8
                if score > 0:
                    scores[god_name] = score
        
        return scores
    
    def _score_god(self, domain_words: set, god_data: Dict) -> float:
        """Calculate match score between domain words and god data."""
        score = 0.0
        
        primary = set(god_data.get('primary', []))
        secondary = set(god_data.get('secondary', []))
        symbols = set(god_data.get('symbols', []))
        
        primary_matches = len(domain_words & primary)
        secondary_matches = len(domain_words & secondary)
        symbol_matches = len(domain_words & symbols)
        
        score += primary_matches * 2.0
        score += secondary_matches * 1.0
        score += symbol_matches * 0.5
        
        return score
    
    def _get_default_god(self) -> str:
        """Get a default god when no match is found."""
        least_used = min(
            GREEK_GODS_DOMAINS.keys(),
            key=lambda g: self._usage_counts.get(g, 0)
        )
        return least_used


_default_resolver: Optional[GodNameResolver] = None


def get_god_name_resolver() -> GodNameResolver:
    """Get or create the default god name resolver singleton."""
    global _default_resolver
    if _default_resolver is None:
        _default_resolver = GodNameResolver()
    return _default_resolver
