import logging
import re
from typing import Dict, Any

from app.services.llm import BaseLLMClient
from app.models.agents import AgentInput, AgentType
from .base import BaseAgent
from .prompts.developer_prompts import (
    DEVELOPER_SYSTEM_PROMPT,
    get_developer_user_prompt
)

logger = logging.getLogger(__name__)


class DeveloperAgent(BaseAgent):
    """
    Agent for recommending a suitable technology stack.

    Takes as input:
    - Project idea / description
    - Approved requirements (from RequirementAgent)
    - Design diagrams (from DesignAgent)

    Produces:
    - Frontend, Backend, and Database technology recommendations
    - Justification tied to specific FRs and NFRs
    - A stack summary showing how all pieces connect
    """

    def __init__(self, llm_client: BaseLLMClient):
        """Initialize the Developer Agent."""
        super().__init__(llm_client, AgentType.DEVELOPER)

    def get_system_prompt(self) -> str:
        """Get the system prompt for tech stack recommendation."""
        return DEVELOPER_SYSTEM_PROMPT

    def get_user_prompt(self, agent_input: AgentInput) -> str:
        """Generate user prompt from input, including context from previous agents."""
        return get_developer_user_prompt(
            project_name=agent_input.project_name,
            project_description=agent_input.project_description,
            context=agent_input.context
        )

    def parse_response(self, response: str) -> Dict[str, Any]:
        """
        Parse the LLM response and extract structured tech stack data.

        Args:
            response: Raw markdown response from LLM

        Returns:
            Dictionary with frontend, backend, database, and integrations sections
        """
        try:
            parsed = {
                "frontend": self._extract_section(response, "Frontend"),
                "backend": self._extract_section(response, "Backend"),
                "database": self._extract_section(response, "Database"),
                "external_integrations": self._extract_section(response, "External Integrations"),
                "stack_summary": self._extract_stack_summary(response),
                "technologies": self._extract_all_technologies(response)
            }
            return parsed

        except Exception as e:
            logger.warning(f"Failed to parse developer agent response: {e}")
            return {"raw_response": response}

    def _extract_section(self, text: str, section_name: str) -> str:
        """
        Extract a named section from the markdown response.

        Args:
            text: Full markdown text
            section_name: Name of the section to extract (e.g., 'Frontend')

        Returns:
            Section content as a string, or empty string if not found
        """
        try:
            # Match sections like ### 🖥️ Frontend or ### Frontend
            pattern = rf"###[^\n]*{re.escape(section_name)}[^\n]*\n(.*?)(?=\n###|\n##|\Z)"
            match = re.search(pattern, text, re.DOTALL | re.IGNORECASE)
            if match:
                return match.group(1).strip()
            return ""
        except Exception as e:
            logger.warning(f"Failed to extract section '{section_name}': {e}")
            return ""

    def _extract_stack_summary(self, text: str) -> str:
        """
        Extract the Stack Summary section from the response.

        Args:
            text: Full markdown text

        Returns:
            Stack summary content as a string
        """
        try:
            pattern = r"###[^\n]*Stack Summary[^\n]*\n(.*?)(?=\n###|\n##|\Z)"
            match = re.search(pattern, text, re.DOTALL | re.IGNORECASE)
            if match:
                return match.group(1).strip()
            return ""
        except Exception as e:
            logger.warning(f"Failed to extract stack summary: {e}")
            return ""

    def _extract_all_technologies(self, text: str) -> list:
        """
        Extract a flat list of all technology names mentioned in table rows.

        Args:
            text: Full markdown text

        Returns:
            List of technology name strings
        """
        try:
            technologies = []
            # Match table rows: | Technology Name | ... |
            pattern = r"^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|"
            for line in text.split("\n"):
                match = re.match(pattern, line)
                if match:
                    tech_name = match.group(1).strip()
                    # Skip header rows and separator rows
                    if tech_name.lower() not in ("technology", "service", "---", "") and "---" not in tech_name:
                        technologies.append(tech_name)
            return technologies
        except Exception as e:
            logger.warning(f"Failed to extract technologies list: {e}")
            return []