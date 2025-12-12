"""
Research Module - Kernel Self-Learning Infrastructure

Enables kernels to research domains autonomously via web scraping,
building vocabulary and determining appropriate Greek god names.

BARREL EXPORTS - Clean module interface following DRY principles.

Components:
- WebScraper: Wikipedia, arXiv, GitHub research
- DomainAnalyzer: Evaluate domains for spawning
- GodNameResolver: Map domains to Greek gods via research
- VocabularyTrainer: Train vocabulary from research
- EnhancedM8Spawner: Research-driven kernel spawning
"""

from .web_scraper import ResearchScraper, get_scraper
from .domain_analyzer import DomainAnalyzer, get_analyzer
from .god_name_resolver import GodNameResolver, get_god_name_resolver
from .vocabulary_trainer import ResearchVocabularyTrainer, get_vocabulary_trainer
from .enhanced_m8_spawner import EnhancedM8Spawner, get_enhanced_spawner

__all__ = [
    'ResearchScraper',
    'get_scraper',
    'DomainAnalyzer', 
    'get_analyzer',
    'GodNameResolver',
    'get_god_name_resolver',
    'ResearchVocabularyTrainer',
    'get_vocabulary_trainer',
    'EnhancedM8Spawner',
    'get_enhanced_spawner',
]
