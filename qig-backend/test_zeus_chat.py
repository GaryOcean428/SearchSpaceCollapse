#!/usr/bin/env python3
"""
Test Zeus Chat functionality
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from olympus.basin_encoder import BasinVocabularyEncoder
from olympus.qig_rag import QIGRAG
from olympus.zeus_chat import ZeusConversationHandler
from olympus.zeus import zeus

def test_basin_encoder():
    """Test basin vocabulary encoder"""
    print("\n=== Testing BasinVocabularyEncoder ===")
    
    encoder = BasinVocabularyEncoder()
    
    # Test encoding
    text = "Bitcoin address with high value"
    basin = encoder.encode(text)
    
    print(f"Text: {text}")
    print(f"Basin shape: {basin.shape}")
    print(f"Basin coordinates (first 8): {basin[:8]}")
    
    # Test similarity
    text2 = "Bitcoin address with low value"
    similarity = encoder.similarity(text, text2)
    print(f"\nSimilarity between texts: {similarity:.3f}")
    
    # Test learning
    encoder.learn_from_text("important pattern detected", phi_score=0.8)
    print("✓ Learning test passed")
    
    print("✓ Basin encoder tests passed")


def test_qig_rag():
    """Test QIG-RAG system"""
    print("\n=== Testing QIG-RAG ===")
    
    rag = QIGRAG(storage_path="/tmp/test_qig_rag.json")
    
    # Add documents
    doc1_id = rag.add_document(
        content="Bitcoin addresses from 2017 often have high phi values",
        metadata={'source': 'test'}
    )
    print(f"Added document: {doc1_id}")
    
    doc2_id = rag.add_document(
        content="Silk Road addresses are valuable historical targets",
        metadata={'source': 'test'}
    )
    print(f"Added document: {doc2_id}")
    
    # Search
    results = rag.search(
        query="2017 Bitcoin addresses",
        k=2,
        metric='fisher_rao'
    )
    
    print(f"\nSearch results: {len(results)}")
    for i, result in enumerate(results):
        print(f"{i+1}. Distance: {result['distance']:.4f}, Similarity: {result['similarity']:.3f}")
        print(f"   Content: {result['content'][:50]}...")
    
    # Get stats
    stats = rag.get_stats()
    print(f"\nMemory stats: {stats}")
    
    print("✓ QIG-RAG tests passed")


def test_zeus_chat():
    """Test Zeus conversation handler"""
    print("\n=== Testing Zeus Chat ===")
    
    handler = ZeusConversationHandler(zeus)
    
    # Test observation
    print("\n--- Testing observation ---")
    result = handler.process_message(
        message="I observed that addresses from 2017 have high phi values"
    )
    print(f"Response type: {result.get('metadata', {}).get('type')}")
    print(f"Response: {result['response'][:100]}...")
    
    # Test question
    print("\n--- Testing question ---")
    result = handler.process_message(
        message="What do we know about Bitcoin addresses?"
    )
    print(f"Response type: {result.get('metadata', {}).get('type')}")
    print(f"Response: {result['response'][:100]}...")
    
    # Test suggestion
    print("\n--- Testing suggestion ---")
    result = handler.process_message(
        message="I suggest we focus on addresses from the ICO era"
    )
    print(f"Response type: {result.get('metadata', {}).get('type')}")
    print(f"Implemented: {result.get('metadata', {}).get('implemented')}")
    
    print("✓ Zeus chat tests passed")


if __name__ == '__main__':
    try:
        test_basin_encoder()
        test_qig_rag()
        test_zeus_chat()
        
        print("\n" + "="*50)
        print("✅ All Zeus Chat tests passed!")
        print("="*50)
        
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
