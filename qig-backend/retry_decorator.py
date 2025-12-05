"""
Retry Decorator for Kernel Tasks
Follows: TYPE_SYMBOL_CONCEPT_MANIFEST v1.0

Provides exponential backoff retry logic for kernel operations
with checkpoint save/restore functionality.
"""

import asyncio
import logging
from typing import TypeVar, Callable, Any, Optional
from functools import wraps
import time

logger = logging.getLogger(__name__)

T = TypeVar('T')


class RetryConfig:
    """Configuration for retry behavior"""
    max_attempts: int = 3
    initial_delay: float = 1.0  # seconds
    max_delay: float = 30.0     # seconds
    exponential_base: float = 2.0
    
    def __init__(
        self,
        max_attempts: int = 3,
        initial_delay: float = 1.0,
        max_delay: float = 30.0,
        exponential_base: float = 2.0
    ):
        self.max_attempts = max_attempts
        self.initial_delay = initial_delay
        self.max_delay = max_delay
        self.exponential_base = exponential_base
    
    def get_delay(self, attempt: int) -> float:
        """Calculate delay for given attempt with exponential backoff"""
        delay = self.initial_delay * (self.exponential_base ** attempt)
        return min(delay, self.max_delay)


def retry_with_checkpoint(
    config: Optional[RetryConfig] = None,
    checkpoint_loader: Optional[Callable] = None,
    checkpoint_saver: Optional[Callable] = None,
):
    """
    Decorator for retrying kernel tasks with checkpoint support.
    
    Args:
        config: Retry configuration
        checkpoint_loader: Function to load checkpoint state
        checkpoint_saver: Function to save checkpoint state
        
    Example:
        @retry_with_checkpoint(
            config=RetryConfig(max_attempts=3),
            checkpoint_loader=load_checkpoint,
            checkpoint_saver=save_checkpoint
        )
        async def execute_kernel_task(task_id: str):
            # Task implementation
            pass
    """
    if config is None:
        config = RetryConfig()
    
    def decorator(func: Callable[..., Any]) -> Callable[..., Any]:
        @wraps(func)
        async def async_wrapper(*args, **kwargs) -> Any:
            last_exception = None
            task_id = kwargs.get('task_id') or (args[0] if args else None)
            
            for attempt in range(config.max_attempts):
                try:
                    # Try to load checkpoint if available
                    checkpoint_state = None
                    if checkpoint_loader and task_id and attempt > 0:
                        try:
                            checkpoint_state = await checkpoint_loader(task_id)
                            if checkpoint_state:
                                logger.info(
                                    f"Loaded checkpoint for task {task_id} on attempt {attempt + 1}",
                                    extra={
                                        "task_id": task_id,
                                        "attempt": attempt + 1,
                                        "has_checkpoint": True
                                    }
                                )
                                kwargs['checkpoint_state'] = checkpoint_state
                        except Exception as e:
                            logger.warning(
                                f"Failed to load checkpoint for task {task_id}: {e}",
                                extra={"task_id": task_id, "error": str(e)}
                            )
                    
                    # Execute the task
                    result = await func(*args, **kwargs)
                    
                    # Save checkpoint on success
                    if checkpoint_saver and task_id:
                        try:
                            await checkpoint_saver(task_id, result)
                            logger.debug(
                                f"Saved checkpoint for task {task_id}",
                                extra={"task_id": task_id}
                            )
                        except Exception as e:
                            logger.warning(
                                f"Failed to save checkpoint for task {task_id}: {e}",
                                extra={"task_id": task_id, "error": str(e)}
                            )
                    
                    # Success - return result
                    if attempt > 0:
                        logger.info(
                            f"Task {task_id} succeeded on attempt {attempt + 1}",
                            extra={
                                "task_id": task_id,
                                "attempt": attempt + 1,
                                "total_attempts": config.max_attempts
                            }
                        )
                    
                    return result
                    
                except Exception as e:
                    last_exception = e
                    logger.warning(
                        f"Task {task_id} failed on attempt {attempt + 1}/{config.max_attempts}: {e}",
                        extra={
                            "task_id": task_id,
                            "attempt": attempt + 1,
                            "max_attempts": config.max_attempts,
                            "error": str(e),
                            "error_type": type(e).__name__
                        }
                    )
                    
                    # If not last attempt, wait before retry
                    if attempt < config.max_attempts - 1:
                        delay = config.get_delay(attempt)
                        logger.info(
                            f"Retrying task {task_id} in {delay:.2f}s",
                            extra={
                                "task_id": task_id,
                                "delay_seconds": delay,
                                "next_attempt": attempt + 2
                            }
                        )
                        await asyncio.sleep(delay)
            
            # All attempts failed
            logger.error(
                f"Task {task_id} failed after {config.max_attempts} attempts",
                extra={
                    "task_id": task_id,
                    "total_attempts": config.max_attempts,
                    "final_error": str(last_exception),
                    "error_type": type(last_exception).__name__
                }
            )
            raise last_exception
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs) -> Any:
            """Synchronous wrapper for non-async functions"""
            last_exception = None
            task_id = kwargs.get('task_id') or (args[0] if args else None)
            
            for attempt in range(config.max_attempts):
                try:
                    result = func(*args, **kwargs)
                    
                    if attempt > 0:
                        logger.info(
                            f"Task {task_id} succeeded on attempt {attempt + 1}",
                            extra={"task_id": task_id, "attempt": attempt + 1}
                        )
                    
                    return result
                    
                except Exception as e:
                    last_exception = e
                    logger.warning(
                        f"Task {task_id} failed on attempt {attempt + 1}/{config.max_attempts}: {e}",
                        extra={
                            "task_id": task_id,
                            "attempt": attempt + 1,
                            "error": str(e)
                        }
                    )
                    
                    if attempt < config.max_attempts - 1:
                        delay = config.get_delay(attempt)
                        time.sleep(delay)
            
            logger.error(
                f"Task {task_id} failed after {config.max_attempts} attempts",
                extra={"task_id": task_id, "final_error": str(last_exception)}
            )
            raise last_exception
        
        # Return appropriate wrapper based on function type
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator


# Convenience decorators with preset configurations
def retry_kernel_task(func: Callable) -> Callable:
    """Standard retry for kernel tasks (3 attempts, exponential backoff)"""
    return retry_with_checkpoint(
        config=RetryConfig(max_attempts=3, initial_delay=1.0, max_delay=30.0)
    )(func)


def retry_critical_task(func: Callable) -> Callable:
    """Retry for critical tasks (5 attempts, slower backoff)"""
    return retry_with_checkpoint(
        config=RetryConfig(max_attempts=5, initial_delay=2.0, max_delay=60.0)
    )(func)


def retry_quick_task(func: Callable) -> Callable:
    """Retry for quick tasks (3 attempts, fast backoff)"""
    return retry_with_checkpoint(
        config=RetryConfig(max_attempts=3, initial_delay=0.5, max_delay=5.0)
    )(func)
