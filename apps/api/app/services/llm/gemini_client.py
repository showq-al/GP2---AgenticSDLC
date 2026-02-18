import logging
import time
import json
from threading import Lock
from typing import Optional, Dict, Any

import google.generativeai as genai

from .base import BaseLLMClient

logger = logging.getLogger(__name__)


class GeminiClient(BaseLLMClient):
    """Google Gemini LLM client implementation."""
    
    def __init__(
        self,
        api_key: str,
        model: str = "gemini-pro",
        rate_limit: float = 0.5
    ):
        """
        Initialize Gemini client.
        
        Args:
            api_key: Google API key
            model: Model name (default: gemini-pro)
            rate_limit: Seconds between API calls
        """
        super().__init__(api_key, model)
        
        genai.configure(api_key=api_key)
        self.client = genai.GenerativeModel(model)
        
        # Rate limiting
        self._lock = Lock()
        self._last_call = 0
        self.rate_limit = rate_limit
        
        logger.info(f"Gemini client initialized with model: {model}")
    
    def _wait_for_rate_limit(self) -> None:
        """Ensure rate limit between API calls."""
        if self.rate_limit <= 0:
            return
            
        with self._lock:
            now = time.time()
            elapsed = now - self._last_call
            sleep_time = self.rate_limit - elapsed
            
            if sleep_time > 0:
                time.sleep(sleep_time)
            
            self._last_call = time.time()
    
    def generate_text(
        self,
        prompt: str,
        max_tokens: int = 2000,
        temperature: float = 0.7,
        system_prompt: Optional[str] = None
    ) -> str:
        """Generate text using Gemini."""
        if not prompt:
            raise ValueError("Prompt cannot be empty")
        
        self._wait_for_rate_limit()
        
        # Combine system prompt with user prompt
        full_prompt = prompt
        if system_prompt:
            full_prompt = f"{system_prompt}\n\n{prompt}"
        
        try:
            logger.debug(f"Generating text with model {self.model}")
            
            response = self.client.generate_content(
                full_prompt,
                generation_config=genai.types.GenerationConfig(
                    max_output_tokens=max_tokens,
                    temperature=temperature
                )
            )
            
            result = response.text
            logger.debug(f"Generated {len(result)} characters")
            
            return result
            
        except Exception as e:
            logger.error(f"Gemini error: {e}")
            raise Exception(f"Gemini API error: {str(e)}")
    
    def generate_structured_output(
        self,
        prompt: str,
        schema: Dict[str, Any],
        max_tokens: int = 2000,
        temperature: float = 0.7
    ) -> Dict[str, Any]:
        """Generate structured JSON output."""
        if not prompt:
            raise ValueError("Prompt cannot be empty")
        
        self._wait_for_rate_limit()
        
        # Add JSON instruction to prompt
        json_prompt = f"{prompt}\n\nRespond with valid JSON matching this schema:\n{json.dumps(schema, indent=2)}\n\nReturn ONLY the JSON, no other text."
        
        try:
            response = self.client.generate_content(
                json_prompt,
                generation_config=genai.types.GenerationConfig(
                    max_output_tokens=max_tokens,
                    temperature=temperature
                )
            )
            
            result = response.text.strip()
            
            # Remove markdown code blocks if present
            if result.startswith("```json"):
                result = result[7:]
            if result.startswith("```"):
                result = result[3:]
            if result.endswith("```"):
                result = result[:-3]
            
            result = result.strip()
            parsed = json.loads(result)
            
            logger.debug(f"Generated structured output with {len(parsed)} keys")
            return parsed
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON: {e}")
            raise Exception(f"Invalid JSON from Gemini: {str(e)}")
        except Exception as e:
            logger.error(f"Error generating structured output: {e}")
            raise Exception(f"Gemini structured output error: {str(e)}")
    
    def count_tokens(self, text: str) -> int:
        """Count tokens (approximate for Gemini)."""
        try:
            # Gemini doesn't have a direct token counter
            # Use rough estimate: ~4 characters per token
            return len(text) // 4
        except Exception as e:
            logger.warning(f"Token counting failed: {e}")
            return len(text) // 4
