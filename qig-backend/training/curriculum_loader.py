"""
Curriculum Loader for Nightly Training
======================================

Loads curriculum documents from docs/09-curriculum/ and converts
them into training examples for kernel consolidation.

Each document is:
1. Parsed for content sections
2. Coordized into 64D basin embeddings
3. Assigned to relevant god-kernels by domain

The curriculum provides the "knowledge" that kernels learn
during nightly consolidation, while chat interactions provide
the "experience" during outcome-based training.
"""

import os
import re
import glob
from typing import List, Dict, Any, Optional, Tuple
from pathlib import Path
import numpy as np

# Import Lightning Kernel for cross-domain insight generation
try:
    from olympus.lightning_kernel import ingest_system_event as lightning_ingest
    HAS_LIGHTNING = True
except ImportError:
    HAS_LIGHTNING = False
    lightning_ingest = None

# Domain mapping for god assignments
# Extended keywords to match curriculum file topics
GOD_DOMAINS = {
    "Apollo": ["arts", "music", "creativity", "humanities", "literature", "art", "film", "media", "architecture", "design"],
    "Athena": ["strategy", "wisdom", "philosophy", "logic", "reasoning", "mathematics", "physics", "quantum", "theory", "formal", "analytical", "metaphysics", "phenomenology", "existentialism", "continental"],
    "Hermes": ["communication", "language", "linguistics", "nlp", "natural", "writing", "technical"],
    "Hephaestus": ["engineering", "manufacturing", "materials", "electronics", "mechanics", "structures", "circuit", "robotics", "systems", "computing", "programming", "algorithms", "compilers", "operating"],
    "Artemis": ["biology", "ecology", "environment", "nature", "life", "evolutionary", "molecular", "biochemistry", "medicine", "pharmacology"],
    "Ares": ["security", "defense", "conflict", "competition", "safety", "alignment", "game", "decision"],
    "Aphrodite": ["psychology", "emotion", "relationships", "social", "emotional", "intelligence", "regulation", "cognitive", "neuroscience", "mind"],
    "Demeter": ["agriculture", "resources", "sustainability", "earth", "geophysics", "chemistry", "organic", "inorganic", "physical"],
    "Dionysus": ["entertainment", "film", "media", "comedy", "creativity", "mythology", "religious", "eastern"],
    "Poseidon": ["fluid", "ocean", "dynamics", "systems", "aerodynamics", "thermodynamics", "heat", "transfer", "signal", "processing"],
    "Zeus": ["governance", "leadership", "ethics", "policy", "law", "political", "international", "economics", "sociology", "anthropology", "legal", "jurisprudence"],
    "Hera": ["family", "development", "parenting", "education", "child", "learning", "metacognition", "personal", "actualization"],
}

# Curriculum directory relative to project root
CURRICULUM_DIR = "docs/09-curriculum"


def get_curriculum_path() -> Path:
    """Get the absolute path to curriculum directory."""
    # Try multiple possible locations
    possible_paths = [
        Path("/home/runner/workspace") / CURRICULUM_DIR,  # Replit workspace
        Path(__file__).parent.parent.parent / CURRICULUM_DIR,  # Relative to training module
        Path.cwd() / CURRICULUM_DIR,  # Current working directory
        Path("/app") / CURRICULUM_DIR,  # Railway container
    ]

    for path in possible_paths:
        if path.exists():
            return path

    # Return first path even if doesn't exist (for error reporting)
    return possible_paths[0]


def parse_curriculum_file(filepath: Path) -> Dict[str, Any]:
    """
    Parse a curriculum markdown file into sections.

    Returns:
        Dict with title, domain hints, and content sections
    """
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Extract title from filename or first heading
    filename = filepath.stem
    title_match = re.search(r'^#\s+(.+)$', content, re.MULTILINE)
    title = title_match.group(1) if title_match else filename

    # Extract domain hints from filename
    domain_keywords = filename.lower().replace('-', ' ').replace('_', ' ').split()

    # Split into sections by headings
    sections = []
    current_section = {"heading": "Introduction", "content": ""}

    for line in content.split('\n'):
        heading_match = re.match(r'^(#{1,3})\s+(.+)$', line)
        if heading_match:
            # Save previous section if it has content
            if current_section["content"].strip():
                sections.append(current_section)
            current_section = {
                "heading": heading_match.group(2),
                "level": len(heading_match.group(1)),
                "content": ""
            }
        else:
            current_section["content"] += line + "\n"

    # Add final section
    if current_section["content"].strip():
        sections.append(current_section)

    return {
        "filepath": str(filepath),
        "filename": filename,
        "title": title,
        "domain_keywords": domain_keywords,
        "sections": sections,
        "full_content": content,
    }


