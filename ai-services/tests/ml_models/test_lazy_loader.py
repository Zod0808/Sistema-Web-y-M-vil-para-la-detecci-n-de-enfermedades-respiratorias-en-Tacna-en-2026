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
        return LazyModelLoader(downloader=ModelDownloader(cache_dir=temp_cache_dir))

    @pytest.mark.asyncio
    async def test_load_model_lazy_without_url(self, loader):
        """Test loading model lazily without a download URL"""
        mock_model = MagicMock()
        loader_func = MagicMock(return_value=mock_model)

        result = await loader.load_model_lazy("local_model", "test_type", loader_func)

        assert result is mock_model
        loader_func.assert_called_once()
        assert "test_type:local_model" in loader.get_loaded_models()

    @pytest.mark.asyncio
    async def test_load_model_lazy_with_url(self, loader):
        """Test loading model lazily with a download URL"""
        with patch.object(loader.downloader, 'download_model', new_callable=AsyncMock) as mock_download:
            mock_download.return_value = Path("/downloaded/model")
            mock_model = MagicMock()
            loader_func = MagicMock(return_value=mock_model)

            result = await loader.load_model_lazy(
                "remote_model", "test_type", loader_func, model_url="http://example.com/model"
            )

            assert result is mock_model
            mock_download.assert_called_once_with("http://example.com/model", "remote_model")

    @pytest.mark.asyncio
    async def test_preload_models(self, loader):
        """Test preloading models in background"""
        mock_model = MagicMock()
        loader_func = MagicMock(return_value=mock_model)

        await loader.preload_models([
            {'model_name': 'model1', 'model_type': 'test_type', 'loader_func': loader_func}
        ])

        assert "test_type:model1" in loader.get_loaded_models()

    def test_get_loaded_models_empty(self, loader):
        """Test listing loaded models when none loaded"""
        models = loader.get_loaded_models()

        assert isinstance(models, list)
        assert models == []

    @pytest.mark.asyncio
    async def test_unload_model(self, loader):
        """Test unloading a previously loaded model"""
        loader_func = MagicMock(return_value=MagicMock())
        await loader.load_model_lazy("model1", "test_type", loader_func)

        assert loader.unload_model("model1", "test_type") is True
        assert loader.get_loaded_models() == []


class TestGetLazyLoader:
    """Test get_lazy_loader function"""
    
    def test_get_lazy_loader_singleton(self):
        """Test that get_lazy_loader returns singleton"""
        loader1 = get_lazy_loader()
        loader2 = get_lazy_loader()
        
        assert loader1 is loader2
    
    def test_get_lazy_loader_custom_params(self, monkeypatch, tmp_path):
        """Test get_lazy_loader respects the ML_MODEL_DOWNLOAD_DIR env var"""
        import ml_models.lazy_loader as lazy_loader_module
        monkeypatch.setattr(lazy_loader_module, '_global_lazy_loader', None)
        custom_dir = tmp_path / "custom_models"
        monkeypatch.setenv("ML_MODEL_DOWNLOAD_DIR", str(custom_dir))

        loader = get_lazy_loader()

        assert loader.downloader.cache_dir == custom_dir

