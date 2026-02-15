import logging
import time
import json
from threading import Lock
from typing import Optional, Dict, Any

from openai import OpenAI, APIError, RateLimitError, BadRequestError
import tiktoken

from .base import BaseLLMClient

logger = logging.getLogger(__name__)


class OpenAIClient(BaseLLMClient):
    """OpenAI LLM client implementation."""
    
    def __init__(
        self, 
        api_key: str, 
        model: str = "gpt-4o",
        base_url: Optional[str] = None,
        rate_limit: float = 0.5
    ):
        """
        Initialize OpenAI client.
        
        Args:
            api_key: OpenAI API key
            model: Model name (default: gpt-4o)
            base_url: Optional base URL for custom endpoints
            rate_limit: Seconds between API calls
        """
        super().__init__(api_key, model)
        
        self.client = OpenAI(
            api_key=api_key,
            base_url=base_url,
            max_retries=3,
            timeout=120
        )
        
        # Rate limiting
        self._lock = Lock()
        self._last_call = 0
        self.rate_limit = rate_limit
        
        # Token counter
        try:
            self.encoding = tiktoken.encoding_for_model(model)
        except KeyError:
            self.encoding = tiktoken.get_encoding("cl100k_base")
        
        logger.info(f"OpenAI client initialized with model: {model}")
    
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
        """Generate text using OpenAI."""
        if not prompt:
            raise ValueError("Prompt cannot be empty")
        
        self._wait_for_rate_limit()
        
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        
        try:
            logger.debug(f"Generating text with model {self.model}")
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                max_tokens=max_tokens,
                temperature=temperature
            )
            
            result = response.choices[0].message.content
            logger.debug(f"Generated {len(result)} characters")
            
            return result
            
        except BadRequestError as e:
            logger.error(f"Bad request: {e}")
            raise Exception(f"OpenAI bad request: {str(e)}")
        except RateLimitError as e:
            logger.error(f"Rate limit exceeded: {e}")
            raise Exception(f"OpenAI rate limit: {str(e)}")
        except APIError as e:
            logger.error(f"API error: {e}")
            raise Exception(f"OpenAI API error: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected error: {e}")
            raise Exception(f"OpenAI error: {str(e)}")
    
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
        json_prompt = f"{prompt}\n\nRespond with valid JSON matching this schema:\n{json.dumps(schema, indent=2)}"
        
        messages = [
            {"role": "system", "content": "You are a helpful assistant that responds in JSON format."},
            {"role": "user", "content": json_prompt}
        ]
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                max_tokens=max_tokens,
                temperature=temperature,
                response_format={"type": "json_object"}
            )
            
            result = response.choices[0].message.content
            parsed = json.loads(result)
            
            logger.debug(f"Generated structured output with {len(parsed)} keys")
            return parsed
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON: {e}")
            raise Exception(f"Invalid JSON from OpenAI: {str(e)}")
        except Exception as e:
            logger.error(f"Error generating structured output: {e}")
            raise Exception(f"OpenAI structured output error: {str(e)}")
    
    def count_tokens(self, text: str) -> int:
        """Count tokens using tiktoken."""
        try:
            return len(self.encoding.encode(text))
        except Exception as e:
            logger.warning(f"Token counting failed: {e}")
            # Fallback: rough estimate
            return len(text) // 4
