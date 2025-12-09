"""Holographic Transform submodule"""
from .dimensional_state import DimensionalState, DimensionalStateManager
from .compressor import compress, estimate_compression_ratio, get_compressed_size
from .decompressor import decompress, expand_for_modification, estimate_decompression_cost
from .basin_encoder import BasinEncoder, SemanticBasinEncoder, encode_for_qig, encode_batch

__all__ = [
    'DimensionalState',
    'DimensionalStateManager',
    'compress',
    'decompress',
    'estimate_compression_ratio',
    'get_compressed_size',
    'expand_for_modification',
    'estimate_decompression_cost',
    'BasinEncoder',
    'SemanticBasinEncoder',
    'encode_for_qig',
    'encode_batch',
]