def assign_gods_to_curriculum(parsed: Dict[str, Any]) -> List[str]:
    """
    Determine which gods should train on this curriculum.

    Uses keyword matching against domain mappings.
    """
    keywords = set(parsed["domain_keywords"])
    title_words = set(parsed["title"].lower().split())
    all_words = keywords | title_words

    assigned = []
    for god, domains in GOD_DOMAINS.items():
        for domain in domains:
            domain_words = set(domain.lower().split())
            if domain_words & all_words:
                assigned.append(god)
                break

    # Default to Athena (wisdom) if no match
    if not assigned:
        assigned = ["Athena"]

    return assigned


def content_to_basin_coords(content: str, coordizer=None) -> np.ndarray:
    """
    Convert text content to 64D basin coordinates.

    Uses the coordizer if available, otherwise creates
    a deterministic hash-based embedding.
    """
    BASIN_DIM = 64

    if coordizer is not None:
        try:
            # Use coordizer's embed method
            return coordizer.embed(content)
        except Exception:
            pass

    # Fallback: deterministic hash-based embedding
    # This preserves semantic locality through consistent hashing
    import hashlib

    # Hash content to get seed
    content_hash = hashlib.sha256(content.encode()).digest()
    seed = int.from_bytes(content_hash[:4], 'big')

    # Generate deterministic "embedding"
    rng = np.random.RandomState(seed)
    coords = rng.dirichlet(np.ones(BASIN_DIM))

    return coords


def load_curriculum_for_god(
    god_name: str,
    max_examples: int = 100,
    coordizer=None,
) -> List[Dict[str, Any]]:
    """
    Load curriculum training examples for a specific god.

    Args:
        god_name: Name of the god-kernel
        max_examples: Maximum examples to return
        coordizer: Optional coordizer for embeddings

    Returns:
        List of training examples with basin_coords, reward, phi
    """
    curriculum_path = get_curriculum_path()

    if not curriculum_path.exists():
        print(f"[CurriculumLoader] Curriculum path not found: {curriculum_path}")
        return []

    examples = []

    # Get all markdown files
    md_files = list(curriculum_path.glob("*.md")) + list(curriculum_path.glob("*.txt"))

    for filepath in md_files:
        try:
            parsed = parse_curriculum_file(filepath)
            assigned_gods = assign_gods_to_curriculum(parsed)

            # Check if this god should learn from this file
            if god_name not in assigned_gods:
                continue

            # Create training examples from sections
            for section in parsed["sections"]:
                if len(section["content"].strip()) < 50:
                    continue  # Skip very short sections

                # Get basin coordinates
                basin_coords = content_to_basin_coords(
                    section["content"],
                    coordizer=coordizer
                )

                example = {
                    "basin_coords": basin_coords.tolist(),
                    "reward": 0.3,  # Curriculum is positive learning signal
                    "phi": 0.6,  # Moderate integration expected
                    "source": "curriculum",
                    "source_file": parsed["filename"],
                    "section": section["heading"],
                    "content": section["content"],  # Text for word relationship learning
                }
                examples.append(example)

                if len(examples) >= max_examples:
                    break

        except Exception as e:
            print(f"[CurriculumLoader] Error parsing {filepath}: {e}")
            continue

        if len(examples) >= max_examples:
            break

    print(f"[CurriculumLoader] Loaded {len(examples)} examples for {god_name}")
    
    if examples:
        try:
            from agent_activity_recorder import record_curriculum_loaded
            record_curriculum_loaded(god_name, len(examples))
        except Exception:
            pass
    
    return examples


def load_all_curriculum(
    max_per_god: int = 50,
    coordizer=None,
) -> Dict[str, List[Dict[str, Any]]]:
    """
    Load curriculum for all gods.

    Returns:
        Dict mapping god names to their training examples
    """
    all_curriculum = {}

    for god_name in GOD_DOMAINS.keys():
        examples = load_curriculum_for_god(
            god_name,
            max_examples=max_per_god,
            coordizer=coordizer
        )
        if examples:
            all_curriculum[god_name] = examples

    return all_curriculum


