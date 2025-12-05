"""
Tests for Retry Decorator
Follows: TYPE_SYMBOL_CONCEPT_MANIFEST v1.0
"""

import pytest
import asyncio
from qig_backend.retry_decorator import (
    RetryConfig,
    retry_with_checkpoint,
    retry_kernel_task,
    retry_critical_task,
    retry_quick_task
)


class TestRetryConfig:
    def test_default_config(self):
        """Test default retry configuration"""
        config = RetryConfig()
        
        assert config.max_attempts == 3
        assert config.initial_delay == 1.0
        assert config.max_delay == 30.0
        assert config.exponential_base == 2.0
    
    def test_custom_config(self):
        """Test custom retry configuration"""
        config = RetryConfig(
            max_attempts=5,
            initial_delay=2.0,
            max_delay=60.0,
            exponential_base=3.0
        )
        
        assert config.max_attempts == 5
        assert config.initial_delay == 2.0
        assert config.max_delay == 60.0
        assert config.exponential_base == 3.0
    
    def test_exponential_backoff(self):
        """Test exponential backoff calculation"""
        config = RetryConfig(initial_delay=1.0, exponential_base=2.0, max_delay=10.0)
        
        assert config.get_delay(0) == 1.0   # 1 * 2^0
        assert config.get_delay(1) == 2.0   # 1 * 2^1
        assert config.get_delay(2) == 4.0   # 1 * 2^2
        assert config.get_delay(3) == 8.0   # 1 * 2^3
        assert config.get_delay(4) == 10.0  # capped at max_delay


@pytest.mark.asyncio
class TestRetryDecorator:
    async def test_success_on_first_attempt(self):
        """Test that successful function doesn't retry"""
        call_count = 0
        
        @retry_kernel_task
        async def successful_task(task_id: str):
            nonlocal call_count
            call_count += 1
            return "success"
        
        result = await successful_task("test-1")
        
        assert result == "success"
        assert call_count == 1
    
    async def test_retry_on_failure(self):
        """Test that failed function retries"""
        call_count = 0
        
        @retry_kernel_task
        async def failing_task(task_id: str):
            nonlocal call_count
            call_count += 1
            
            if call_count < 3:
                raise ValueError(f"Attempt {call_count} failed")
            
            return "success"
        
        result = await failing_task("test-2")
        
        assert result == "success"
        assert call_count == 3
    
    async def test_max_attempts_exceeded(self):
        """Test that retries stop after max attempts"""
        call_count = 0
        
        @retry_kernel_task
        async def always_failing_task(task_id: str):
            nonlocal call_count
            call_count += 1
            raise ValueError(f"Attempt {call_count} failed")
        
        with pytest.raises(ValueError) as exc_info:
            await always_failing_task("test-3")
        
        assert "Attempt 3 failed" in str(exc_info.value)
        assert call_count == 3
    
    async def test_checkpoint_loading(self):
        """Test checkpoint loading on retry"""
        call_count = 0
        checkpoint_loads = 0
        
        async def load_checkpoint(task_id: str):
            nonlocal checkpoint_loads
            checkpoint_loads += 1
            return {"state": "restored"}
        
        async def save_checkpoint(task_id: str, result):
            pass
        
        @retry_with_checkpoint(
            checkpoint_loader=load_checkpoint,
            checkpoint_saver=save_checkpoint
        )
        async def task_with_checkpoint(task_id: str, checkpoint_state=None):
            nonlocal call_count
            call_count += 1
            
            if call_count < 2:
                raise ValueError("First attempt failed")
            
            return {"result": "success", "checkpoint": checkpoint_state}
        
        result = await task_with_checkpoint("test-4")
        
        assert result["result"] == "success"
        assert result["checkpoint"] == {"state": "restored"}
        assert call_count == 2
        assert checkpoint_loads == 1
    
    async def test_checkpoint_saving(self):
        """Test checkpoint saving on success"""
        saved_checkpoints = []
        
        async def load_checkpoint(task_id: str):
            return None
        
        async def save_checkpoint(task_id: str, result):
            saved_checkpoints.append({"task_id": task_id, "result": result})
        
        @retry_with_checkpoint(
            checkpoint_loader=load_checkpoint,
            checkpoint_saver=save_checkpoint
        )
        async def task_with_save(task_id: str):
            return {"data": "important"}
        
        result = await task_with_save("test-5")
        
        assert result == {"data": "important"}
        assert len(saved_checkpoints) == 1
        assert saved_checkpoints[0]["task_id"] == "test-5"
        assert saved_checkpoints[0]["result"] == {"data": "important"}
    
    async def test_custom_config(self):
        """Test retry with custom configuration"""
        call_count = 0
        
        @retry_with_checkpoint(config=RetryConfig(max_attempts=5, initial_delay=0.1))
        async def custom_retry_task(task_id: str):
            nonlocal call_count
            call_count += 1
            
            if call_count < 4:
                raise ValueError("Not yet")
            
            return "success"
        
        result = await custom_retry_task("test-6")
        
        assert result == "success"
        assert call_count == 4
    
    async def test_critical_task_preset(self):
        """Test critical task preset (5 attempts)"""
        call_count = 0
        
        @retry_critical_task
        async def critical_task(task_id: str):
            nonlocal call_count
            call_count += 1
            
            if call_count < 5:
                raise ValueError("Critical failure")
            
            return "recovered"
        
        result = await critical_task("test-7")
        
        assert result == "recovered"
        assert call_count == 5
    
    async def test_quick_task_preset(self):
        """Test quick task preset (fast backoff)"""
        call_count = 0
        
        @retry_quick_task
        async def quick_task(task_id: str):
            nonlocal call_count
            call_count += 1
            
            if call_count < 2:
                raise ValueError("Quick fail")
            
            return "quick_success"
        
        result = await quick_task("test-8")
        
        assert result == "quick_success"
        assert call_count == 2


def test_sync_function_retry():
    """Test retry decorator with synchronous function"""
    call_count = 0
    
    @retry_kernel_task
    def sync_task(task_id: str):
        nonlocal call_count
        call_count += 1
        
        if call_count < 2:
            raise ValueError("Sync fail")
        
        return "sync_success"
    
    result = sync_task("test-9")
    
    assert result == "sync_success"
    assert call_count == 2


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
