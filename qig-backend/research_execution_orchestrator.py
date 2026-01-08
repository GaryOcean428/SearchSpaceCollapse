"""
Research Execution Orchestrator - Close the Research Feedback Loop

Ensures research requests from kernels are actually executed and
the results fed back into the learning loop.

Data Flow:
    Kernel Request → Queue → Shadow Research Execution → Results → 
    Curiosity Basins + TPS Outcomes + Training Loop

This solves the "pending requests never executed" problem.
"""

import asyncio
import logging
import threading
import time
from collections import deque
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional
import numpy as np

logger = logging.getLogger(__name__)


@dataclass
class ResearchTask:
    """A research task queued for execution."""
    task_id: str
    kernel_name: str
    query: str
    task_type: str  # 'search', 'scrape', 'analyze', 'tool_request'
    priority: float = 0.5
    context: Dict[str, Any] = field(default_factory=dict)
    created_at: float = field(default_factory=time.time)
    status: str = 'pending'  # pending, executing, completed, failed
    result: Optional[Dict[str, Any]] = None
    execution_time_ms: int = 0
    insights_generated: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'task_id': self.task_id,
            'kernel_name': self.kernel_name,
            'query': self.query,
            'task_type': self.task_type,
            'priority': self.priority,
            'status': self.status,
            'created_at': self.created_at,
            'execution_time_ms': self.execution_time_ms,
            'insights_generated': self.insights_generated,
        }


