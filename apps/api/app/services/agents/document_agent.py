import logging
import re
import time
from typing import Dict, Any

from app.services.llm import BaseLLMClient
from app.models.agents import AgentInput, AgentOutput, AgentType, AgentStatus
from .base import BaseAgent
from .prompts.document_prompts import (
    DOCUMENT_SYSTEM_PROMPT,
    get_document_user_prompt
)

logger = logging.getLogger(__name__)

MAX_RETRIES = 3
RETRY_DELAY = 5  # seconds between retries


class DocumentAgent(BaseAgent):
    """Agent for generating the final SDLC document."""

    def __init__(self, llm_client: BaseLLMClient):
        super().__init__(llm_client, AgentType.DOCUMENT)

    def get_system_prompt(self) -> str:
        return DOCUMENT_SYSTEM_PROMPT

    def get_user_prompt(self, agent_input: AgentInput) -> str:
        return get_document_user_prompt(
            project_name=agent_input.project_name,
            project_description=agent_input.project_description,
            context=agent_input.context
        )

    def parse_response(self, response: str) -> Dict[str, Any]:
        try:
            return {
                "title": self._extract_title(response),
                "sections": self._extract_sections(response),
                "word_count": len(response.split())
            }
        except Exception as e:
            logger.warning(f"Failed to parse document response: {e}")
            return {"raw_response": response}

    def _extract_title(self, text: str) -> str:
        match = re.search(r"^#\s+(.+)$", text, re.MULTILINE)
        return match.group(1).strip() if match else "Final SDLC Document"

    def _extract_sections(self, text: str) -> list:
        matches = re.findall(r"^##\s+(.+)$", text, re.MULTILINE)
        return [m.strip() for m in matches]

    def execute(self, agent_input: AgentInput) -> AgentOutput:
        last_error = None

        for attempt in range(1, MAX_RETRIES + 1):
            try:
                self.logger.info(
                    f"Executing Document agent for project: {agent_input.project_name} "
                    f"(attempt {attempt}/{MAX_RETRIES})"
                )

                system_prompt = self.get_system_prompt()
                user_prompt   = self.get_user_prompt(agent_input)

                response = self.llm_client.generate_text(
                    prompt=user_prompt,
                    system_prompt=system_prompt,
                    max_tokens=8000,
                    temperature=0.3
                )

                structured_data = self.parse_response(response)

                self.logger.info("Document agent completed successfully")
                return AgentOutput(
                    agent_type=self.agent_type,
                    status=AgentStatus.COMPLETED,
                    content=response,
                    structured_data=structured_data
                )

            except Exception as e:
                last_error = e
                error_str = str(e)
                is_retryable = any(code in error_str for code in ["503", "429", "UNAVAILABLE", "overloaded", "rate limit"])

                if is_retryable and attempt < MAX_RETRIES:
                    wait = RETRY_DELAY * attempt  # 5s, 10s, 15s
                    self.logger.warning(
                        f"Document agent attempt {attempt} failed (retryable): {error_str}. "
                        f"Retrying in {wait}s..."
                    )
                    time.sleep(wait)
                else:
                    self.logger.error(
                        f"Document agent failed after {attempt} attempt(s): {error_str}"
                    )
                    break

        return AgentOutput(
            agent_type=self.agent_type,
            status=AgentStatus.FAILED,
            content="",
            error_message=str(last_error)
        )