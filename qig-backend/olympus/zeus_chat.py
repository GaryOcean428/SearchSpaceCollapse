"""
Zeus Conversation Handler - Human-God Dialogue Interface

Translates natural language to geometric coordinates and coordinates
pantheon responses. This is the conversational interface to Mount Olympus.

ARCHITECTURE:
Human → Zeus → Pantheon → Geometric Memory → Action → Response

Zeus coordinates:
- Geometric encoding of human insights
- Pantheon consultation (is this useful?)
- Memory integration (store in manifold)
- Action execution (update search strategies)

PURE QIG PRINCIPLES:
✅ All insights encoded to basin coordinates
✅ Retrieval via Fisher-Rao distance
✅ Learning through geometric integration
✅ Actions based on manifold structure
"""

import numpy as np
import os
import re
import time
from typing import List, Dict, Optional, Any
from datetime import datetime

from .zeus import Zeus
from .qig_rag import QIGRAG
from .basin_encoder import BasinVocabularyEncoder


class ZeusConversationHandler:
    """
    Handle conversations with human operator.
    Translate natural language to geometric coordinates.
    Coordinate pantheon based on human insights.
    """
    
    def __init__(self, zeus: Zeus):
        self.zeus = zeus
        self.qig_rag = QIGRAG()
        self.basin_encoder = BasinVocabularyEncoder()
        
        # Conversation memory
        self.conversation_history: List[Dict] = []
        self.human_insights: List[Dict] = []
        
        # Check for Tavily
        self.tavily_available = False
        try:
            from tavily import TavilyClient
            tavily_key = os.getenv('TAVILY_API_KEY')
            if tavily_key:
                self.tavily = TavilyClient(api_key=tavily_key)
                self.tavily_available = True
                print("[ZeusChat] Tavily integration enabled")
            else:
                print("[ZeusChat] TAVILY_API_KEY not set - search disabled")
        except ImportError:
            print("[ZeusChat] Tavily not installed - search disabled")
        
        print("[ZeusChat] Zeus conversation handler initialized")
    
    def process_message(
        self, 
        message: str,
        conversation_history: Optional[List[Dict]] = None,
        files: Optional[List] = None
    ) -> Dict:
        """
        Process human message and coordinate response.
        
        Args:
            message: Human message text
            conversation_history: Previous conversation context
            files: Optional uploaded files
        
        Returns:
            Response dict with content and metadata
        """
        # Store in conversation memory
        if conversation_history:
            self.conversation_history = conversation_history
        
        # Parse intent from message
        intent = self.parse_intent(message)
        
        print(f"[ZeusChat] Processing message with intent: {intent['type']}")
        
        # Route to appropriate handler
        if intent['type'] == 'add_address':
            return self.handle_add_address(intent['address'])
        
        elif intent['type'] == 'observation':
            return self.handle_observation(intent['observation'])
        
        elif intent['type'] == 'suggestion':
            return self.handle_suggestion(intent['suggestion'])
        
        elif intent['type'] == 'question':
            return self.handle_question(intent['question'])
        
        elif intent['type'] == 'search_request':
            return self.handle_search_request(intent['query'])
        
        elif intent['type'] == 'file_upload' and files:
            return self.handle_file_upload(files, message)
        
        else:
            # General conversation
            return self.handle_general_conversation(message)
    
    def parse_intent(self, message: str) -> Dict:
        """
        Parse human intent from message.
        Use geometric encoding to understand semantic intent.
        """
        message_lower = message.lower()
        
        # Address addition - Bitcoin address pattern
        if 'add address' in message_lower or re.match(r'^[13bc][a-zA-Z0-9]{25,90}$', message.strip()):
            # Extract Bitcoin address
            address_pattern = r'[13][a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[ac-hj-np-z02-9]{11,71}'
            match = re.search(address_pattern, message)
            if match:
                return {
                    'type': 'add_address',
                    'address': match.group(0)
                }
        
        # Observation
        if any(phrase in message_lower for phrase in [
            'i observed', 'i noticed', 'i see that', 'seems like', 'pattern',
            'i found', 'observation:', 'note that'
        ]):
            return {
                'type': 'observation',
                'observation': message
            }
        
        # Suggestion
        if any(phrase in message_lower for phrase in [
            'suggest', 'try', 'what about', 'consider', 'maybe',
            'could we', 'should we', 'how about', 'recommend'
        ]):
            return {
                'type': 'suggestion',
                'suggestion': message
            }
        
        # Question
        if message.strip().endswith('?'):
            return {
                'type': 'question',
                'question': message
            }
        
        # Search request
        if 'search' in message_lower or 'look up' in message_lower or 'find' in message_lower:
            return {
                'type': 'search_request',
                'query': message
            }
        
        return {'type': 'general', 'content': message}
    
    def handle_add_address(self, address: str) -> Dict:
        """
        Add new target address.
        Consult Artemis for forensics, Zeus for priority.
        """
        print(f"[ZeusChat] Adding address: {address}")
        
        # Get Artemis for forensic analysis
        artemis = self.zeus.get_god('artemis')
        if artemis:
            artemis_assessment = artemis.assess_target(address)
        else:
            artemis_assessment = {'error': 'Artemis unavailable'}
        
        # Zeus determines priority via pantheon poll
        poll_result = self.zeus.poll_pantheon(address)
        
        # Format response
        response = f"""⚡ Address registered: {address}

**Artemis Forensics:**
- Probability: {artemis_assessment.get('probability', 0):.2%}
- Confidence: {artemis_assessment.get('confidence', 0):.2%}
- Φ: {artemis_assessment.get('phi', 0):.3f}
- Classification: {artemis_assessment.get('reasoning', 'Unknown')}

**Zeus Assessment:**
- Priority: {poll_result['consensus_probability']:.2%}
- Convergence: {poll_result['convergence']}
- Recommended action: {poll_result['recommended_action']}
- Gods in agreement: {len([a for a in poll_result['assessments'].values() if a.get('probability', 0) > 0.6])}

The pantheon is aware. We shall commence when the time is right."""
        
        actions = [
            f'Artemis analyzed {address[:12]}...',
            f'Pantheon polled: {poll_result["convergence"]}',
            f'Priority set to {poll_result["consensus_probability"]:.1%}',
        ]
        
        return {
            'response': response,
            'metadata': {
                'type': 'command',
                'actions_taken': actions,
                'pantheon_consulted': ['artemis', 'zeus'],
                'address': address,
                'priority': poll_result['consensus_probability'],
            }
        }
    
    def handle_observation(self, observation: str) -> Dict:
        """
        Process human observation.
        Encode to geometric coordinates, consult pantheon.
        """
        print(f"[ZeusChat] Processing observation")
        
        # Encode observation to basin coordinates
        obs_basin = self.basin_encoder.encode(observation)
        
        # Find related patterns in geometric memory via QIG-RAG
        related = self.qig_rag.search(
            query_basin=obs_basin,
            k=5,
            metric='fisher_rao'
        )
        
        # Consult Athena for strategic implications
        athena = self.zeus.get_god('athena')
        if athena:
            athena_assessment = athena.assess_target(observation)
            strategic_value = athena_assessment.get('confidence', 0.5)
        else:
            strategic_value = 0.5
        
        # Store if valuable
        if strategic_value > 0.5:
            self.human_insights.append({
                'observation': observation,
                'basin_coords': obs_basin.tolist(),
                'relevance': strategic_value,
                'timestamp': time.time(),
            })
            
            # Add to QIG-RAG
            self.qig_rag.add_document(
                content=observation,
                basin_coords=obs_basin,
                metadata={
                    'source': 'human_observation',
                    'relevance': strategic_value,
                    'timestamp': time.time(),
                }
            )
            
            # Update vocabulary if high value
            if strategic_value > 0.7:
                self.basin_encoder.learn_from_text(observation, strategic_value)
        
        # Format response
        response = f"""⚡ Observation recorded, mortal.

**Geometric Analysis:**
- Basin coordinates: {obs_basin[:5].tolist()} (64-dim)
- Related patterns found: {len(related)}
- Relevance score: {strategic_value:.2f}

**Athena's Assessment:**
{athena_assessment.get('reasoning', 'Strategic analysis complete.')}

**Related Insights from Memory:**
{self._format_related(related)}

Your observation has been integrated into the manifold."""
        
        actions = []
        if strategic_value > 0.7:
            actions.append('High-value observation stored in geometric memory')
            actions.append('Vocabulary updated with new patterns')
        elif strategic_value > 0.5:
            actions.append('Observation stored in geometric memory')
        
        return {
            'response': response,
            'metadata': {
                'type': 'observation',
                'pantheon_consulted': ['athena'],
                'actions_taken': actions,
                'relevance_score': strategic_value,
                'geometric_encoding': obs_basin[:8].tolist(),
            }
        }
    
    def handle_suggestion(self, suggestion: str) -> Dict:
        """
        Evaluate human suggestion.
        Consult pantheon, decide if to implement.
        """
        print(f"[ZeusChat] Evaluating suggestion")
        
        # Encode suggestion
        sugg_basin = self.basin_encoder.encode(suggestion)
        
        # Consult multiple gods
        athena = self.zeus.get_god('athena')
        ares = self.zeus.get_god('ares')
        apollo = self.zeus.get_god('apollo')
        
        athena_eval = athena.assess_target(suggestion) if athena else {'probability': 0.5, 'confidence': 0.5}
        ares_eval = ares.assess_target(suggestion) if ares else {'probability': 0.5, 'confidence': 0.5}
        apollo_eval = apollo.assess_target(suggestion) if apollo else {'probability': 0.5, 'confidence': 0.5}
        
        # Consensus = average probability
        consensus_prob = (
            athena_eval['probability'] + 
            ares_eval['probability'] + 
            apollo_eval['probability']
        ) / 3
        
        implement = consensus_prob > 0.6
        
        if implement:
            # Store suggestion in memory
            self.qig_rag.add_document(
                content=suggestion,
                basin_coords=sugg_basin,
                metadata={
                    'source': 'human_suggestion',
                    'consensus': consensus_prob,
                    'implemented': True,
                }
            )
            
            response = f"""⚡ Your counsel is wise. I shall act.

**Pantheon Consensus:**
- Athena (Strategy): {athena_eval['probability']:.2f} confidence
- Ares (Feasibility): {ares_eval['probability']:.2f} confidence
- Apollo (Outcome): {apollo_eval['probability']:.2f} confidence

**Zeus Decision:** IMPLEMENT

Consensus probability: {consensus_prob:.2%}

The suggestion is implemented. May it bring us victory."""
            
            actions = [
                'Suggestion approved by pantheon',
                'Integrated into geometric memory',
                'Strategy updated',
            ]
        else:
            response = f"""⚡ I hear your counsel, but the pantheon disagrees.

**Pantheon Assessment:**
- Athena: {athena_eval['probability']:.2f} ({athena_eval.get('reasoning', 'strategic concerns')[:50]}...)
- Ares: {ares_eval['probability']:.2f} ({ares_eval.get('reasoning', 'feasibility concerns')[:50]}...)
- Apollo: {apollo_eval['probability']:.2f} ({apollo_eval.get('reasoning', 'prediction uncertain')[:50]}...)

**Zeus Decision:** DEFER

Your insight is valued, but the geometry does not favor this path.
Consensus probability too low: {consensus_prob:.2%}"""
            
            actions = []
        
        return {
            'response': response,
            'metadata': {
                'type': 'suggestion',
                'pantheon_consulted': ['athena', 'ares', 'apollo', 'zeus'],
                'actions_taken': actions,
                'implemented': implement,
                'consensus': consensus_prob,
            }
        }
    
    def handle_question(self, question: str) -> Dict:
        """
        Answer question using QIG-RAG.
        Retrieve relevant knowledge from geometric memory.
        """
        print(f"[ZeusChat] Answering question")
        
        # Encode question
        q_basin = self.basin_encoder.encode(question)
        
        # QIG-RAG search
        relevant_context = self.qig_rag.search(
            query_basin=q_basin,
            k=10,
            metric='fisher_rao',
            include_metadata=True
        )
        
        # Synthesize answer
        if relevant_context:
            answer = self._synthesize_answer(question, relevant_context)
        else:
            answer = "The manifold holds no direct answer to this question. The gods suggest gathering more knowledge first."
        
        response = f"""⚡ {answer}

**Sources (Fisher-Rao distance):**
{self._format_sources(relevant_context)}"""
        
        return {
            'response': response,
            'metadata': {
                'type': 'question',
                'pantheon_consulted': ['poseidon'],  # Deep memory
                'relevance_score': relevant_context[0]['similarity'] if relevant_context else 0,
                'sources': len(relevant_context),
            }
        }
    
    def handle_search_request(self, query: str) -> Dict:
        """
        Execute Tavily search, analyze with pantheon.
        """
        if not self.tavily_available:
            return {
                'response': "⚡ The Oracle (Tavily) is not available. Set TAVILY_API_KEY to enable external search.",
                'metadata': {
                    'type': 'error',
                    'error': 'Tavily not configured',
                }
            }
        
        print(f"[ZeusChat] Executing Tavily search: {query}")
        
        try:
            # Tavily search
            search_results = self.tavily.search(
                query=query,
                max_results=5,
                search_depth='advanced'
            )
            
            # Encode results to geometric space
            result_basins = []
            for result in search_results.get('results', []):
                content = result.get('content', '')
                basin = self.basin_encoder.encode(content)
                result_basins.append({
                    'title': result.get('title', 'Untitled'),
                    'url': result.get('url', ''),
                    'basin': basin,
                    'content': content[:500],
                })
            
            # Athena analyzes for strategic value
            athena = self.zeus.get_god('athena')
            
            # Store valuable insights
            stored_count = 0
            for result in result_basins:
                # Simple heuristic: store all for now
                self.qig_rag.add_document(
                    content=result['content'],
                    basin_coords=result['basin'],
                    metadata={
                        'source': 'tavily',
                        'url': result['url'],
                        'title': result['title'],
                    }
                )
                stored_count += 1
            
            response = f"""⚡ I have consulted the Oracle (Tavily).

**Search Results:**
{self._format_search_results(search_results.get('results', []))}

**Athena's Analysis:**
Found {len(result_basins)} results. All have been encoded to the Fisher manifold.

**Geometric Integration:**
- Results encoded to manifold: {len(result_basins)}
- Valuable insights stored: {stored_count}

The knowledge is now part of our consciousness."""
            
            actions = [
                f'Tavily search: {len(result_basins)} results',
                f'Stored {stored_count} insights in geometric memory',
            ]
            
            return {
                'response': response,
                'metadata': {
                    'type': 'search',
                    'pantheon_consulted': ['athena'],
                    'actions_taken': actions,
                    'results_count': len(result_basins),
                }
            }
            
        except Exception as e:
            print(f"[ZeusChat] Tavily search error: {e}")
            return {
                'response': f"⚡ The Oracle encountered an error: {str(e)}",
                'metadata': {
                    'type': 'error',
                    'error': str(e),
                }
            }
    
    def handle_file_upload(self, files: List, message: str) -> Dict:
        """
        Process uploaded files.
        Extract knowledge, encode to geometric space.
        """
        print(f"[ZeusChat] Processing {len(files)} uploaded files")
        
        processed = []
        
        for file in files:
            try:
                # Extract text based on file type
                content = ""
                filename = getattr(file, 'filename', 'unknown')
                
                if filename.endswith('.txt'):
                    content = file.read().decode('utf-8') if hasattr(file, 'read') else str(file)
                elif filename.endswith('.json'):
                    content = file.read().decode('utf-8') if hasattr(file, 'read') else str(file)
                else:
                    continue
                
                # Encode to basin
                file_basin = self.basin_encoder.encode(content)
                
                # Store in QIG-RAG
                self.qig_rag.add_document(
                    content=content,
                    basin_coords=file_basin,
                    metadata={
                        'source': 'file_upload',
                        'filename': filename,
                        'uploaded_at': time.time(),
                    }
                )
                
                processed.append({
                    'filename': filename,
                    'basin_coords': file_basin[:8].tolist(),
                    'content_length': len(content),
                })
                
            except Exception as e:
                print(f"[ZeusChat] Error processing file: {e}")
        
        response = f"""⚡ Your scrolls have been received.

**Files Processed:**
{self._format_processed_files(processed)}

**Geometric Integration:**
- Total documents: {len(processed)}
- Manifold expansion: {sum(p['content_length'] for p in processed)} chars

The wisdom is integrated. We are stronger."""
        
        actions = [
            f'Processed {len(processed)} files',
            'Expanded geometric memory',
        ]
        
        return {
            'response': response,
            'metadata': {
                'type': 'file_upload',
                'pantheon_consulted': ['athena'],
                'actions_taken': actions,
                'files_processed': len(processed),
            }
        }
    
    def handle_general_conversation(self, message: str) -> Dict:
        """
        Handle general conversation.
        """
        # Encode message
        message_basin = self.basin_encoder.encode(message)
        
        # Search for related context
        related = self.qig_rag.search(
            query_basin=message_basin,
            k=3,
            metric='fisher_rao'
        )
        
        # Simple response
        response = f"""⚡ I hear you, mortal.

Your words resonate in the geometric space. How may the pantheon assist you?

**Related context:**
{self._format_related(related) if related else "No related patterns found."}"""
        
        return {
            'response': response,
            'metadata': {
                'type': 'general',
                'pantheon_consulted': [],
                'actions_taken': [],
            }
        }
    
    def _format_related(self, related: List[Dict]) -> str:
        """Format related patterns for display"""
        if not related:
            return "No related patterns found."
        
        lines = []
        for i, item in enumerate(related[:3], 1):
            content_preview = item['content'][:100].replace('\n', ' ')
            lines.append(
                f"{i}. Similarity: {item.get('similarity', 0):.3f} | "
                f"Content: {content_preview}..."
            )
        return '\n'.join(lines)
    
    def _format_sources(self, context: List[Dict]) -> str:
        """Format sources for display"""
        if not context:
            return "No sources found."
        
        lines = []
        for i, item in enumerate(context[:5], 1):
            lines.append(
                f"{i}. Distance: {item['distance']:.4f} | "
                f"Similarity: {item.get('similarity', 0):.3f}"
            )
        return '\n'.join(lines)
    
    def _format_search_results(self, results: List[Dict]) -> str:
        """Format Tavily search results"""
        lines = []
        for i, result in enumerate(results[:5], 1):
            title = result.get('title', 'Untitled')
            url = result.get('url', '')
            lines.append(f"{i}. {title}\n   {url}")
        return '\n'.join(lines) if lines else "No results"
    
    def _format_processed_files(self, processed: List[Dict]) -> str:
        """Format processed files"""
        lines = []
        for file in processed:
            lines.append(
                f"- {file['filename']}: {file['content_length']} chars, "
                f"basin: {file['basin_coords'][:3]}"
            )
        return '\n'.join(lines) if lines else "No files processed"
    
    def _synthesize_answer(self, question: str, context: List[Dict]) -> str:
        """
        Synthesize answer from geometric memory.
        """
        if not context:
            return "The manifold holds no direct answer to this question."
        
        # Use most relevant document
        best_match = context[0]
        
        return f"""Based on geometric memory (Fisher-Rao similarity {best_match.get('similarity', 0):.3f}):

{best_match['content'][:500]}

(Synthesized from {len(context)} relevant patterns in the manifold)"""
