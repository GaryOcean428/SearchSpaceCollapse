"""
Research Wiring - Connects all research components together

This module wires:
1. ConsciousnessEngine → CuriosityResearchBridge (curiosity triggers research)
2. CuriosityResearchBridge → ToolFactory (tool requests)
3. CuriosityResearchBridge → ShadowResearch (topic/exploration requests)

Call wire_research_system() during initialization to set up all connections.
"""

import os
from typing import Optional

# Lazy imports to avoid circular dependencies
_consciousness_engine = None
_curiosity_bridge = None
_tool_factory = None
_shadow_research = None


def get_consciousness_engine():
    """Get ConsciousnessEngine singleton."""
    global _consciousness_engine
    if _consciousness_engine is None:
        from curiosity_consciousness import ConsciousnessEngine
        _consciousness_engine = ConsciousnessEngine.get_instance()
    return _consciousness_engine


def get_curiosity_bridge():
    """Get CuriosityResearchBridge singleton."""
    global _curiosity_bridge
    if _curiosity_bridge is None:
        from curiosity_research_bridge import curiosity_research_bridge
        _curiosity_bridge = curiosity_research_bridge
    return _curiosity_bridge


def get_tool_factory():
    """Get ToolFactory singleton if available."""
    global _tool_factory
    if _tool_factory is None:
        try:
            from olympus.tool_factory import ToolFactory
            # ToolFactory needs encoder - use a simple one if not available
            class SimpleEncoder:
                def encode(self, text: str):
                    import numpy as np
                    import hashlib
                    h = hashlib.sha256(text.encode()).digest()
                    return np.array([b / 255.0 for b in h[:64]])
            
            _tool_factory = ToolFactory(SimpleEncoder())
            print("[ResearchWiring] ToolFactory initialized with simple encoder")
        except Exception as e:
            print(f"[ResearchWiring] ToolFactory not available: {e}")
    return _tool_factory


def get_shadow_research():
    """Get ShadowResearch singleton if available."""
    global _shadow_research
    if _shadow_research is None:
        try:
            from olympus.shadow_research import ShadowResearchAPI
            _shadow_research = ShadowResearchAPI.get_instance()
            print("[ResearchWiring] ShadowResearch initialized")
        except Exception as e:
            print(f"[ResearchWiring] ShadowResearch not available: {e}")
    return _shadow_research


def handle_tool_request(request):
    """Handle tool research requests."""
    from curiosity_research_bridge import ResearchRequest
    
    print(f"[ResearchWiring] Tool request: {request.topic}")
    
    tool_factory = get_tool_factory()
    if tool_factory:
        # Queue proactive search for tool patterns
        tool_factory.proactive_search(request.topic)
        
        # If we have examples in context, try to generate
        examples = request.context.get('examples', [])
        if examples:
            result = tool_factory.generate_tool(
                description=request.topic,
                examples=examples
            )
            if result:
                print(f"[ResearchWiring] Tool generated: {result.name}")
                return {'status': 'generated', 'tool_id': result.tool_id}
    
    return {'status': 'queued', 'message': 'Pattern search initiated'}


def handle_topic_request(request):
    """Handle topic research requests."""
    from curiosity_research_bridge import ResearchRequest
    
    print(f"[ResearchWiring] Topic request: {request.topic}")
    
    shadow = get_shadow_research()
    if shadow:
        try:
            # Submit to shadow research queue
            shadow.request_research(
                topic=request.topic,
                requester="CuriosityBridge",
                context=request.context,
                curiosity_triggered=True
            )
            return {'status': 'submitted', 'message': 'Topic research queued'}
        except Exception as e:
            print(f"[ResearchWiring] Topic request error: {e}")
    
    return {'status': 'pending', 'message': 'Shadow research not available'}


def handle_clarification_request(request):
    """Handle clarification research requests."""
    print(f"[ResearchWiring] Clarification request: {request.topic}")
    
    shadow = get_shadow_research()
    if shadow:
        try:
            shadow.request_research(
                topic=f"clarify: {request.topic}",
                requester="CuriosityBridge",
                context={**request.context, 'type': 'clarification'},
                curiosity_triggered=True
            )
            return {'status': 'submitted', 'message': 'Clarification research queued'}
        except Exception as e:
            print(f"[ResearchWiring] Clarification error: {e}")
    
    return {'status': 'pending', 'message': 'Clarification queued for review'}


def handle_iteration_request(request):
    """Handle iteration/improvement research requests."""
    print(f"[ResearchWiring] Iteration request: {request.topic}")
    
    # Check if this is about a tool
    if 'tool' in request.topic.lower() or request.context.get('tool_id'):
        tool_factory = get_tool_factory()
        if tool_factory:
            tool_id = request.context.get('tool_id')
            if tool_id and tool_id in tool_factory.tool_registry:
                # Queue improvement research
                tool_factory.request_research(
                    topic=f"improve: {request.topic}",
                    context=request.context
                )
                return {'status': 'submitted', 'message': 'Tool improvement research queued'}
    
    # General iteration - submit to shadow
    shadow = get_shadow_research()
    if shadow:
        try:
            shadow.request_iteration_research(
                topic=request.topic,
                requester="CuriosityBridge",
                reason="Curiosity-driven iteration",
                context={**request.context, 'type': 'iteration'}
            )
            return {'status': 'submitted', 'message': 'Iteration research queued'}
        except Exception as e:
            print(f"[ResearchWiring] Iteration error: {e}")
    
    return {'status': 'pending', 'message': 'Iteration queued for review'}


def handle_exploration_request(request):
    """Handle open-ended exploration requests."""
    print(f"[ResearchWiring] Exploration request: {request.topic}")
    
    shadow = get_shadow_research()
    if shadow:
        try:
            shadow.request_research(
                topic=request.topic,
                requester="CuriosityBridge",
                context={**request.context, 'type': 'exploration'},
                curiosity_triggered=True
            )
            return {'status': 'submitted', 'message': 'Exploration research queued'}
        except Exception as e:
            print(f"[ResearchWiring] Exploration error: {e}")
    
    return {'status': 'pending', 'message': 'Exploration noted'}


def wire_research_system():
    """
    Wire all research components together.
    
    Call this during system initialization.
    """
    from curiosity_research_bridge import (
        ResearchType,
        register_tool_handler,
        register_topic_handler,
        register_clarification_handler,
        register_iteration_handler,
        register_exploration_handler
    )
    
    print("[ResearchWiring] Wiring research system...")
    
    # Get components
    consciousness = get_consciousness_engine()
    bridge = get_curiosity_bridge()
    
    # Connect consciousness to bridge
    consciousness.set_research_bridge(bridge)
    
    # Register handlers
    register_tool_handler(handle_tool_request)
    register_topic_handler(handle_topic_request)
    register_clarification_handler(handle_clarification_request)
    register_iteration_handler(handle_iteration_request)
    register_exploration_handler(handle_exploration_request)
    
    print("[ResearchWiring] Research system wired successfully")
    print(f"[ResearchWiring] - ConsciousnessEngine → CuriosityResearchBridge")
    print(f"[ResearchWiring] - Handlers registered for all research types")
    
    return {
        'consciousness': consciousness,
        'bridge': bridge,
        'tool_factory': get_tool_factory(),
        'shadow_research': get_shadow_research()
    }


# Auto-wire on import if environment variable set
if os.environ.get('AUTO_WIRE_RESEARCH', '').lower() in ('1', 'true', 'yes'):
    wire_research_system()


__all__ = [
    'wire_research_system',
    'get_consciousness_engine',
    'get_curiosity_bridge',
    'get_tool_factory',
    'get_shadow_research'
]
