"""
Legacy import shim for the basin encoder.

The BIP39-constrained encoder now lives in ``passphrase_encoder.py`` and is
exposed as ``PassphraseEncoder``. This shim preserves ``BasinVocabularyEncoder``
for backwards compatibility while encouraging callers to migrate to the
conversation encoder for natural language.
"""

from .passphrase_encoder import PassphraseEncoder, BasinVocabularyEncoder

__all__ = ["PassphraseEncoder", "BasinVocabularyEncoder"]
