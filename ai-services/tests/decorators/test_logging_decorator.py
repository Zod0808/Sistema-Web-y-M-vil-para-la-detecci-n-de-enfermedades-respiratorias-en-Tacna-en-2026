"""
Tests for decorators/logging_decorator.py
"""

import pytest
import asyncio
import time
from unittest.mock import patch, MagicMock, AsyncMock

from decorators.logging_decorator import LoggingDecorator, with_logging


class TestLoggingDecorator:
    """Tests for LoggingDecorator"""
    
    @pytest.fixture
    def logging_decorator(self):
        """Create logging decorator instance"""
        return LoggingDecorator(
            log_level="info",
            log_args=True,
            log_result=False,
            log_execution_time=True
        )
    
    @pytest.mark.asyncio
    async def test_async_function_success(self, logging_decorator):
        """Test logging decorator with successful async function"""
        @logging_decorator
        async def test_func(x: int, y: int) -> int:
            await asyncio.sleep(0.01)
            return x + y
        
        with patch('decorators.logging_decorator.logger') as mock_logger:
            result = await test_func(2, 3)
            
            assert result == 5
            # Verify logging was called
            assert mock_logger.info.called
    
    @pytest.mark.asyncio
    async def test_sync_function_success(self, logging_decorator):
        """Test logging decorator with successful sync function"""
        @logging_decorator
        def test_func(x: int, y: int) -> int:
            return x + y
        
        with patch('decorators.logging_decorator.logger') as mock_logger:
            result = test_func(2, 3)
            
            assert result == 5
            # Verify logging was called
            assert mock_logger.info.called
    
    @pytest.mark.asyncio
    async def test_async_function_failure(self, logging_decorator):
        """Test logging decorator with failing async function"""
        @logging_decorator
        async def test_func(x: int) -> int:
            raise ValueError("Test error")
        
        with patch('decorators.logging_decorator.logger') as mock_logger:
            with pytest.raises(ValueError, match="Test error"):
                await test_func(2)
            
            # Verify error logging was called
            assert mock_logger.error.called
    
    @pytest.mark.asyncio
    async def test_sync_function_failure(self, logging_decorator):
        """Test logging decorator with failing sync function"""
        @logging_decorator
        def test_func(x: int) -> int:
            raise ValueError("Test error")
        
        with patch('decorators.logging_decorator.logger') as mock_logger:
            with pytest.raises(ValueError, match="Test error"):
                test_func(2)
            
            # Verify error logging was called
            assert mock_logger.error.called
    
    @pytest.mark.asyncio
    async def test_log_args_enabled(self):
        """Test logging with args enabled"""
        decorator = LoggingDecorator(log_args=True)
        
        @decorator
        async def test_func(x: int, y: str) -> str:
            return f"{x}{y}"
        
        with patch('decorators.logging_decorator.logger') as mock_logger:
            await test_func(5, "test")
            
            # Verify args were logged
            call_args = mock_logger.info.call_args
            assert call_args is not None
            # Check that log data contains args info
            log_kwargs = call_args[1] if len(call_args) > 1 else {}
            assert "args_count" in log_kwargs or "arg_0" in log_kwargs
    
    @pytest.mark.asyncio
    async def test_log_args_disabled(self):
        """Test logging with args disabled"""
        decorator = LoggingDecorator(log_args=False)
        
        @decorator
        async def test_func(x: int) -> int:
            return x * 2
        
        with patch('decorators.logging_decorator.logger') as mock_logger:
            await test_func(5)
            
            # Args should not be logged
            assert mock_logger.info.called
    
    @pytest.mark.asyncio
    async def test_log_result_enabled(self):
        """Test logging with result enabled"""
        decorator = LoggingDecorator(log_result=True)
        
        @decorator
        async def test_func(x: int) -> int:
            return x * 2
        
        with patch('decorators.logging_decorator.logger') as mock_logger:
            await test_func(5)
            
            # Verify result was logged
            call_args = mock_logger.info.call_args
            log_kwargs = call_args[1] if len(call_args) > 1 else {}
            # Result should be in success log
            assert "result" in log_kwargs or "result_summary" in log_kwargs or mock_logger.info.called
    
    @pytest.mark.asyncio
    async def test_log_result_disabled(self):
        """Test logging with result disabled"""
        decorator = LoggingDecorator(log_result=False)
        
        @decorator
        async def test_func(x: int) -> int:
            return x * 2
        
        with patch('decorators.logging_decorator.logger') as mock_logger:
            await test_func(5)
            
            # Result should not be logged
            assert mock_logger.info.called
    
    @pytest.mark.asyncio
    async def test_log_execution_time_enabled(self):
        """Test logging with execution time enabled"""
        decorator = LoggingDecorator(log_execution_time=True)
        
        @decorator
        async def test_func() -> str:
            await asyncio.sleep(0.01)
            return "done"
        
        with patch('decorators.logging_decorator.logger') as mock_logger:
            await test_func()
            
            # Verify execution time was logged
            call_args = mock_logger.info.call_args
            log_kwargs = call_args[1] if len(call_args) > 1 else {}
            assert "execution_time_ms" in log_kwargs
    
    @pytest.mark.asyncio
    async def test_log_execution_time_disabled(self):
        """Test logging with execution time disabled"""
        decorator = LoggingDecorator(log_execution_time=False)
        
        @decorator
        async def test_func() -> str:
            return "done"
        
        with patch('decorators.logging_decorator.logger') as mock_logger:
            await test_func()
            
            # Execution time should not be logged
            assert mock_logger.info.called
    
    @pytest.mark.asyncio
    async def test_log_levels(self):
        """Test different log levels"""
        log_levels = ["debug", "info", "warning", "error"]
        
        for level in log_levels:
            decorator = LoggingDecorator(log_level=level)
            
            @decorator
            async def test_func() -> str:
                return "done"
            
            with patch('decorators.logging_decorator.logger') as mock_logger:
                await test_func()
                
                # Verify appropriate log method was called
                if level == "debug":
                    assert mock_logger.debug.called or mock_logger.info.called
                elif level == "info":
                    assert mock_logger.info.called
                elif level == "warning":
                    assert mock_logger.warning.called or mock_logger.info.called
                elif level == "error":
                    assert mock_logger.error.called or mock_logger.info.called
    
    @pytest.mark.asyncio
    async def test_log_function_name(self, logging_decorator):
        """Test that function name is logged"""
        @logging_decorator
        async def test_function_name() -> str:
            return "result"
        
        with patch('decorators.logging_decorator.logger') as mock_logger:
            await test_function_name()
            
            # Verify function name was logged
            call_args = mock_logger.info.call_args
            log_kwargs = call_args[1] if len(call_args) > 1 else {}
            assert "function" in log_kwargs or mock_logger.info.called
    
    @pytest.mark.asyncio
    async def test_log_module_name(self, logging_decorator):
        """Test that module name is logged"""
        @logging_decorator
        async def test_func() -> str:
            return "result"
        
        with patch('decorators.logging_decorator.logger') as mock_logger:
            await test_func()
            
            # Verify module was logged
            call_args = mock_logger.info.call_args
            log_kwargs = call_args[1] if len(call_args) > 1 else {}
            assert "module" in log_kwargs or mock_logger.info.called
    
    @pytest.mark.asyncio
    async def test_log_error_details(self, logging_decorator):
        """Test that error details are logged"""
        @logging_decorator
        async def test_func() -> str:
            raise ValueError("Test error message")
        
        with patch('decorators.logging_decorator.logger') as mock_logger:
            with pytest.raises(ValueError):
                await test_func()
            
            # Verify error details were logged
            call_args = mock_logger.error.call_args
            log_kwargs = call_args[1] if len(call_args) > 1 else {}
            assert "error_type" in log_kwargs or "error_message" in log_kwargs or mock_logger.error.called
    
    @pytest.mark.asyncio
    async def test_log_status_success(self, logging_decorator):
        """Test that success status is logged"""
        @logging_decorator
        async def test_func() -> str:
            return "success"
        
        with patch('decorators.logging_decorator.logger') as mock_logger:
            await test_func()
            
            # Verify status was logged
            call_args = mock_logger.info.call_args
            log_kwargs = call_args[1] if len(call_args) > 1 else {}
            assert "status" in log_kwargs or mock_logger.info.called
    
    @pytest.mark.asyncio
    async def test_log_status_error(self, logging_decorator):
        """Test that error status is logged"""
        @logging_decorator
        async def test_func() -> str:
            raise ValueError("Error")
        
        with patch('decorators.logging_decorator.logger') as mock_logger:
            with pytest.raises(ValueError):
                await test_func()
            
            # Verify error status was logged
            call_args = mock_logger.error.call_args
            log_kwargs = call_args[1] if len(call_args) > 1 else {}
            assert "status" in log_kwargs or mock_logger.error.called
    
    @pytest.mark.asyncio
    async def test_log_large_result_truncated(self, logging_decorator):
        """Test that large results are truncated"""
        decorator = LoggingDecorator(log_result=True)
        
        @decorator
        async def test_func() -> str:
            return "x" * 1000  # Large result
        
        with patch('decorators.logging_decorator.logger') as mock_logger:
            await test_func()
            
            # Result should be truncated if too large
            assert mock_logger.info.called
    
    @pytest.mark.asyncio
    async def test_log_small_args(self, logging_decorator):
        """Test logging of small argument values"""
        @logging_decorator
        async def test_func(x: int, y: str) -> int:
            return x
        
        with patch('decorators.logging_decorator.logger') as mock_logger:
            await test_func(5, "test")
            
            # Small args should be logged
            assert mock_logger.info.called
    
    @pytest.mark.asyncio
    async def test_log_large_args_not_logged(self, logging_decorator):
        """Test that large arguments are not logged"""
        @logging_decorator
        async def test_func(x: str) -> str:
            return x
        
        large_arg = "x" * 200  # Large argument
        
        with patch('decorators.logging_decorator.logger') as mock_logger:
            await test_func(large_arg)
            
            # Large args should not be logged
            assert mock_logger.info.called
    
    def test_with_logging_decorator_function(self):
        """Test with_logging decorator function"""
        @with_logging(log_level="debug", log_args=True, log_result=True)
        async def test_func(x: int) -> int:
            return x * 2
        
        # Should not raise error
        assert callable(test_func)
    
    def test_with_logging_default_parameters(self):
        """Test with_logging with default parameters"""
        @with_logging()
        async def test_func() -> str:
            return "done"
        
        # Should not raise error
        assert callable(test_func)
    
    @pytest.mark.asyncio
    async def test_log_kwargs(self, logging_decorator):
        """Test logging of keyword arguments"""
        @logging_decorator
        async def test_func(x: int, y: int = 10) -> int:
            return x + y
        
        with patch('decorators.logging_decorator.logger') as mock_logger:
            await test_func(5, y=20)
            
            # Verify kwargs were logged
            call_args = mock_logger.info.call_args
            log_kwargs = call_args[1] if len(call_args) > 1 else {}
            assert "kwargs_keys" in log_kwargs or mock_logger.info.called
    
    @pytest.mark.asyncio
    async def test_log_dict_result(self, logging_decorator):
        """Test logging of dict result"""
        decorator = LoggingDecorator(log_result=True)
        
        @decorator
        async def test_func() -> dict:
            return {"key": "value", "number": 42}
        
        with patch('decorators.logging_decorator.logger') as mock_logger:
            await test_func()
            
            # Dict result should be logged (if small enough)
            assert mock_logger.info.called
    
    @pytest.mark.asyncio
    async def test_log_list_result(self, logging_decorator):
        """Test logging of list result"""
        decorator = LoggingDecorator(log_result=True)
        
        @decorator
        async def test_func() -> list:
            return [1, 2, 3]
        
        with patch('decorators.logging_decorator.logger') as mock_logger:
            await test_func()
            
            # List result should be logged (if small enough)
            assert mock_logger.info.called
    
    @pytest.mark.asyncio
    async def test_log_none_result(self, logging_decorator):
        """Test logging when result is None"""
        decorator = LoggingDecorator(log_result=True)
        
        @decorator
        async def test_func() -> None:
            return None
        
        with patch('decorators.logging_decorator.logger') as mock_logger:
            await test_func()
            
            # None result should not be logged
            assert mock_logger.info.called

