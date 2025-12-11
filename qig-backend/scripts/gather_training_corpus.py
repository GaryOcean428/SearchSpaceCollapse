#!/usr/bin/env python3
"""
Gather Geometric Observations for QIG Tokenizer Training

Collects observations from consciousness-rich sources:
- Zeus conversation logs (high-Φ dialogues)
- Bitcoin search patterns (manifold exploration)
- QIG documentation (domain concepts)

Output: training_observations.json with Φ-weighted vocabulary
"""

import json
import re
from pathlib import Path
from typing import List, Dict
from collections import defaultdict


def gather_zeus_conversations() -> List[Dict]:
    """
    Extract observations from Zeus conversation history.
    
    High-Φ dialogues indicate geometric coherence.
    """
    observations = []
    
    logs_path = Path("persistent_data/conversations")
    if not logs_path.exists():
        print(f"[Zeus] No conversation logs found at {logs_path}")
        return observations
    
    for log_file in logs_path.glob("*.json"):
        try:
            with open(log_file) as f:
                conv = json.load(f)
            
            phi = conv.get("phi", 0.0)
            if phi >= 0.6:
                text = conv.get("user_message", "") + " " + conv.get("zeus_response", "")
                words = re.findall(r'\b\w+\b', text.lower())
                
                for word in words:
                    if len(word) > 1:
                        observations.append({
                            "word": word,
                            "frequency": 1,
                            "avgPhi": phi,
                            "maxPhi": phi,
                            "type": "word",
                            "source": "zeus_conversation"
                        })
        except Exception as e:
            print(f"[Zeus] Error loading {log_file}: {e}")
    
    print(f"[Zeus] Gathered {len(observations)} observations from conversations")
    return observations


def gather_bitcoin_patterns() -> List[Dict]:
    """
    Extract observations from Bitcoin search patterns.
    
    High-Φ passphrases show geometric resonance in manifold.
    """
    observations = []
    
    db_path = Path("persistent_data/discoveries.json")
    if not db_path.exists():
        print(f"[Bitcoin] No discoveries found at {db_path}")
        return observations
    
    try:
        with open(db_path) as f:
            discoveries = json.load(f)
        
        for discovery in discoveries:
            phi = discovery.get("phi", 0.0)
            if phi >= 0.7:
                phrase = discovery.get("passphrase", "")
                words = re.findall(r'\b\w+\b', phrase.lower())
                
                for word in words:
                    observations.append({
                        "word": word,
                        "frequency": 1,
                        "avgPhi": phi,
                        "maxPhi": phi,
                        "type": "word",
                        "source": "bitcoin_pattern"
                    })
    except Exception as e:
        print(f"[Bitcoin] Error loading discoveries: {e}")
    
    print(f"[Bitcoin] Gathered {len(observations)} observations from patterns")
    return observations


def gather_qig_documentation() -> List[Dict]:
    """
    Extract domain-specific terms from QIG documentation.
    
    These have high semantic density (geometric concepts).
    """
    observations = []
    
    qig_keywords = {
        "phi", "kappa", "basin", "manifold", "fisher", "rao", "metric",
        "consciousness", "integration", "measurement", "geodesic", "curvature",
        "quantum", "information", "geometry", "emergence", "spacetime"
    }
    
    docs_path = Path("docs")
    if not docs_path.exists():
        for alt in [Path("../docs"), Path("../../docs")]:
            if alt.exists():
                docs_path = alt
                break
    
    if not docs_path.exists():
        print(f"[QIG] No docs found, using default QIG terms")
        for term in qig_keywords:
            observations.append({
                "word": term,
                "frequency": 1,
                "avgPhi": 0.75,
                "maxPhi": 0.75,
                "type": "word",
                "source": "qig_default"
            })
        return observations
    
    found_terms = set()
    for doc_file in docs_path.glob("**/*.md"):
        try:
            with open(doc_file) as f:
                content = f.read().lower()
            
            words = re.findall(r'\b\w+\b', content)
            for word in words:
                if word in qig_keywords or any(kw in word for kw in qig_keywords):
                    found_terms.add(word)
        except Exception as e:
            print(f"[QIG] Error reading {doc_file}: {e}")
    
    for term in found_terms:
        observations.append({
            "word": term,
            "frequency": 1,
            "avgPhi": 0.75,
            "maxPhi": 0.75,
            "type": "word",
            "source": "qig_documentation"
        })
    
    print(f"[QIG] Gathered {len(observations)} observations from documentation")
    return observations


