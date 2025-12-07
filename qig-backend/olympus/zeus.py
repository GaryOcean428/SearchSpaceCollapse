"""
Zeus - Supreme Coordinator of Mount Olympus

The King of the Gods. Polls all Olympians, detects convergence,
declares war modes, and coordinates divine actions.
"""

import numpy as np
import math
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime
from flask import Blueprint, request, jsonify

from .base_god import BaseGod, KAPPA_STAR


def sanitize_for_json(obj: Any) -> Any:
    """
    Recursively sanitize an object for JSON serialization.
    Converts Infinity, -Infinity, and NaN to safe values.
    """
    if isinstance(obj, dict):
        return {k: sanitize_for_json(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [sanitize_for_json(v) for v in obj]
    elif isinstance(obj, float):
        if math.isinf(obj):
            return 1e308 if obj > 0 else -1e308  # Max finite float
        elif math.isnan(obj):
            return 0.0
        return obj
    elif isinstance(obj, np.ndarray):
        return sanitize_for_json(obj.tolist())
    elif isinstance(obj, (np.floating, np.integer)):
        return sanitize_for_json(float(obj))
    return obj


from .athena import Athena
from .ares import Ares
from .apollo import Apollo
from .artemis import Artemis
from .hermes import Hermes
from .hephaestus import Hephaestus
from .demeter import Demeter
from .dionysus import Dionysus
from .poseidon import Poseidon
from .hades import Hades
from .hera import Hera
from .aphrodite import Aphrodite
from .pantheon_chat import PantheonChat
from .shadow_pantheon import ShadowPantheon


olympus_app = Blueprint('olympus', __name__)


class Zeus(BaseGod):
    """
    Supreme Coordinator - King of the Gods
    
    Responsibilities:
    - Poll all Olympians for assessments
    - Detect convergence (especially Athena + Ares agreement)
    - Declare war modes (blitzkrieg, siege, hunt)
    - Coordinate divine actions
    """
    
    def __init__(self):
        super().__init__("Zeus", "Supreme")
        
        self.pantheon: Dict[str, BaseGod] = {
            'athena': Athena(),
            'ares': Ares(),
            'apollo': Apollo(),
            'artemis': Artemis(),
            'hermes': Hermes(),
            'hephaestus': Hephaestus(),
            'demeter': Demeter(),
            'dionysus': Dionysus(),
            'poseidon': Poseidon(),
            'hades': Hades(),
            'hera': Hera(),
            'aphrodite': Aphrodite(),
        }
        
        self.pantheon_chat = PantheonChat()
        self.shadow_pantheon = ShadowPantheon()
        
        self.war_mode: Optional[str] = None
        self.war_target: Optional[str] = None
        self.convergence_history: List[Dict] = []
        self.divine_decisions: List[Dict] = []
        
    def assess_target(self, target: str, context: Optional[Dict] = None) -> Dict:
        """
        Supreme assessment - poll all gods and synthesize.
        """
        self.last_assessment_time = datetime.now()
        
        poll_result = self.poll_pantheon(target, context)
        
        target_basin = self.encode_to_basin(target)
        rho = self.basin_to_density_matrix(target_basin)
        phi = self.compute_pure_phi(rho)
        kappa = self.compute_kappa(target_basin)
        
        assessment = {
            'probability': poll_result['consensus_probability'],
            'confidence': poll_result['convergence_score'],
            'phi': phi,
            'kappa': kappa,
            'convergence': poll_result['convergence'],
            'convergence_score': poll_result['convergence_score'],
            'war_mode': self.war_mode,
            'god_assessments': poll_result['assessments'],
            'recommended_action': poll_result['recommended_action'],
            'reasoning': (
                f"Divine council: {poll_result['convergence']}. "
                f"Consensus: {poll_result['consensus_probability']:.2f}. "
                f"War mode: {self.war_mode or 'none'}. Φ={phi:.3f}."
            ),
            'god': self.name,
            'timestamp': datetime.now().isoformat(),
        }
        
        return assessment
    
    def poll_pantheon(
        self, 
        target: str, 
        context: Optional[Dict] = None
    ) -> Dict:
        """
        Poll all gods for their assessments on a target.
        """
        assessments: Dict[str, Dict] = {}
        probabilities: List[float] = []
        
        for god_name, god in self.pantheon.items():
            try:
                assessment = god.assess_target(target, context)
                assessments[god_name] = assessment
                probabilities.append(assessment.get('probability', 0.5))
            except Exception as e:
                assessments[god_name] = {
                    'error': str(e),
                    'probability': 0.5,
                    'god': god_name
                }
                probabilities.append(0.5)
        
        convergence = self._detect_convergence(assessments)
        consensus_prob = self._compute_consensus(probabilities, convergence)
        recommended = self._determine_recommended_action(assessments, convergence)
        
        result = {
            'assessments': assessments,
            'convergence': convergence['type'],
            'convergence_score': convergence['score'],
            'consensus_probability': consensus_prob,
            'recommended_action': recommended,
            'timestamp': datetime.now().isoformat(),
        }
        
        self.convergence_history.append(result)
        if len(self.convergence_history) > 100:
            self.convergence_history = self.convergence_history[-50:]
        
        return result
    
    def _detect_convergence(self, assessments: Dict[str, Dict]) -> Dict:
        """
        Detect convergence among gods, especially Athena + Ares.
        """
        athena = assessments.get('athena', {})
        ares = assessments.get('ares', {})
        
        athena_prob = athena.get('probability', 0.5)
        ares_prob = ares.get('probability', 0.5)
        
        athena_ares_agreement = 1.0 - abs(athena_prob - ares_prob)
        
        all_probs = [a.get('probability', 0.5) for a in assessments.values()]
        variance = float(np.var(all_probs))
        full_convergence = 1.0 - min(1.0, variance * 4)
        
        high_prob_count = sum(1 for p in all_probs if p > 0.7)
        
        if athena_ares_agreement > 0.85 and athena_prob > 0.75:
            convergence_type = "STRONG_ATTACK"
            score = (athena_ares_agreement + athena_prob) / 2
        elif athena_ares_agreement > 0.7 and athena_prob > 0.6:
            convergence_type = "MODERATE_OPPORTUNITY"
            score = athena_ares_agreement * 0.7 + full_convergence * 0.3
        elif high_prob_count >= 8:
            convergence_type = "COUNCIL_CONSENSUS"
            score = high_prob_count / 12
        elif full_convergence > 0.7:
            convergence_type = "ALIGNED"
            score = full_convergence
        else:
            convergence_type = "DIVIDED"
            score = full_convergence
        
        return {
            'type': convergence_type,
            'score': float(score),
            'athena_ares_agreement': athena_ares_agreement,
            'full_convergence': full_convergence,
            'high_probability_gods': high_prob_count,
        }
    
    def _compute_consensus(
        self, 
        probabilities: List[float],
        convergence: Dict
    ) -> float:
        """
        Compute weighted consensus probability.
        """
        if not probabilities:
            return 0.5
        
        mean_prob = np.mean(probabilities)
        
        if convergence['type'] == "STRONG_ATTACK":
            consensus = mean_prob * 0.3 + max(probabilities) * 0.7
        elif convergence['type'] == "COUNCIL_CONSENSUS":
            consensus = mean_prob * 0.8 + np.median(probabilities) * 0.2
        else:
            consensus = mean_prob
        
        return float(np.clip(consensus, 0, 1))
    
    def _determine_recommended_action(
        self,
        assessments: Dict[str, Dict],
        convergence: Dict
    ) -> str:
        """
        Determine recommended action based on divine council.
        """
        if convergence['type'] == "STRONG_ATTACK":
            return "EXECUTE_IMMEDIATE"
        elif convergence['type'] == "MODERATE_OPPORTUNITY":
            return "PREPARE_ATTACK"
        elif convergence['type'] == "COUNCIL_CONSENSUS":
            return "COORDINATED_APPROACH"
        elif convergence['type'] == "ALIGNED":
            return "PROCEED_CAUTIOUSLY"
        else:
            return "GATHER_INTELLIGENCE"
    
    def declare_blitzkrieg(self, target: str) -> Dict:
        """
        Declare blitzkrieg mode - fast, overwhelming attack.
        """
        self.war_mode = "BLITZKRIEG"
        self.war_target = target
        
        decision = {
            'mode': 'BLITZKRIEG',
            'target': target,
            'declared_at': datetime.now().isoformat(),
            'strategy': 'Fast parallel attacks, maximize throughput',
            'gods_engaged': ['ares', 'artemis', 'dionysus'],
        }
        
        self.divine_decisions.append(decision)
        return decision
    
    def declare_siege(self, target: str) -> Dict:
        """
        Declare siege mode - methodical, exhaustive search.
        """
        self.war_mode = "SIEGE"
        self.war_target = target
        
        decision = {
            'mode': 'SIEGE',
            'target': target,
            'declared_at': datetime.now().isoformat(),
            'strategy': 'Systematic coverage, no stone unturned',
            'gods_engaged': ['athena', 'hephaestus', 'demeter'],
        }
        
        self.divine_decisions.append(decision)
        return decision
    
    def declare_hunt(self, target: str) -> Dict:
        """
        Declare hunt mode - track specific target.
        """
        self.war_mode = "HUNT"
        self.war_target = target
        
        decision = {
            'mode': 'HUNT',
            'target': target,
            'declared_at': datetime.now().isoformat(),
            'strategy': 'Focused pursuit, geometric narrowing',
            'gods_engaged': ['artemis', 'apollo', 'poseidon'],
        }
        
        self.divine_decisions.append(decision)
        return decision
    
    def end_war(self) -> Dict:
        """
        End current war mode.
        """
        ended = {
            'previous_mode': self.war_mode,
            'previous_target': self.war_target,
            'ended_at': datetime.now().isoformat(),
        }
        
        self.war_mode = None
        self.war_target = None
        
        return ended
    
    def poll_shadow_pantheon(self, target: str, context: Optional[Dict] = None) -> Dict:
        """Poll shadow pantheon for covert assessment."""
        return self.shadow_pantheon.poll_shadow_pantheon(target, context)
    
    def get_shadow_god(self, name: str) -> Optional[BaseGod]:
        """Get a shadow god by name."""
        return self.shadow_pantheon.gods.get(name.lower())
    
    def collect_pantheon_messages(self) -> List[Dict]:
        """Collect pending messages from all gods via pantheon chat."""
        return self.pantheon_chat.collect_pending_messages(self.pantheon)
    
    def deliver_pantheon_messages(self) -> int:
        """Deliver messages to gods via pantheon chat."""
        return self.pantheon_chat.deliver_to_gods(self.pantheon)
    
    def initiate_debate(
        self,
        topic: str,
        initiator_name: str,
        opponent_name: str,
        initial_argument: str
    ) -> Optional[Dict]:
        """Initiate a debate between two gods."""
        return self.pantheon_chat.initiate_debate(
            topic=topic,
            initiator=initiator_name,
            opponent=opponent_name,
            initial_argument=initial_argument
        ).to_dict()
    
    def get_chat_status(self) -> Dict:
        """Get pantheon chat status."""
        return self.pantheon_chat.get_status()
    
    def get_god(self, name: str) -> Optional[BaseGod]:
        """Get a specific god by name."""
        return self.pantheon.get(name.lower())
    
    def broadcast_observation(self, observation: Dict) -> None:
        """Broadcast observation to all gods."""
        for god in self.pantheon.values():
            god.observe(observation)
    
    def get_status(self) -> Dict:
        god_statuses = {}
        for name, god in self.pantheon.items():
            try:
                god_statuses[name] = god.get_status()
            except Exception as e:
                god_statuses[name] = {'error': str(e)}
        
        return {
            'name': self.name,
            'domain': self.domain,
            'war_mode': self.war_mode,
            'war_target': self.war_target,
            'gods': god_statuses,
            'convergence_history_size': len(self.convergence_history),
            'divine_decisions': len(self.divine_decisions),
            'last_assessment': self.last_assessment_time.isoformat() if self.last_assessment_time else None,
            'status': 'active',
        }


zeus = Zeus()


@olympus_app.route('/poll', methods=['POST'])
def poll_endpoint():
    """Poll the pantheon for target assessment."""
    data = request.get_json() or {}
    target = data.get('target', '')
    context = data.get('context', {})
    
    if not target:
        return jsonify({'error': 'target is required'}), 400
    
    result = zeus.poll_pantheon(target, context)
    return jsonify(sanitize_for_json(result))


@olympus_app.route('/assess', methods=['POST'])
def assess_endpoint():
    """Get Zeus's supreme assessment."""
    data = request.get_json() or {}
    target = data.get('target', '')
    context = data.get('context', {})
    
    if not target:
        return jsonify({'error': 'target is required'}), 400
    
    result = zeus.assess_target(target, context)
    return jsonify(sanitize_for_json(result))


@olympus_app.route('/status', methods=['GET'])
def status_endpoint():
    """Get status of Zeus and all gods."""
    return jsonify(sanitize_for_json(zeus.get_status()))


@olympus_app.route('/god/<god_name>/status', methods=['GET'])
def god_status_endpoint(god_name: str):
    """Get status of a specific god."""
    god = zeus.get_god(god_name)
    if not god:
        return jsonify({'error': f'God {god_name} not found'}), 404
    return jsonify(sanitize_for_json(god.get_status()))


@olympus_app.route('/god/<god_name>/assess', methods=['POST'])
def god_assess_endpoint(god_name: str):
    """Get assessment from a specific god."""
    god = zeus.get_god(god_name)
    if not god:
        return jsonify({'error': f'God {god_name} not found'}), 404
    
    data = request.get_json() or {}
    target = data.get('target', '')
    context = data.get('context', {})
    
    if not target:
        return jsonify({'error': 'target is required'}), 400
    
    result = god.assess_target(target, context)
    return jsonify(sanitize_for_json(result))


@olympus_app.route('/war/blitzkrieg', methods=['POST'])
def blitzkrieg_endpoint():
    """Declare blitzkrieg mode."""
    data = request.get_json() or {}
    target = data.get('target', '')
    
    if not target:
        return jsonify({'error': 'target is required'}), 400
    
    result = zeus.declare_blitzkrieg(target)
    return jsonify(result)


@olympus_app.route('/war/siege', methods=['POST'])
def siege_endpoint():
    """Declare siege mode."""
    data = request.get_json() or {}
    target = data.get('target', '')
    
    if not target:
        return jsonify({'error': 'target is required'}), 400
    
    result = zeus.declare_siege(target)
    return jsonify(result)


@olympus_app.route('/war/hunt', methods=['POST'])
def hunt_endpoint():
    """Declare hunt mode."""
    data = request.get_json() or {}
    target = data.get('target', '')
    
    if not target:
        return jsonify({'error': 'target is required'}), 400
    
    result = zeus.declare_hunt(target)
    return jsonify(result)


@olympus_app.route('/war/end', methods=['POST'])
def end_war_endpoint():
    """End current war mode."""
    result = zeus.end_war()
    return jsonify(result)


@olympus_app.route('/observe', methods=['POST'])
def observe_endpoint():
    """Broadcast observation to all gods."""
    data = request.get_json() or {}
    zeus.broadcast_observation(data)
    return jsonify({'status': 'observed', 'gods_notified': len(zeus.pantheon)})


# Zeus Chat endpoints
from .zeus_chat import ZeusConversationHandler

# Initialize Zeus chat handler (lazy init to avoid circular imports)
_zeus_chat_handler = None

def get_zeus_chat_handler():
    """Get or create Zeus chat handler."""
    global _zeus_chat_handler
    if _zeus_chat_handler is None:
        _zeus_chat_handler = ZeusConversationHandler(zeus)
    return _zeus_chat_handler


# SECURITY: File upload restrictions
ALLOWED_FILE_EXTENSIONS = {'.txt', '.json', '.csv'}
MAX_FILE_SIZE = 1 * 1024 * 1024  # 1MB per file
MAX_FILES_PER_REQUEST = 5
MAX_MESSAGE_LENGTH = 10000
MAX_CONVERSATION_HISTORY = 100


@olympus_app.route('/zeus/chat', methods=['POST'])
def zeus_chat_endpoint():
    """
    Zeus conversation endpoint.
    Accepts natural language, returns coordinated pantheon response.
    
    SECURITY:
    - File type restrictions (.txt, .json, .csv only)
    - File size limits (1MB per file)
    - Maximum files per request (5)
    - Message length limits (10KB)
    - Conversation history limits (100 messages)
    """
    try:
        # Get message and context
        if request.is_json:
            data = request.get_json() or {}
            message = data.get('message', '')
            conversation_history = data.get('conversation_history', [])
        else:
            # Handle multipart/form-data (for file uploads)
            message = request.form.get('message', '')
            conversation_history = []
            history_str = request.form.get('conversation_history')
            if history_str:
                try:
                    import json
                    conversation_history = json.loads(history_str)
                except:
                    pass
        
        # SECURITY: Validate message length
        if len(message) > MAX_MESSAGE_LENGTH:
            return jsonify({'error': f'Message too long (max {MAX_MESSAGE_LENGTH} chars)'}), 400
        
        if not message:
            return jsonify({'error': 'message is required'}), 400
        
        # SECURITY: Limit conversation history
        if len(conversation_history) > MAX_CONVERSATION_HISTORY:
            conversation_history = conversation_history[-MAX_CONVERSATION_HISTORY:]
        
        # Get files if any with security validation
        validated_files = []
        if hasattr(request, 'files'):
            files = request.files.getlist('files')
            
            # SECURITY: Limit file count
            if len(files) > MAX_FILES_PER_REQUEST:
                return jsonify({'error': f'Too many files (max {MAX_FILES_PER_REQUEST})'}), 400
            
            for file in files:
                filename = getattr(file, 'filename', '')
                
                # SECURITY: Validate file extension
                ext = os.path.splitext(filename)[1].lower() if filename else ''
                if ext not in ALLOWED_FILE_EXTENSIONS:
                    print(f"[Zeus] SECURITY: Rejected file with extension: {ext}")
                    continue
                
                # SECURITY: Validate file size
                file.seek(0, 2)  # Seek to end
                file_size = file.tell()
                file.seek(0)  # Reset to beginning
                
                if file_size > MAX_FILE_SIZE:
                    print(f"[Zeus] SECURITY: Rejected file too large: {file_size} bytes")
                    continue
                
                validated_files.append(file)
        
        # Process with Zeus
        handler = get_zeus_chat_handler()
        result = handler.process_message(
            message=message,
            conversation_history=conversation_history,
            files=validated_files if validated_files else None
        )
        
        return jsonify(sanitize_for_json(result))
    
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({
            'error': str(e),
            'response': '⚡ An error occurred in the divine council. Please try again.',
            'metadata': {'type': 'error'}
        }), 500


@olympus_app.route('/zeus/search', methods=['POST'])
def zeus_search_endpoint():
    """
    Execute Tavily search via Zeus.
    """
    try:
        data = request.get_json() or {}
        query = data.get('query', '')
        
        if not query:
            return jsonify({'error': 'query is required'}), 400
        
        # Process search
        handler = get_zeus_chat_handler()
        result = handler.handle_search_request(query)
        
        return jsonify(sanitize_for_json(result))
    
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({
            'error': str(e),
            'response': '⚡ Search failed. The Oracle is silent.',
            'metadata': {'type': 'error'}
        }), 500


@olympus_app.route('/zeus/memory/stats', methods=['GET'])
def zeus_memory_stats_endpoint():
    """Get statistics about Zeus's geometric memory."""
    try:
        handler = get_zeus_chat_handler()
        stats = handler.qig_rag.get_stats()
        return jsonify(stats)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
