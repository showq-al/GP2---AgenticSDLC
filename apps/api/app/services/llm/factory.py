import logging
from typing import Optional

from .base import BaseLLMClient, LLMProvider
from .openai_client import OpenAIClient
from .gemini_client import GeminiClient

logger = logging.getLogger(__name__)


class LLMFactory:
    """Factory for creating LLM clients."""
    
    @staticmethod
    def create_client(
        provider: LLMProvider,
        api_key: str,
        model: Optional[str] = None,
        **kwargs
    ) -> BaseLLMClient:
        """
        Create an LLM client based on provider.
        
        Args:
            provider: LLM provider enum
            api_key: API key for the provider
            model: Model name (optional, uses defaults if not provided)
            **kwargs: Additional arguments for the client
            
        Returns:
            Configured LLM client
            
        Raises:
            ValueError: If provider is not supported
        """
        if provider == LLMProvider.OPENAI:
            default_model = model or "gpt-4o"
            logger.info(f"Creating OpenAI client with model: {default_model}")
            return OpenAIClient(
                api_key=api_key,
                model=default_model,
                **kwargs
            )
        
        elif provider == LLMProvider.GEMINI:
            default_model = model or "gemini-pro"
            logger.info(f"Creating Gemini client with model: {default_model}")
            return GeminiClient(
                api_key=api_key,
                model=default_model,
                **kwargs
            )
        
        else:
            raise ValueError(f"Unsupported LLM provider: {provider}")
    
    @staticmethod
    def create_from_config(config: dict) -> BaseLLMClient:
        """
        Create client from configuration dictionary.
        
        Args:
            config: Configuration dict with keys:
                - provider: str (openai/gemini)
                - api_key: str
                - model: str (optional)
                - other provider-specific options
                
        Returns:
            Configured LLM client
        """
        provider_str = config.get("provider", "").lower()
        
        if provider_str == "openai":
            provider = LLMProvider.OPENAI
        elif provider_str == "gemini":
            provider = LLMProvider.GEMINI
        else:
            raise ValueError(f"Invalid provider in config: {provider_str}")
        
        api_key = config.get("api_key")
        if not api_key:
            raise ValueError("api_key is required in config")
        
        model = config.get("model")
        
        # Remove provider, api_key, model from kwargs
        kwargs = {k: v for k, v in config.items() 
                 if k not in ["provider", "api_key", "model"]}
        
        return LLMFactory.create_client(
            provider=provider,
            api_key=api_key,
            model=model,
            **kwargs
        )
