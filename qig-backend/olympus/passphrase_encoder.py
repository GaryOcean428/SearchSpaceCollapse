"""
Passphrase Encoder - BIP39 Text to 64D Basin Coordinates

This module is intentionally constrained to the BIP39 word list so that
Bitcoin passphrase generation remains deterministic and security-aligned.
It should NOT be used for conversational responses. For natural language
chat, use ``ConversationEncoder``.
"""

import os
from typing import Optional

from .base_encoder import BaseEncoder

BASIN_DIMENSION = 64


class PassphraseEncoder(BaseEncoder):
    """
    Encode text to 64D basin coordinates using BIP39-only vocabulary.

    This preserves the legacy basin encoding behaviour for mnemonic search
    while keeping conversational language in a separate encoder.
    """

    # Override base class defaults to match original PassphraseEncoder behavior
    unknown_token_phi = 0.3  # Lower phi for unknown tokens in passphrase mode
    tokenize_pattern = r'\b\w+\b'  # No apostrophes in BIP39 words

    def __init__(self, vocab_path: Optional[str] = None):
        # Set default path before calling parent __init__
        if vocab_path is None:
            vocab_path = "data/basin_vocab.json"
        super().__init__(vocab_path)
        
    def _load_vocabulary(self) -> None:
        """Load BIP39 wordlist as base vocabulary."""
        bip39_path = os.path.join(os.path.dirname(__file__), "..", "bip39_wordlist.txt")
        
        if os.path.exists(bip39_path):
            with open(bip39_path, 'r') as f:
                words = [line.strip() for line in f if line.strip()]
                
            # Encode each BIP39 word to basin
            for word in words:
                basin = self._hash_to_basin(word)
                self.token_vocab[word.lower()] = basin
                self.token_frequencies[word.lower()] = 1
                self.token_phi_scores[word.lower()] = 0.5  # Neutral baseline
        
        print(f"[PassphraseEncoder] Loaded {len(self.token_vocab)} BIP39 tokens")


# Backwards compatibility for legacy imports
BasinVocabularyEncoder = PassphraseEncoder
