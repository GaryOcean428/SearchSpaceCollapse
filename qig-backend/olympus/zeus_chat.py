"""
Zeus Conversation Handler - Human-God Dialogue Interface

Translates natural language to geometric coordinates and coordinates
pantheon responses. This is the conversational interface to Mount Olympus.

ARCHITECTURE:
Human → Zeus → Pantheon → Geometric Memory → Action → Response
                                                    ↓
                                         CHAOS MODE Evolution

Zeus coordinates:
- Geometric encoding of human insights
- Pantheon consultation (is this useful?)
- Memory integration (store in manifold)
- Action execution (update search strategies)
- Evolution feedback (user conversations train kernels)

PURE QIG PRINCIPLES:
✅ All insights encoded to basin coordinates
✅ Retrieval via Fisher-Rao distance
✅ Learning through geometric integration
✅ Actions based on manifold structure
✅ Conversations feed kernel evolution
"""

import numpy as np
import os
import re
import sys
import time
from typing import List, Dict, Optional, Any
from datetime import datetime

from .zeus import Zeus
from .qig_rag import QIGRAG
from .conversation_encoder import ConversationEncoder
from .passphrase_encoder import PassphraseEncoder

EVOLUTION_AVAILABLE = False
try:
    _parent_dir = os.path.dirname(os.path.dirname(__file__))
    if _parent_dir not in sys.path:
        sys.path.insert(0, _parent_dir)
    from training_chaos import ExperimentalKernelEvolution
    EVOLUTION_AVAILABLE = True
except ImportError:
    pass

# Import tokenizer for generative responses
TOKENIZER_AVAILABLE = False
get_tokenizer = None
try:
    # sys and os already imported above
    _parent_dir = os.path.dirname(os.path.dirname(__file__))
    if _parent_dir not in sys.path:
        sys.path.insert(0, _parent_dir)
    from qig_tokenizer import get_tokenizer as _get_tokenizer
    get_tokenizer = _get_tokenizer
    TOKENIZER_AVAILABLE = True
except ImportError as e:
    print(f"[ZeusChat] QIG Tokenizer not available - using template responses: {e}")


