import logging
import re
from typing import Dict, Any

from app.services.llm import BaseLLMClient
from app.models.agents import AgentInput, AgentType
from .base import BaseAgent
from .prompts.requirement_prompts import (
    REQUIREMENT_SYSTEM_PROMPT,
    get_requirement_user_prompt
)

logger = logging.getLogger(__name__)


class RequirementAgent(BaseAgent):
    """Agent for analyzing requirements and generating requirement documents."""
    
    def __init__(self, llm_client: BaseLLMClient):
        """Initialize the Requirement Agent."""
        super().__init__(llm_client, AgentType.REQUIREMENT)
    
    def get_system_prompt(self) -> str:
        """Get the system prompt for requirement analysis."""
        return REQUIREMENT_SYSTEM_PROMPT
    
    def get_user_prompt(self, agent_input: AgentInput) -> str:
        """Generate user prompt from input."""
        return get_requirement_user_prompt(
            project_name=agent_input.project_name,
            project_description=agent_input.project_description,
            context=agent_input.context
        )
    
    def parse_response(self, response: str) -> Dict[str, Any]:
        """
        Parse the response and extract structured data.
        
        Args:
            response: Raw markdown response from LLM
            
        Returns:
            Dictionary with parsed requirements
        """
        try:
            parsed = {
                "functional_requirements": self._extract_section(response, "Functional Requirements"),
                "non_functional_requirements": self._extract_section(response, "Non-Functional Requirements")
            }
            
            return parsed
            
        except Exception as e:
            logger.warning(f"Failed to parse response: {e}")
            return {"raw_response": response}
    
    def _extract_section(self, text: str, section_name: str) -> list:
        """
        Extract a section from markdown text.
        
        Args:
            text: Full markdown text
            section_name: Name of the section to extract
            
        Returns:
            List of items from that section
        """
        try:
            # Find section header (## or ###)
            pattern = rf"###+?\s*\d*\.?\s*{re.escape(section_name)}[^\n]*\n(.*?)(?=\n##|\Z)"
            match = re.search(pattern, text, re.DOTALL | re.IGNORECASE)
            
            if not match:
                return []
            
            section_content = match.group(1).strip()
            
            # Extract list items (lines starting with -, *, or numbers)
            items = []
            for line in section_content.split('\n'):
                line = line.strip()
                # Match list items: -, *, 1., etc.
                if re.match(r'^[-*\d]+[\.)]\s+', line):
                    # Remove the list marker
                    item = re.sub(r'^[-*\d]+[\.)]\s+', '', line).strip()
                    if item:
                        items.append(item)
            
            return items
            
        except Exception as e:
            logger.warning(f"Failed to extract section '{section_name}': {e}")
            return []