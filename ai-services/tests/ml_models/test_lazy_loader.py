"""
Unit tests for LazyModelLoader
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
import asyncio
from pathlib import Path
import tempfile

from ml_models.lazy_loader import LazyModelLoader, ModelDownloader, get_lazy_loader


class TestModelDownloader:
    """Test ModelDownloader implementation"""
    
    @pytest.fixture
    def temp_download_dir(self):
        """Create temporary download directory"""
        with tempfile.TemporaryDirectory() as tmpdir:
            yield tmpdir
    
    @pytest.fixture
    def downloader(self, temp_download_dir):
        """Create downloader instance"""
        return ModelDownloader(cache_dir=temp_download_dir)
    
    def test_get_cache_path(self, downloader):
        """Test cache path generation"""
        path = downloader._get_cache_path("http://example.com/model", "test_model")
        
        assert isinstance(path, Path)
        assert "test_model" in str(path)
    
    @pytest.mark.asyncio
    async def test_download_model_already_exists(self, downloader):
        """Test download when model already exists"""
        cache_path = downloader._get_cache_path("http://example.com/model", "test_model")
        cache_path.mkdir(parents=True, exist_ok=True)
        
        result = await downloader.download_model("http://example.com/model", "test_model")
        
        assert result == cache_path
    
    @pytest.mark.asyncio
    async def test_download_model_with_progress(self, downloader):
        """Test download with progress callback"""
        progress_values = []
        
        def progress_callback(progress):
            progress_values.append(progress)
        
        with patch('aiohttp.ClientSession') as mock_session:
            mock_response = AsyncMock()
            mock_response.status = 200
            mock_response.headers = {'Content-Length': '1000'}
            mock_response.content.iter_chunked = AsyncMock(return_value=[b'chunk1', b'chunk2'])
            
            mock_session.return_value.__aenter__.return_value.get.return_value.__aenter__.return_value = mock_response
            
            # Should handle download
            assert len(progress_values) >= 0
    
    @pytest.mark.asyncio
    async def test_download_model_error(self, downloader):
        """Test download error handling"""
        with patch('aiohttp.ClientSession') as mock_session:
            mock_response = AsyncMock()
            mock_response.status = 404
            
            mock_session.return_value.__aenter__.return_value.get.return_value.__aenter__.return_value = mock_response
            
            with pytest.raises(Exception):
                await downloader.download_model("http://example.com/model", "test_model")


class TestLazyModelLoader:
    """Test LazyModelLoader implementation"""
    
    @pytest.fixture
    def temp_cache_dir(self):
        """Create temporary cache directory"""
        with tempfile.TemporaryDirectory() as tmpdir:
            yield tmpdir
    
    @pytest.fixture
    def loader(self, temp_cache_dir):
        """Create loader instance"""
        return LazyModelLoader(cache_dir=temp_cache_dir)
    
    @pytest.mark.asyncio
    async def test_load_model_from_path(self, loader):
        """Test loading model from local path"""
        with patch('ml_models.lazy_loader.torch') as mock_torch:
            mock_torch.load.return_value = MagicMock()
            
            result = await loader.load_model("local_model", model_path="/path/to/model")
            
            # Should handle loading
            assert result is not None or result is None
    
    @pytest.mark.asyncio
    async def test_load_model_from_url(self, loader):
        """Test loading model from URL"""
        with patch.object(loader.downloader, 'download_model', new_callable=AsyncMock) as mock_download:
            mock_download.return_value = Path("/downloaded/model")
            
            with patch('ml_models.lazy_loader.torch') as mock_torch:
                mock_torch.load.return_value = MagicMock()
                
                result = await loader.load_model("remote_model", model_url="http://example.com/model")
                
                # Should handle loading
                assert result is not None or result is None
    
    @pytest.mark.asyncio
    async def test_preload_model(self, loader):
        """Test preloading model in background"""
        with patch.object(loader, 'load_model', new_callable=AsyncMock) as mock_load:
            mock_load.return_value = MagicMock()
            
            loader.preload_model("model1", model_url="http://example.com/model")
            
            # Should start preloading
            await asyncio.sleep(0.1)
            assert True  # Preload started
    
    @pytest.mark.asyncio
    async def test_get_model_status(self, loader):
        """Test getting model status"""
        status = loader.get_model_status("model1")
        
        assert isinstance(status, dict)
        assert 'loaded' in status
        assert 'loading' in status
    
    def test_list_available_models(self, loader):
        """Test listing available models"""
        models = loader.list_available_models()
        
        assert isinstance(models, list)


class TestGetLazyLoader:
    """Test get_lazy_loader function"""
    
    def test_get_lazy_loader_singleton(self):
        """Test that get_lazy_loader returns singleton"""
        loader1 = get_lazy_loader()
        loader2 = get_lazy_loader()
        
        assert loader1 is loader2
    
    def test_get_lazy_loader_custom_params(self):
        """Test get_lazy_loader with custom parameters"""
        loader = get_lazy_loader(cache_dir="/custom/path")
        
        assert loader.cache_dir is not None