class ResearchExecutionOrchestrator:
    """
    Orchestrates research task execution and result integration.
    
    Responsibilities:
    1. Queue and prioritize research requests from kernels
    2. Execute research via ShadowPantheon, ToolFactory, web scraping
    3. Route results back to requesting kernels
    4. Feed insights to curiosity basins and TPS
    5. Track execution metrics for learning
    """
    
    def __init__(self, max_concurrent: int = 3, max_queue_size: int = 100):
        self.max_concurrent = max_concurrent
        self.max_queue_size = max_queue_size
        
        self.pending_queue: deque = deque(maxlen=max_queue_size)
        self.executing: Dict[str, ResearchTask] = {}
        self.completed: List[ResearchTask] = []
        self.failed: List[ResearchTask] = []
        
        self.total_tasks = 0
        self.total_completed = 0
        self.total_failed = 0
        self.total_insights = 0
        
        self._shadow_pantheon = None
        self._tool_factory = None
        self._curiosity_engine = None
        self._prediction_bridge = None
        self._training_integrator = None
        
        self._running = False
        self._executor_thread: Optional[threading.Thread] = None
        
        self._task_counter = 0
        
        logger.info("[ResearchOrchestrator] Initialized")
    
    def wire_shadow_pantheon(self, shadow) -> None:
        """Wire the ShadowPantheon for covert research."""
        self._shadow_pantheon = shadow
        logger.info("[ResearchOrchestrator] Shadow Pantheon wired")
    
    def wire_tool_factory(self, factory) -> None:
        """Wire the ToolFactory for dynamic tool execution."""
        self._tool_factory = factory
        logger.info("[ResearchOrchestrator] Tool Factory wired")
    
    def wire_curiosity_engine(self, engine) -> None:
        """Wire the AutonomousCuriosityEngine for basin updates."""
        self._curiosity_engine = engine
        logger.info("[ResearchOrchestrator] Curiosity Engine wired")
    
    def wire_prediction_bridge(self, bridge) -> None:
        """Wire the PredictionFeedbackBridge for insight routing."""
        self._prediction_bridge = bridge
        logger.info("[ResearchOrchestrator] Prediction Bridge wired")
    
    def wire_training_integrator(self, integrator) -> None:
        """Wire the TrainingLoopIntegrator for outcome training."""
        self._training_integrator = integrator
        logger.info("[ResearchOrchestrator] Training Integrator wired")
    
    def submit_research(
        self,
        kernel_name: str,
        query: str,
        task_type: str = 'search',
        priority: float = 0.5,
        context: Optional[Dict] = None
    ) -> str:
        """
        Submit a research task for execution.
        
        Args:
            kernel_name: Which kernel is requesting
            query: The research query
            task_type: Type of research (search, scrape, analyze, tool_request)
            priority: Priority 0-1 (higher = more urgent)
            context: Additional context
            
        Returns:
            Task ID for tracking
        """
        self._task_counter += 1
        task_id = f"research_{self._task_counter}_{int(time.time())}"
        
        task = ResearchTask(
            task_id=task_id,
            kernel_name=kernel_name,
            query=query,
            task_type=task_type,
            priority=priority,
            context=context or {},
        )
        
        insert_idx = 0
        for i, existing in enumerate(self.pending_queue):
            if existing.priority < priority:
                insert_idx = i
                break
            insert_idx = i + 1
        
        if insert_idx < len(self.pending_queue):
            temp_list = list(self.pending_queue)
            temp_list.insert(insert_idx, task)
            self.pending_queue = deque(temp_list, maxlen=self.max_queue_size)
        else:
            self.pending_queue.append(task)
        
        self.total_tasks += 1
        logger.info(f"[ResearchOrchestrator] Queued task {task_id}: {query}...")
        
        return task_id
    
    def start_executor(self) -> None:
        """Start the background executor thread."""
        if self._running:
            return
        
        self._running = True
        self._executor_thread = threading.Thread(target=self._executor_loop, daemon=True)
        self._executor_thread.start()
        logger.info("[ResearchOrchestrator] Executor started")
    
    def stop_executor(self) -> None:
        """Stop the background executor."""
        self._running = False
        if self._executor_thread:
            self._executor_thread.join(timeout=5.0)
        logger.info("[ResearchOrchestrator] Executor stopped")
    
    def _executor_loop(self) -> None:
        """Main executor loop - processes pending tasks."""
        while self._running:
            while len(self.executing) < self.max_concurrent and self.pending_queue:
                task = self.pending_queue.popleft()
                self._execute_task(task)
            
            time.sleep(0.5)
    
    def _execute_task(self, task: ResearchTask) -> None:
        """Execute a single research task."""
        task.status = 'executing'
        self.executing[task.task_id] = task
        
        start_time = time.time()
        
        try:
            if task.task_type == 'search':
                result = self._execute_search(task)
            elif task.task_type == 'scrape':
                result = self._execute_scrape(task)
            elif task.task_type == 'analyze':
                result = self._execute_analyze(task)
            elif task.task_type == 'tool_request':
                result = self._execute_tool_request(task)
            else:
                result = {'error': f'Unknown task type: {task.task_type}'}
            
            task.result = result
            task.execution_time_ms = int((time.time() - start_time) * 1000)
            task.status = 'completed'
            
            self._integrate_result(task)
            
            self.completed.append(task)
            self.total_completed += 1
            
            if len(self.completed) > 200:
                self.completed = self.completed[-100:]
            
            logger.info(f"[ResearchOrchestrator] Completed {task.task_id} in {task.execution_time_ms}ms")
            
        except Exception as e:
            task.status = 'failed'
            task.result = {'error': str(e)}
            task.execution_time_ms = int((time.time() - start_time) * 1000)
            
            self.failed.append(task)
            self.total_failed += 1
            
            if len(self.failed) > 50:
                self.failed = self.failed[-25:]
            
            logger.error(f"[ResearchOrchestrator] Failed {task.task_id}: {e}")
        
        finally:
            if task.task_id in self.executing:
                del self.executing[task.task_id]
    
    def _execute_search(self, task: ResearchTask) -> Dict[str, Any]:
        """Execute a search task."""
        if self._shadow_pantheon:
            try:
                result = self._shadow_pantheon.execute_search(
                    query=task.query,
                    requester=task.kernel_name,
                    context=task.context
                )
                return {'type': 'search', 'results': result}
            except Exception as e:
                logger.warning(f"[ResearchOrchestrator] Shadow search failed: {e}")
        
        return {
            'type': 'search',
            'results': [],
            'message': 'Shadow Pantheon not available',
        }
    
    def _execute_scrape(self, task: ResearchTask) -> Dict[str, Any]:
        """Execute a scrape task."""
        if self._shadow_pantheon:
            try:
                url = task.context.get('url', task.query)
                result = self._shadow_pantheon.scrape_url(url, requester=task.kernel_name)
                return {'type': 'scrape', 'content': result}
            except Exception as e:
                logger.warning(f"[ResearchOrchestrator] Scrape failed: {e}")
        
        return {'type': 'scrape', 'content': None, 'message': 'Scraper not available'}
    
    def _execute_analyze(self, task: ResearchTask) -> Dict[str, Any]:
        """Execute an analysis task."""
        analysis_result = {
            'type': 'analyze',
            'query': task.query,
            'analysis': f"Analysis of: {task.query}",
            'keywords': task.query.split()[:5],
        }
        return analysis_result
    
    def _execute_tool_request(self, task: ResearchTask) -> Dict[str, Any]:
        """Execute a tool request via ToolFactory."""
        if self._tool_factory:
            try:
                tool_name = task.context.get('tool_name', 'generic')
                result = self._tool_factory.execute_tool(
                    tool_name=tool_name,
                    args=task.context.get('args', {}),
                    query=task.query
                )
                return {'type': 'tool', 'result': result}
            except Exception as e:
                logger.warning(f"[ResearchOrchestrator] Tool execution failed: {e}")
        
        return {'type': 'tool', 'result': None, 'message': 'Tool Factory not available'}
    
    def _integrate_result(self, task: ResearchTask) -> None:
        """Integrate completed task result into learning systems."""
        if not task.result:
            return
        
        from prediction_feedback_bridge import InsightRecord
        
        info_gain = self._estimate_information_gain(task)
        
        if self._curiosity_engine:
            try:
                self._curiosity_engine.record_exploration(
                    topic=task.query,
                    outcome={
                        'success': task.status == 'completed',
                        'information_gain': info_gain,
                        'source': task.task_type,
                        'kernel': task.kernel_name,
                    }
                )
            except Exception as e:
                logger.warning(f"[ResearchOrchestrator] Curiosity update failed: {e}")
        
        if info_gain > 0.3 and self._prediction_bridge:
            insight = InsightRecord(
                insight_id=f"research_insight_{task.task_id}",
                source='research',
                content=f"Research discovery: {task.query}",
                phi_delta=info_gain * 0.1,
                kappa_delta=0.0,
                curvature=info_gain,
                confidence=min(1.0, info_gain + 0.3),
                metadata={
                    'task_type': task.task_type,
                    'kernel': task.kernel_name,
                    'execution_time': task.execution_time_ms,
                }
            )
            self._prediction_bridge.insight_buffer.append(insight)
            task.insights_generated.append(insight.insight_id)
            self.total_insights += 1
        
        if self._training_integrator and task.status == 'completed':
            try:
                self._training_integrator.train_from_outcome(
                    god_name=task.kernel_name,
                    prompt=task.query,
                    response=str(task.result)[:500],
                    success=True,
                    phi=0.5 + info_gain * 0.2,
                    kappa=58.0,
                    coherence_score=min(1.0, info_gain + 0.5),
                )
            except Exception as e:
                logger.warning(f"[ResearchOrchestrator] Training update failed: {e}")
    
    def _estimate_information_gain(self, task: ResearchTask) -> float:
        """Estimate information gain from research result."""
        if not task.result:
            return 0.0
        
        result_str = str(task.result)
        length_score = min(1.0, len(result_str) / 2000)
        
        keyword_count = result_str.lower().count(task.query.lower().split()[0]) if task.query else 0
        relevance_score = min(1.0, keyword_count / 5)
        
        novelty_score = 0.5
        if self._curiosity_engine and hasattr(self._curiosity_engine, 'curiosity_drive'):
            current_knowledge = {'depth': 0.5, 'recency': 0}
            novelty_score = self._curiosity_engine.curiosity_drive.compute_curiosity(
                task.query, current_knowledge
            )
        
        info_gain = (0.3 * length_score + 0.3 * relevance_score + 0.4 * novelty_score)
        return float(np.clip(info_gain, 0.0, 1.0))
    
    def get_task_status(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Get status of a specific task."""
        if task_id in self.executing:
            return self.executing[task_id].to_dict()
        
        for task in self.pending_queue:
            if task.task_id == task_id:
                return task.to_dict()
        
        for task in self.completed:
            if task.task_id == task_id:
                return task.to_dict()
        
        for task in self.failed:
            if task.task_id == task_id:
                return task.to_dict()
        
        return None
    
    def get_stats(self) -> Dict[str, Any]:
        """Get orchestrator statistics."""
        return {
            'pending': len(self.pending_queue),
            'executing': len(self.executing),
            'completed': self.total_completed,
            'failed': self.total_failed,
            'total_tasks': self.total_tasks,
            'total_insights': self.total_insights,
            'running': self._running,
            'shadow_wired': self._shadow_pantheon is not None,
            'tool_factory_wired': self._tool_factory is not None,
            'curiosity_wired': self._curiosity_engine is not None,
            'prediction_bridge_wired': self._prediction_bridge is not None,
            'training_wired': self._training_integrator is not None,
        }
    
    def process_pending_synchronously(self, max_tasks: int = 5) -> List[Dict]:
        """Process pending tasks synchronously (for testing/immediate execution)."""
        results = []
        processed = 0
        
        while processed < max_tasks and self.pending_queue:
            task = self.pending_queue.popleft()
            self._execute_task(task)
            results.append(task.to_dict())
            processed += 1
        
        return results


_orchestrator_instance: Optional[ResearchExecutionOrchestrator] = None


def get_research_orchestrator() -> ResearchExecutionOrchestrator:
    """Get or create the singleton research orchestrator."""
    global _orchestrator_instance
    if _orchestrator_instance is None:
        _orchestrator_instance = ResearchExecutionOrchestrator()
        
        try:
            # ShadowPantheon is accessed via Zeus instance or research_wiring
            from research_wiring import get_shadow_research
            shadow = get_shadow_research()
            _orchestrator_instance.wire_shadow_pantheon(shadow)
        except Exception as e:
            logger.warning(f"[ResearchOrchestrator] Could not wire Shadow: {e}")
        
        try:
            # ToolFactory accessed via Zeus's tool factory if available
            from olympus.tool_factory import ToolFactory
            # Delayed wiring - will be connected when Zeus initializes
            # For now, create a minimal factory that defers to Zeus
            logger.info("[ResearchOrchestrator] ToolFactory wiring deferred until Zeus init")
        except Exception as e:
            logger.warning(f"[ResearchOrchestrator] Could not wire ToolFactory: {e}")
        
        try:
            from autonomous_curiosity import get_curiosity_engine
            engine = get_curiosity_engine()
            _orchestrator_instance.wire_curiosity_engine(engine)
        except Exception as e:
            logger.warning(f"[ResearchOrchestrator] Could not wire Curiosity: {e}")
        
        try:
            from prediction_feedback_bridge import get_prediction_feedback_bridge
            bridge = get_prediction_feedback_bridge()
            _orchestrator_instance.wire_prediction_bridge(bridge)
        except Exception as e:
            logger.warning(f"[ResearchOrchestrator] Could not wire Bridge: {e}")
        
        try:
            from training.training_loop_integrator import get_training_integrator
            integrator = get_training_integrator()
            _orchestrator_instance.wire_training_integrator(integrator)
        except Exception as e:
            logger.warning(f"[ResearchOrchestrator] Could not wire Training: {e}")
    
    return _orchestrator_instance
