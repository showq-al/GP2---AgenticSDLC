from abc import ABC, abstractmethod
from typing import Optional, List, Dict, Any
from enum import Enum


class LLMProvider(Enum):
    """Supported LLM providers."""
    OPENAI = "openai"
    GEMINI = "gemini"


class BaseLLMClient(ABC):
    """Abstract base class for LLM clients."""
    
    def __init__(self, api_key: str, model: str):
        """
        Initialize the LLM client.
        
        Args:
            api_key: API key for the provider
            model: Model identifier
        """
        self.api_key = api_key
        self.model = model
    
    @abstractmethod
    def generate_text(
        self, 
        prompt: str, 
        max_tokens: int = 2000,
        temperature: float = 0.7,
        system_prompt: Optional[str] = None
    ) -> str:
        """
        Generate text from a prompt.
        
        Args:
            prompt: User prompt
            max_tokens: Maximum tokens to generate
            temperature: Sampling temperature (0.0-1.0)
            system_prompt: Optional system message
            
        Returns:
            Generated text
            
        Raises:
            Exception: If generation fails
        """
        pass
    
    @abstractmethod
    def generate_structured_output(
        self,
        prompt: str,
        schema: Dict[str, Any],
        max_tokens: int = 2000,
        temperature: float = 0.7
    ) -> Dict[str, Any]:
        """
        Generate structured JSON output matching a schema.
        
        Args:
            prompt: User prompt
            schema: JSON schema for the output
            max_tokens: Maximum tokens to generate
            temperature: Sampling temperature
            
        Returns:
            Parsed JSON object
        """
        pass
    
    @abstractmethod
    def count_tokens(self, text: str) -> int:
        """
        Count tokens in text.
        
        Args:
            text: Text to count
            
        Returns:
            Number of tokens
        """
        pass