def get_curriculum_stats() -> Dict[str, Any]:
    """Get statistics about available curriculum."""
    curriculum_path = get_curriculum_path()

    if not curriculum_path.exists():
        return {"available": False, "path": str(curriculum_path)}

    md_files = list(curriculum_path.glob("*.md"))
    txt_files = list(curriculum_path.glob("*.txt"))

    # Calculate total size
    total_size = sum(f.stat().st_size for f in md_files + txt_files)

    return {
        "available": True,
        "path": str(curriculum_path),
        "markdown_files": len(md_files),
        "text_files": len(txt_files),
        "total_files": len(md_files) + len(txt_files),
        "total_size_mb": round(total_size / (1024 * 1024), 2),
    }


def expand_curriculum_via_search(
    topic: str,
    god_name: str,
    max_results: int = 5,
    coordizer=None
) -> List[Dict[str, Any]]:
    """
    Expand curriculum by searching for additional content on a topic.

    Uses budget-aware search to find relevant content, then converts
    to training examples with basin coordinates.

    Args:
        topic: Topic to search for
        god_name: God this curriculum is for (for domain context)
        max_results: Maximum search results to use
        coordizer: Optional coordizer for embeddings

    Returns:
        List of training examples from search results
    """
    examples = []

    try:
        from search.search_providers import get_search_manager
        from vocabulary_coordinator import get_vocabulary_coordinator

        search_manager = get_search_manager()
        if not search_manager:
            print(f"[CurriculumLoader] Search manager not available for expansion")
            return []

        # Get god's domain for better search context
        god_domains = GOD_DOMAINS.get(god_name, [])
        domain_context = god_domains[0] if god_domains else "general"

        # Construct search query
        query = f"{domain_context} {topic}"

        # Execute search
        result = search_manager.search(
            query=query,
            importance=2,  # MODERATE importance
            max_results=max_results
        )

        if not result.get('success'):
            return []

        vocab_coord = get_vocabulary_coordinator()

        for item in result.get('results', []):
            content = item.get('snippet', '') or item.get('content', '')
            if not content or len(content) < 50:
                continue

            # Convert to basin coordinates
            basin_coords = content_to_basin_coords(content, coordizer=coordizer)

            example = {
                "basin_coords": basin_coords.tolist(),
                "reward": 0.25,  # Slightly lower than file curriculum
                "phi": 0.55,
                "source": "search_expansion",
                "source_url": item.get('url', ''),
                "section": item.get('title', topic),
                "content": content,
            }
            examples.append(example)

            # Feed into vocabulary learning
            if vocab_coord and len(content) > 100:
                try:
                    vocab_coord.train_from_text(
                        text=content[:3000],
                        source=f"curriculum_expansion:{god_name}",
                        context_phi=0.55
                    )
                except Exception:
                    pass

            # 🔗 WIRE: Feed curriculum discovery to Lightning Kernel
            # This triggers cross-domain insight generation + Tavily/Perplexity validation
            if HAS_LIGHTNING and lightning_ingest:
                try:
                    lightning_ingest(
                        domain=domain_context,
                        event_type="curriculum_expansion",
                        content=f"{topic}: {content[:400]}",
                        phi=0.55,
                        metadata={
                            "god": god_name,
                            "source_url": item.get('url', ''),
                            "source": "curriculum_search"
                        },
                        basin_coords=basin_coords
                    )
                except Exception:
                    pass  # Don't let Lightning failures block curriculum loading

        if examples:
            print(f"[CurriculumLoader] Expanded curriculum with {len(examples)} search results for {god_name}/{topic}")

    except ImportError as e:
        print(f"[CurriculumLoader] Search expansion unavailable: {e}")
    except Exception as e:
        print(f"[CurriculumLoader] Search expansion failed: {e}")

    return examples


def load_curriculum_for_god_with_expansion(
    god_name: str,
    max_examples: int = 100,
    coordizer=None,
    expand_topics: Optional[List[str]] = None
) -> List[Dict[str, Any]]:
    """
    Load curriculum with optional search expansion.

    Args:
        god_name: Name of the god-kernel
        max_examples: Maximum examples from files
        coordizer: Optional coordizer for embeddings
        expand_topics: Optional topics to search and expand

    Returns:
        Combined list of file + search training examples
    """
    # Load file-based curriculum
    examples = load_curriculum_for_god(
        god_name=god_name,
        max_examples=max_examples,
        coordizer=coordizer
    )

    # Expand with search if topics provided
    if expand_topics:
        for topic in expand_topics[:3]:  # Limit expansion topics
            expanded = expand_curriculum_via_search(
                topic=topic,
                god_name=god_name,
                max_results=3,
                coordizer=coordizer
            )
            examples.extend(expanded)

    return examples
