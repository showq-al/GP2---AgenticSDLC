import logging
import time
import json
from threading import Lock
from typing import Optional, Dict, Any

from google import genai
from google.genai import types

from .base import BaseLLMClient

logger = logging.getLogger(__name__)


class GeminiClient(BaseLLMClient):
    """Google Gemini client using the current Google GenAI SDK."""

    def __init__(
        self,
        api_key: str,
        model: str = "gemini-2.5-flash",
        rate_limit: float = 0.5
    ):
        super().__init__(api_key, model)

        self.client = genai.Client(api_key=api_key)

        self._lock = Lock()
        self._last_call = 0
        self.rate_limit = rate_limit

        logger.info(f"Gemini client initialized with model: {model}")

    def _wait_for_rate_limit(self) -> None:
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
        if not prompt:
            raise ValueError("Prompt cannot be empty")

        self._wait_for_rate_limit()

        try:
            logger.debug(f"Generating text with model {self.model}")

            response = self.client.models.generate_content(
                model=self.model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system_prompt or "",
                    temperature=temperature,
                    max_output_tokens=max_tokens,
                ),
            )

            result = response.text or ""
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
        if not prompt:
            raise ValueError("Prompt cannot be empty")

        self._wait_for_rate_limit()

        json_prompt = (
            f"{prompt}\n\n"
            f"Respond with valid JSON matching this schema:\n"
            f"{json.dumps(schema, indent=2)}\n\n"
            f"Return ONLY the JSON, no other text."
        )

        try:
            response = self.client.models.generate_content(
                model=self.model,
                contents=json_prompt,
                config=types.GenerateContentConfig(
                    temperature=temperature,
                    max_output_tokens=max_tokens,
                    response_mime_type="application/json",
                ),
            )

            result = (response.text or "").strip()
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
        return len(text) // 4