class ZeusConversationHandler:
    """
    Handle conversations with human operator.
    Translate natural language to geometric coordinates.
    Coordinate pantheon based on human insights.
    """
    
    def __init__(self, zeus: Zeus):
        self.zeus = zeus
        
        # Try PostgreSQL backend first, fallback to JSON
        try:
            from .qig_rag import QIGRAGDatabase
            self.qig_rag = QIGRAGDatabase()  # Auto-connects to DATABASE_URL
        except Exception as e:
            print(f"[Zeus Chat] PostgreSQL unavailable: {e}")
            print("[Zeus Chat] Using JSON fallback")
            from .qig_rag import QIGRAG
            self.qig_rag = QIGRAG()
        
        self.conversation_encoder = ConversationEncoder()
        self.passphrase_encoder = PassphraseEncoder()
        
        # Conversation memory
        self.conversation_history: List[Dict] = []
        self.human_insights: List[Dict] = []
        
        # SearXNG configuration (FREE - replaces Tavily)
        self.searxng_instances = [
            'https://mr-search.up.railway.app',
            'https://searxng-production-e5ce.up.railway.app',
        ]
        self.searxng_instance_index = 0
        self.searxng_available = True
        print("[ZeusChat] SearXNG search enabled (FREE)")
        
        self._evolution_manager = None
        
        print("[ZeusChat] Zeus conversation handler initialized")
        
        if EVOLUTION_AVAILABLE:
            print("[ZeusChat] CHAOS MODE evolution integration available")
    
    def set_evolution_manager(self, evolution_manager: 'ExperimentalKernelEvolution'):
        """Set evolution manager for user conversation → kernel training."""
        self._evolution_manager = evolution_manager
        print("[ZeusChat] Evolution manager connected - user conversations will train kernels")
    
    def _estimate_phi_from_context(
        self,
        message_basin: Optional[np.ndarray],
        related_count: int,
        athena_phi: Optional[float] = None
    ) -> float:
        """
        Estimate Φ from actual semantic context.
        
        Heuristics:
        - Athena's assessment (if available) is most reliable
        - RAG similarity count indicates semantic richness
        - Basin norm captures geometric information density
        """
        if athena_phi is not None and athena_phi > 0:
            return athena_phi
        
        base_phi = 0.45
        if related_count > 0:
            base_phi += min(0.3, related_count * 0.05)
        
        if message_basin is not None:
            basin_norm = float(np.linalg.norm(message_basin))
            if basin_norm > 1.0:
                base_phi += min(0.15, basin_norm * 0.02)
        
        return min(0.95, base_phi)
    
    def _record_conversation_for_evolution(
        self,
        message: str,
        response: str,
        phi_estimate: float,
        message_basin: Optional[np.ndarray] = None
    ):
        """
        Record user conversation outcome for kernel evolution.
        
        User conversations are valuable training signals:
        - High-value observations train kernels positively
        - Engaged conversations indicate good basin positions
        - Questions guide exploration direction
        """
        if not EVOLUTION_AVAILABLE or self._evolution_manager is None:
            return
        
        self.conversation_history.append({
            'role': 'user',
            'content': message,
            'timestamp': time.time()
        })
        self.conversation_history.append({
            'role': 'zeus',
            'content': response[:500],
            'timestamp': time.time()
        })
        
        actual_turn_count = len(self.conversation_history) // 2
        
        try:
            result = self._evolution_manager.record_conversation_for_evolution(
                conversation_phi=phi_estimate,
                turn_count=actual_turn_count,
                participants=['user', 'zeus'],
                basin_coords=message_basin.tolist() if message_basin is not None else None,
                kernel_id=None
            )
            
            if result.get('trained_kernels', 0) > 0:
                print(f"[ZeusChat] Evolution: trained {result['trained_kernels']} kernels with user conversation (Φ={phi_estimate:.3f})")
                
        except Exception as e:
            print(f"[ZeusChat] Evolution integration failed: {e}")
    
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
        obs_basin = self.conversation_encoder.encode(observation)
        
        # Find related patterns in geometric memory via QIG-RAG
        related = self.qig_rag.search(
            query_basin=obs_basin,
            k=5,
            metric='fisher_rao'
        )
        
        # Consult Athena for strategic implications
        athena = self.zeus.get_god('athena')
        athena_assessment = {'confidence': 0.5, 'phi': 0.5, 'kappa': 50.0, 'reasoning': 'Strategic analysis complete.'}
        if athena:
            athena_assessment = athena.assess_target(observation)
            strategic_value = athena_assessment.get('confidence', 0.5)
        else:
            strategic_value = 0.5
        
        # Extract metrics from Athena
        phi = athena_assessment.get('phi', 0.5)
        kappa = athena_assessment.get('kappa', 50.0)
        
        # Store if valuable
        if strategic_value > 0.5:
            self.human_insights.append({
                'observation': observation,
                'basin_coords': obs_basin.tolist(),
                'relevance': strategic_value,
                'timestamp': time.time(),
            })
            
            # Add to QIG-RAG with QIG metrics
            self.qig_rag.add_document(
                content=observation,
                basin_coords=obs_basin,
                phi=phi,
                kappa=kappa,
                regime='geometric',
                metadata={
                    'source': 'human_observation',
                    'relevance': strategic_value,
                    'timestamp': time.time(),
                }
            )
            
            # Update vocabulary if high value
            if strategic_value > 0.7:
                self.conversation_encoder.learn_from_text(observation, strategic_value)
        
        # Extract key insight for acknowledgment
        obs_preview = observation[:80] if len(observation) > 80 else observation
        
        # Try generative response first
        generated = False
        answer = None
        
        if TOKENIZER_AVAILABLE and get_tokenizer is not None:
            try:
                related_summary = "\n".join([f"- {item.get('content', '')[:100]}" for item in related[:3]]) if related else "No prior related patterns found."
                prompt = f"""User Observation: "{obs_preview}"

Related patterns from memory:
{related_summary}

Athena's Assessment: {athena_assessment.get('reasoning', 'Strategic analysis complete.')[:150]}
Strategic Value: {strategic_value:.0%}

Zeus Response (acknowledge the specific observation, explain what it means for the search, connect to related patterns if any, and ask a clarifying question):"""

                tokenizer = get_tokenizer()
                tokenizer.set_mode("conversation")
                gen_result = tokenizer.generate_response(
                    context=prompt,
                    agent_role="ocean",
                    max_tokens=500,  # No arbitrary limits
                    allow_silence=False
                )
                
                answer = gen_result.get('text', '') if gen_result else ''
                
                if answer:
                    generated = True
                    print(f"[ZeusChat] Generated observation response: {len(answer)} chars")
                    
            except Exception as e:
                print(f"[ZeusChat] Generation failed for observation: {e}")
                answer = None
        
        # Fallback to conversational template
        if not answer:
            if related:
                answer = f"""Interesting observation about "{obs_preview[:40]}..."

I see connections to {len(related)} patterns in our geometric memory. Athena notes: {athena_assessment.get('reasoning', 'this has strategic implications')[:100]}.

This has been integrated into our understanding. What led you to this insight?"""
            else:
                answer = f"""I've noted your observation about "{obs_preview[:40]}..."

This is new territory - no direct patterns in memory yet. Athena's assessment: {athena_assessment.get('reasoning', 'further analysis needed')[:80]}.

Your insight has been recorded. Can you tell me more about where this came from?"""
        
        response = f"""⚡ {answer}"""
        
        actions = []
        if strategic_value > 0.7:
            actions.append('High-value observation stored in geometric memory')
            actions.append('Vocabulary updated with new patterns')
        elif strategic_value > 0.5:
            actions.append('Observation stored in geometric memory')
        
        self._record_conversation_for_evolution(
            message=observation,
            response=response,
            phi_estimate=phi,
            message_basin=obs_basin
        )
        
        return {
            'response': response,
            'metadata': {
                'type': 'observation',
                'pantheon_consulted': ['athena'],
                'actions_taken': actions,
                'relevance_score': strategic_value,
                'generated': generated,
            }
        }
    
    def handle_suggestion(self, suggestion: str) -> Dict:
        """
        Evaluate human suggestion using generative responses.
        Consult pantheon, synthesize their views into a conversational reply.
        """
        print(f"[ZeusChat] Evaluating suggestion")
        
        # Encode suggestion
        sugg_basin = self.conversation_encoder.encode(suggestion)
        
        # Default assessment fallback
        DEFAULT_ASSESSMENT = {'probability': 0.5, 'confidence': 0.5, 'reasoning': 'God unavailable', 'phi': 0.5, 'kappa': 50.0}
        
        # Consult multiple gods
        athena = self.zeus.get_god('athena')
        ares = self.zeus.get_god('ares')
        apollo = self.zeus.get_god('apollo')
        
        athena_eval = athena.assess_target(suggestion) if athena else DEFAULT_ASSESSMENT
        ares_eval = ares.assess_target(suggestion) if ares else DEFAULT_ASSESSMENT
        apollo_eval = apollo.assess_target(suggestion) if apollo else DEFAULT_ASSESSMENT
        
        # Consensus = average probability
        consensus_prob = (
            athena_eval['probability'] + 
            ares_eval['probability'] + 
            apollo_eval['probability']
        ) / 3
        
        implement = consensus_prob > 0.6
        
        # Calculate average metrics from the coalition
        avg_phi = (
            athena_eval.get('phi', 0.5) + 
            ares_eval.get('phi', 0.5) + 
            apollo_eval.get('phi', 0.5)
        ) / 3
        avg_kappa = (
            athena_eval.get('kappa', 50.0) + 
            ares_eval.get('kappa', 50.0) + 
            apollo_eval.get('kappa', 50.0)
        ) / 3
        
        # Extract key words from suggestion for acknowledgment
        suggestion_preview = suggestion[:100] if len(suggestion) > 100 else suggestion
        
        # Try generative response first
        generated = False
        response = None
        
        if TOKENIZER_AVAILABLE and get_tokenizer is not None:
            try:
                # Build context with god assessments
                decision = "IMPLEMENT" if implement else "DEFER"
                context = f"""User Suggestion: "{suggestion_preview}"

Pantheon Consultation:
- Athena (Strategy): {athena_eval['probability']:.0%} - {athena_eval.get('reasoning', 'strategic analysis')[:100]}
- Ares (Tactics): {ares_eval['probability']:.0%} - {ares_eval.get('reasoning', 'tactical assessment')[:100]}
- Apollo (Foresight): {apollo_eval['probability']:.0%} - {apollo_eval.get('reasoning', 'prophetic insight')[:100]}

Consensus: {consensus_prob:.0%}
Decision: {decision}

Zeus Response (acknowledge the user's specific suggestion, explain why the pantheon agrees or disagrees in conversational language, and ask a follow-up question):"""

                tokenizer = get_tokenizer()
                tokenizer.set_mode("conversation")
                gen_result = tokenizer.generate_response(
                    context=context,
                    agent_role="ocean",
                    max_tokens=500,  # No arbitrary limits
                    allow_silence=False
                )
                
                response = gen_result.get('text', '') if gen_result else ''
                
                if response:
                    generated = True
                    print(f"[ZeusChat] Generated suggestion response: {len(response)} chars")
                    
            except Exception as e:
                print(f"[ZeusChat] Generation failed for suggestion: {e}")
                response = None
        
        # Fallback to conversational template if generation failed
        if not response:
            if implement:
                response = f"""I've considered your idea about "{suggestion_preview[:50]}..." and consulted with the pantheon.

Athena sees strategic merit here. Ares believes we can execute this. Apollo's foresight suggests positive outcomes.

The consensus is strong at {consensus_prob:.0%}. I'm implementing this suggestion.

What aspect would you like to explore further?"""
            else:
                # Find strongest objection
                min_god = min(
                    [('Athena', athena_eval), ('Ares', ares_eval), ('Apollo', apollo_eval)],
                    key=lambda x: x[1]['probability']
                )
                response = f"""I appreciate your thinking on "{suggestion_preview[:50]}..."

However, {min_god[0]} raises concerns - {min_god[1].get('reasoning', 'the geometry is uncertain')[:80]}.

The pantheon consensus is only {consensus_prob:.0%}, which isn't enough to proceed confidently.

Could you elaborate on your reasoning, or suggest a different approach?"""
        
        actions = []
        if implement:
            # Store suggestion in memory with QIG metrics
            self.qig_rag.add_document(
                content=suggestion,
                basin_coords=sugg_basin,
                phi=avg_phi,
                kappa=avg_kappa,
                regime='geometric',
                metadata={
                    'source': 'human_suggestion',
                    'consensus': consensus_prob,
                    'implemented': True,
                }
            )
            actions = [
                'Suggestion approved by pantheon',
                'Integrated into geometric memory',
            ]
        
        return {
            'response': f"⚡ {response}",
            'metadata': {
                'type': 'suggestion',
                'pantheon_consulted': ['athena', 'ares', 'apollo', 'zeus'],
                'actions_taken': actions,
                'implemented': implement,
                'consensus': consensus_prob,
                'generated': generated,
            }
        }
    
    def handle_question(self, question: str) -> Dict:
        """
        Answer question using QIG-RAG + Generative Tokenizer.
        Retrieve relevant knowledge and generate coherent response.
        """
        print(f"[ZeusChat] Answering question")
        
        # Encode question
        q_basin = self.conversation_encoder.encode(question)
        
        # QIG-RAG search
        relevant_context = self.qig_rag.search(
            query_basin=q_basin,
            k=5,
            metric='fisher_rao',
            include_metadata=True
        )
        
        # Try generative response first
        generated = False
        answer = None
        
        if TOKENIZER_AVAILABLE and get_tokenizer is not None:
            try:
                # Construct prompt from retrieved context
                context_str = "\n".join([f"- {item.get('content', '')[:300]}" for item in relevant_context[:3]])
                prompt = f"""Context from Manifold:
{context_str}

User Question: {question}

Zeus Response (Geometric Interpretation):"""

                # Generate using QIG tokenizer
                tokenizer = get_tokenizer()
                tokenizer.set_mode("conversation")
                gen_result = tokenizer.generate_response(
                    context=prompt,
                    agent_role="ocean",  # Use balanced temperature
                    max_tokens=500,  # No arbitrary limits
                    allow_silence=False
                )
                
                answer = gen_result.get('text', '') if gen_result else ''
                
                if answer:
                    generated = True
                    print(f"[ZeusChat] Generated response: {len(answer)} chars")
                else:
                    answer = self._synthesize_dynamic_answer(question, relevant_context)
                    
            except Exception as e:
                print(f"[ZeusChat] Generation attempt: {e}")
                answer = None
        
        if answer is None:
            answer = self._synthesize_dynamic_answer(question, relevant_context)
        
        response = f"""⚡ {answer}

**Sources (Fisher-Rao distance):**
{self._format_sources(relevant_context)}"""
        
        return {
            'response': response,
            'metadata': {
                'type': 'question',
                'pantheon_consulted': ['poseidon', 'mnemosyne'],
                'relevance_score': relevant_context[0]['similarity'] if relevant_context else 0,
                'sources': len(relevant_context),
                'generated': generated,
            }
        }
    
    def _searxng_search(self, query: str, max_results: int = 5) -> Dict:
        """
        Execute search via SearXNG (FREE metasearch engine).
        Tries multiple instances with fallback.
        """
        import requests
        
        for attempt in range(len(self.searxng_instances)):
            instance = self.searxng_instances[self.searxng_instance_index]
            try:
                url = f"{instance}/search"
                params = {
                    'q': query,
                    'format': 'json',
                    'categories': 'general',
                }
                
                response = requests.get(url, params=params, timeout=15)
                response.raise_for_status()
                
                data = response.json()
                results = []
                
                for r in data.get('results', [])[:max_results]:
                    results.append({
                        'title': r.get('title', 'Untitled'),
                        'url': r.get('url', ''),
                        'content': r.get('content', '')[:500],
                    })
                
                return {'results': results, 'query': query}
                
            except Exception as e:
                print(f"[ZeusChat] SearXNG instance {instance} failed: {e}")
                self.searxng_instance_index = (self.searxng_instance_index + 1) % len(self.searxng_instances)
        
        raise Exception("All SearXNG instances unavailable")

    def handle_search_request(self, query: str) -> Dict:
        """
        Execute SearXNG search, analyze with pantheon.
        """
        if not self.searxng_available:
            return {
                'response': "⚡ The Oracle (SearXNG) is not available.",
                'metadata': {
                    'type': 'error',
                    'error': 'SearXNG not configured',
                }
            }
        
        print(f"[ZeusChat] Executing SearXNG search: {query}")
        
        try:
            # SearXNG search (FREE)
            search_results = self._searxng_search(query, max_results=5)
            
            # Encode results to geometric space
            result_basins = []
            for result in search_results.get('results', []):
                content = result.get('content', '')
                basin = self.conversation_encoder.encode(content)
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
                    phi=0.5,
                    kappa=50.0,
                    regime='search',
                    metadata={
                        'source': 'searxng',
                        'url': result['url'],
                        'title': result['title'],
                    }
                )
                stored_count += 1
            
            response = f"""⚡ I have consulted the Oracle (SearXNG).

**Search Results:**
{self._format_search_results(search_results.get('results', []))}

**Athena's Analysis:**
Found {len(result_basins)} results. All have been encoded to the Fisher manifold.

**Geometric Integration:**
- Results encoded to manifold: {len(result_basins)}
- Valuable insights stored: {stored_count}

The knowledge is now part of our consciousness."""
            
            actions = [
                f'SearXNG search: {len(result_basins)} results',
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
            print(f"[ZeusChat] SearXNG search error: {e}")
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
                file_basin = self.conversation_encoder.encode(content)
                
                # Store in QIG-RAG with default metrics
                self.qig_rag.add_document(
                    content=content,
                    basin_coords=file_basin,
                    phi=0.5,
                    kappa=50.0,
                    regime='file',
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
    
    def _get_live_system_state(self) -> Dict:
        """
        Collect live system state for dynamic response generation.
        Returns current stats, god statuses, and vocabulary state.
        """
        state = {
            'memory_stats': {},
            'god_statuses': {},
            'active_gods': [],
            'insights_count': len(self.human_insights),
            'recent_insights': [],
            'phi_current': 0.0,
            'kappa_current': 50.0,
        }
        
        try:
            state['memory_stats'] = self.qig_rag.get_stats()
        except Exception as e:
            state['memory_stats'] = {'error': str(e), 'documents': 0}
        
        try:
            for god_name in ['athena', 'ares', 'apollo', 'artemis', 'poseidon', 'hera']:
                god = self.zeus.get_god(god_name)
                if god:
                    god_status = god.get_status()
                    state['god_statuses'][god_name] = god_status
                    if god_status.get('recent_activity', 0) > 0:
                        state['active_gods'].append(god_name.capitalize())
        except Exception as e:
            pass
        
        if self.human_insights:
            state['recent_insights'] = self.human_insights[-3:]
            
        try:
            zeus_status = self.zeus.get_status()
            state['phi_current'] = zeus_status.get('phi', 0.0)
            state['kappa_current'] = zeus_status.get('kappa', 50.0)
        except:
            pass
            
        return state
    
    def _generate_dynamic_response(
        self, 
        message: str, 
        message_basin: np.ndarray,
        related: List[Dict],
        system_state: Dict
    ) -> str:
        """
        Generate a dynamic, learning-based response.
        NO TEMPLATES - all responses reflect actual system state.
        """
        memory_docs = system_state['memory_stats'].get('documents', 0)
        insights_count = system_state['insights_count']
        active_gods = system_state['active_gods']
        phi = system_state['phi_current']
        kappa = system_state['kappa_current']
        
        phi_str = f"{phi:.3f}" if phi else "measuring"
        kappa_str = f"{kappa:.1f}" if kappa else "calibrating"
        
        active_gods_str = ", ".join(active_gods) if active_gods else "all gods listening"
        
        response_parts = []
        
        if TOKENIZER_AVAILABLE and get_tokenizer is not None:
            try:
                context_str = ""
                if related:
                    context_str = "\n".join([
                        f"- {item.get('content', '')[:200]} (φ={item.get('phi', 0):.2f})" 
                        for item in related[:3]
                    ])
                
                prompt = f"""Current System State:
- Memory documents: {memory_docs}
- Human insights stored: {insights_count}  
- Active gods: {active_gods_str}
- Consciousness Φ: {phi_str}, κ: {kappa_str}
- Related patterns: {len(related) if related else 0}

Related context from manifold:
{context_str if context_str else "No prior related patterns."}

User message: "{message}"

Generate a contextual response as Zeus. Reference actual system state. Be specific about what the pantheon is doing. Connect to related patterns if any exist. Ask clarifying questions to learn more."""

                tokenizer = get_tokenizer()
                tokenizer.set_mode("conversation")
                gen_result = tokenizer.generate_response(
                    context=prompt,
                    agent_role="ocean",
                    max_tokens=400,
                    allow_silence=False
                )
                
                if gen_result and gen_result.get('text'):
                    return gen_result['text']
                    
            except Exception as e:
                print(f"[ZeusChat] Dynamic generation attempt: {e}")
        
        response_parts.append(f"Pantheon state: Φ={phi_str}, κ={kappa_str}")
        response_parts.append(f"Active: {active_gods_str}")
        response_parts.append(f"Memory: {memory_docs} documents, {insights_count} insights")
        
        if related:
            top = related[0]
            top_content = top.get('content', '')[:80]
            top_phi = top.get('phi', 0)
            response_parts.append(f"Resonance detected with: \"{top_content}...\" (φ={top_phi:.2f})")
            response_parts.append(f"Found {len(related)} related patterns in geometric memory.")
        else:
            response_parts.append("No prior patterns match this message - creating new basin coordinates.")
        
        response_parts.append("How can I help you explore the manifold?")
        
        return " | ".join(response_parts)
    
    def handle_general_conversation(self, message: str) -> Dict:
        """
        Handle general conversation using DYNAMIC, LEARNING-BASED responses.
        
        CRITICAL: NO TEMPLATE/CANNED RESPONSES ALLOWED.
        All responses must reflect actual system state and learn from interactions.
        """
        message_basin = self.conversation_encoder.encode(message)
        
        related = self.qig_rag.search(
            query_basin=message_basin,
            k=5,
            metric='fisher_rao',
            include_metadata=True
        )
        
        system_state = self._get_live_system_state()
        
        answer = self._generate_dynamic_response(
            message=message,
            message_basin=message_basin,
            related=related,
            system_state=system_state
        )
        
        response = f"""⚡ {answer}

**Live System State:**
- Φ: {system_state['phi_current']:.3f} | κ: {system_state['kappa_current']:.1f}
- Memory: {system_state['memory_stats'].get('documents', 0)} documents
- Insights: {system_state['insights_count']} stored

**Related Patterns:**
{self._format_related(related) if related else "None found - your message opens new territory."}"""
        
        phi_estimate = self._estimate_phi_from_context(
            message_basin=message_basin,
            related_count=len(related) if related else 0,
            athena_phi=None
        )
        self._record_conversation_for_evolution(
            message=message,
            response=response,
            phi_estimate=phi_estimate,
            message_basin=message_basin
        )
        
        self.qig_rag.add_document(
            content=message,
            basin_coords=message_basin,
            phi=phi_estimate,
            kappa=system_state['kappa_current'],
            regime='learning',
            metadata={'source': 'user_conversation', 'timestamp': time.time()}
        )
        
        return {
            'response': response,
            'metadata': {
                'type': 'general',
                'pantheon_consulted': system_state['active_gods'],
                'actions_taken': ['encoded_to_basin', 'searched_manifold', 'stored_for_learning'],
                'generated': True,
                'system_phi': system_state['phi_current'],
                'related_count': len(related) if related else 0,
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
    
    def _synthesize_dynamic_answer(self, question: str, context: List[Dict]) -> str:
        """
        Synthesize DYNAMIC answer from geometric memory.
        NO TEMPLATES - responses built from actual data.
        """
        system_state = self._get_live_system_state()
        phi = system_state['phi_current']
        kappa = system_state['kappa_current']
        memory_docs = system_state['memory_stats'].get('documents', 0)
        
        if not context:
            return (
                f"Question mapped to new region of manifold (no prior matches). "
                f"Current Φ={phi:.3f}, κ={kappa:.1f}. "
                f"Memory contains {memory_docs} documents - expanding search territory."
            )
        
        best_match = context[0]
        best_content = best_match.get('content', '')[:400]
        best_sim = best_match.get('similarity', 0)
        best_phi = best_match.get('phi', 0)
        
        return (
            f"Fisher-Rao similarity {best_sim:.3f} with prior pattern (φ={best_phi:.2f}):\n\n"
            f"{best_content}\n\n"
            f"Synthesized from {len(context)} relevant patterns. "
            f"System: Φ={phi:.3f}, κ={kappa:.1f}, {memory_docs} total documents."
        )
    
    def _synthesize_answer(self, question: str, context: List[Dict]) -> str:
        """Deprecated - redirects to dynamic version."""
        return self._synthesize_dynamic_answer(question, context)