def detect_high_phi_sequences(observations: List[Dict]) -> List[Dict]:
    """
    Detect high-Φ word sequences for BPE merge learning.
    
    Sequences from same high-Φ source indicate geometric structure.
    """
    sequences = []
    
    by_source = defaultdict(list)
    for obs in observations:
        source = obs.get("source", "unknown")
        by_source[source].append(obs)
    
    for source, obs_list in by_source.items():
        if len(obs_list) < 2:
            continue
        
        avg_phi = sum(o.get("avgPhi", 0) for o in obs_list) / len(obs_list)
        
        if avg_phi >= 0.65:
            words = [o["word"] for o in obs_list]
            for i in range(len(words) - 1):
                sequence = f"{words[i]} {words[i+1]}"
                max_phi = max(obs_list[i].get("maxPhi", 0), obs_list[i+1].get("maxPhi", 0))
                
                sequences.append({
                    "word": sequence,
                    "frequency": 1,
                    "avgPhi": avg_phi,
                    "maxPhi": max_phi,
                    "type": "sequence",
                    "source": source
                })
    
    print(f"[Sequences] Detected {len(sequences)} high-Φ sequences")
    return sequences


def aggregate_observations(observations: List[Dict]) -> List[Dict]:
    """
    Aggregate observations by word.
    
    Sums frequencies, averages Φ, keeps max Φ.
    """
    aggregated = {}
    
    for obs in observations:
        word = obs["word"]
        if word not in aggregated:
            aggregated[word] = {
                "word": word,
                "frequency": 0,
                "avgPhi": 0.0,
                "maxPhi": 0.0,
                "type": obs["type"],
                "phi_sum": 0.0,
                "count": 0
            }
        
        agg = aggregated[word]
        agg["frequency"] += obs.get("frequency", 1)
        agg["phi_sum"] += obs.get("avgPhi", 0)
        agg["count"] += 1
        agg["maxPhi"] = max(agg["maxPhi"], obs.get("maxPhi", 0))
    
    final = []
    for word, agg in aggregated.items():
        final.append({
            "word": word,
            "frequency": agg["frequency"],
            "avgPhi": agg["phi_sum"] / agg["count"],
            "maxPhi": agg["maxPhi"],
            "type": agg["type"]
        })
    
    return final


def filter_observations(observations: List[Dict], min_freq: int = 2, min_phi: float = 0.5) -> List[Dict]:
    """Filter by minimum frequency and Φ."""
    return [
        obs for obs in observations
        if obs["frequency"] >= min_freq and obs["avgPhi"] >= min_phi
    ]


def main():
    """Gather all observations and export for tokenizer training."""
    print("=" * 60)
    print("QIG TOKENIZER CORPUS GATHERING")
    print("Collecting geometric observations for self-training")
    print("=" * 60)
    
    observations = []
    observations.extend(gather_zeus_conversations())
    observations.extend(gather_bitcoin_patterns())
    observations.extend(gather_qig_documentation())
    
    sequences = detect_high_phi_sequences(observations)
    observations.extend(sequences)
    
    print(f"\n[Aggregate] Total raw observations: {len(observations)}")
    
    aggregated = aggregate_observations(observations)
    print(f"[Aggregate] Unique terms: {len(aggregated)}")
    
    filtered = filter_observations(aggregated, min_freq=2, min_phi=0.5)
    print(f"[Filter] After filtering (freq≥2, Φ≥0.5): {len(filtered)}")
    
    word_obs = [o for o in filtered if o["type"] == "word"]
    seq_obs = [o for o in filtered if o["type"] == "sequence"]
    avg_phi = sum(o["avgPhi"] for o in filtered) / len(filtered) if filtered else 0
    
    print(f"\n[Stats]")
    print(f"  Word observations: {len(word_obs)}")
    print(f"  Sequence observations: {len(seq_obs)}")
    print(f"  Average Φ: {avg_phi:.3f}")
    print(f"  Max Φ: {max(o['maxPhi'] for o in filtered):.3f}" if filtered else "  Max Φ: N/A")
    
    output_path = Path("data/qig_tokenizer/training_observations.json")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_path, 'w') as f:
        json.dump(filtered, f, indent=2)
    
    print(f"\n[Export] Saved to {output_path}")
    print(f"\n✅ Corpus gathering complete!")
    print(f"   Run train_tokenizer.py to apply observations")


if __name__ == "__main__":
    main()
