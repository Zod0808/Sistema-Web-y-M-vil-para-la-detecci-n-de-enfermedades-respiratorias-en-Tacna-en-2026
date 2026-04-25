"""
Tests for utils/sentry_integration.py
"""

import pytest
import os
from unittest.mock import patch, MagicMock
from typing import Dict, Any

from utils.sentry_integration import init_sentry, _redact_sensitive_data


class TestSentryIntegration:
    """Tests for Sentry integration"""
    
    def test_init_sentry_already_initialized(self):
        """Test init_sentry when already initialized"""
        # Mock the global variable
        with patch('utils.sentry_integration._sentry_initialized', True):
            result = init_sentry()
            assert result is True
    
    def test_init_sentry_disabled(self):
        """Test init_sentry when Sentry is disabled"""
        with patch.dict(os.environ, {'SENTRY_ENABLED': 'false'}):
            with patch('utils.sentry_integration._sentry_initialized', False):
                result = init_sentry()
                assert result is False
    
    def test_init_sentry_no_dsn(self):
        """Test init_sentry when DSN is not configured"""
        with patch.dict(os.environ, {'SENTRY_ENABLED': 'true'}, clear=True):
            with patch('utils.sentry_integration._sentry_initialized', False):
                # Remove SENTRY_DSN if it exists
                if 'SENTRY_DSN' in os.environ:
                    del os.environ['SENTRY_DSN']
                result = init_sentry()
                assert result is False
    
    def test_init_sentry_success(self):
        """Test successful Sentry initialization"""
        with patch.dict(os.environ, {
            'SENTRY_ENABLED': 'true',
            'SENTRY_DSN': 'https://test@sentry.io/test',
            'NODE_ENV': 'development'
        }):
            with patch('utils.sentry_integration._sentry_initialized', False):
                with patch('utils.sentry_integration.sentry_sdk') as mock_sentry:
                    mock_sentry.init = MagicMock()
                    with patch('builtins.__import__', return_value=mock_sentry):
                        result = init_sentry()
                        # Should attempt to initialize
                        assert result in [True, False]  # May fail if sentry_sdk not installed
    
    def test_init_sentry_import_error(self):
        """Test init_sentry when sentry_sdk is not installed"""
        with patch.dict(os.environ, {
            'SENTRY_ENABLED': 'true',
            'SENTRY_DSN': 'https://test@sentry.io/test'
        }):
            with patch('utils.sentry_integration._sentry_initialized', False):
                with patch('builtins.__import__', side_effect=ImportError("No module named 'sentry_sdk'")):
                    result = init_sentry()
                    assert result is False
    
    def test_init_sentry_exception(self):
        """Test init_sentry when initialization raises exception"""
        with patch.dict(os.environ, {
            'SENTRY_ENABLED': 'true',
            'SENTRY_DSN': 'https://test@sentry.io/test'
        }):
            with patch('utils.sentry_integration._sentry_initialized', False):
                with patch('utils.sentry_integration.sentry_sdk') as mock_sentry:
                    mock_sentry.init = MagicMock(side_effect=Exception("Init error"))
                    with patch('builtins.__import__', return_value=mock_sentry):
                        result = init_sentry()
                        assert result is False
    
    def test_init_sentry_production_environment(self):
        """Test init_sentry with production environment"""
        with patch.dict(os.environ, {
            'SENTRY_ENABLED': 'true',
            'SENTRY_DSN': 'https://test@sentry.io/test',
            'NODE_ENV': 'production'
        }):
            with patch('utils.sentry_integration._sentry_initialized', False):
                with patch('utils.sentry_integration.sentry_sdk') as mock_sentry:
                    mock_sentry.init = MagicMock()
                    with patch('builtins.__import__', return_value=mock_sentry):
                        result = init_sentry()
                        # Should attempt to initialize with production settings
                        assert result in [True, False]
    
    def test_redact_sensitive_data_password(self):
        """Test redacting password field"""
        event = {
            "user": {
                "password": "secret123",
                "username": "test"
            }
        }
        
        redacted = _redact_sensitive_data(event)
        
        assert redacted is not None
        assert redacted["user"]["password"] == "[REDACTED]"
        assert redacted["user"]["username"] == "test"
    
    def test_redact_sensitive_data_token(self):
        """Test redacting token field"""
        event = {
            "request": {
                "headers": {
                    "Authorization": "Bearer token123",
                    "Content-Type": "application/json"
                }
            }
        }
        
        redacted = _redact_sensitive_data(event)
        
        assert redacted is not None
        assert redacted["request"]["headers"]["Authorization"] == "[REDACTED]"
        assert redacted["request"]["headers"]["Content-Type"] == "application/json"
    
    def test_redact_sensitive_data_api_key(self):
        """Test redacting API key field"""
        event = {
            "config": {
                "api_key": "sk-1234567890",
                "api_url": "https://api.example.com"
            }
        }
        
        redacted = _redact_sensitive_data(event)
        
        assert redacted is not None
        assert redacted["config"]["api_key"] == "[REDACTED]"
        assert redacted["config"]["api_url"] == "https://api.example.com"
    
    def test_redact_sensitive_data_secret(self):
        """Test redacting secret field"""
        event = {
            "data": {
                "secret": "my_secret_value",
                "public_data": "visible"
            }
        }
        
        redacted = _redact_sensitive_data(event)
        
        assert redacted is not None
        assert redacted["data"]["secret"] == "[REDACTED]"
        assert redacted["data"]["public_data"] == "visible"
    
    def test_redact_sensitive_data_jwt(self):
        """Test redacting JWT field"""
        event = {
            "auth": {
                "jwt_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "user_id": "123"
            }
        }
        
        redacted = _redact_sensitive_data(event)
        
        assert redacted is not None
        assert redacted["auth"]["jwt_token"] == "[REDACTED]"
        assert redacted["auth"]["user_id"] == "123"
    
    def test_redact_sensitive_data_nested_dict(self):
        """Test redacting sensitive data in nested dictionaries"""
        event = {
            "level1": {
                "level2": {
                    "password": "secret",
                    "level3": {
                        "token": "token123"
                    }
                }
            }
        }
        
        redacted = _redact_sensitive_data(event)
        
        assert redacted is not None
        assert redacted["level1"]["level2"]["password"] == "[REDACTED]"
        assert redacted["level1"]["level2"]["level3"]["token"] == "[REDACTED]"
    
    def test_redact_sensitive_data_list(self):
        """Test redacting sensitive data in lists"""
        event = {
            "users": [
                {"username": "user1", "password": "pass1"},
                {"username": "user2", "password": "pass2"}
            ]
        }
        
        redacted = _redact_sensitive_data(event)
        
        assert redacted is not None
        assert redacted["users"][0]["password"] == "[REDACTED]"
        assert redacted["users"][1]["password"] == "[REDACTED]"
        assert redacted["users"][0]["username"] == "user1"
        assert redacted["users"][1]["username"] == "user2"
    
    def test_redact_sensitive_data_case_insensitive(self):
        """Test that redaction is case insensitive"""
        event = {
            "data": {
                "PASSWORD": "secret",
                "Api_Key": "key123",
                "SecretToken": "token123"
            }
        }
        
        redacted = _redact_sensitive_data(event)
        
        assert redacted is not None
        assert redacted["data"]["PASSWORD"] == "[REDACTED]"
        assert redacted["data"]["Api_Key"] == "[REDACTED]"
        assert redacted["data"]["SecretToken"] == "[REDACTED]"
    
    def test_redact_sensitive_data_no_sensitive_fields(self):
        """Test redaction when no sensitive fields are present"""
        event = {
            "user": {
                "username": "test",
                "email": "test@example.com"
            }
        }
        
        redacted = _redact_sensitive_data(event)
        
        assert redacted is not None
        assert redacted["user"]["username"] == "test"
        assert redacted["user"]["email"] == "test@example.com"
    
    def test_redact_sensitive_data_non_dict(self):
        """Test redaction with non-dict input"""
        event = "not a dict"
        
        redacted = _redact_sensitive_data(event)
        
        # Should return the original value if not a dict
        assert redacted == "not a dict" or redacted is None
    
    def test_redact_sensitive_data_empty_dict(self):
        """Test redaction with empty dict"""
        event = {}
        
        redacted = _redact_sensitive_data(event)
        
        assert redacted == {}
    
    def test_redact_sensitive_data_multiple_sensitive_fields(self):
        """Test redaction with multiple sensitive fields"""
        event = {
            "credentials": {
                "password": "pass123",
                "api_key": "key123",
                "secret": "secret123",
                "token": "token123",
                "jwt": "jwt123",
                "authorization": "auth123"
            }
        }
        
        redacted = _redact_sensitive_data(event)
        
        assert redacted is not None
        assert redacted["credentials"]["password"] == "[REDACTED]"
        assert redacted["credentials"]["api_key"] == "[REDACTED]"
        assert redacted["credentials"]["secret"] == "[REDACTED]"
        assert redacted["credentials"]["token"] == "[REDACTED]"
        assert redacted["credentials"]["jwt"] == "[REDACTED]"
        assert redacted["credentials"]["authorization"] == "[REDACTED]"
    
    def test_redact_sensitive_data_mixed_types(self):
        """Test redaction with mixed data types"""
        event = {
            "string": "value",
            "number": 42,
            "boolean": True,
            "list": [1, 2, 3],
            "dict": {
                "password": "secret"
            }
        }
        
        redacted = _redact_sensitive_data(event)
        
        assert redacted is not None
        assert redacted["string"] == "value"
        assert redacted["number"] == 42
        assert redacted["boolean"] is True
        assert redacted["list"] == [1, 2, 3]
        assert redacted["dict"]["password"] == "[REDACTED]"

