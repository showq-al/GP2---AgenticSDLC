
import logging
import re
from typing import Dict, Any

from app.services.llm import BaseLLMClient
from app.models.agents import AgentInput, AgentType
from .base import BaseAgent
from .prompts.design_prompts import (
    DESIGN_SYSTEM_PROMPT,
    get_design_user_prompt
)

logger = logging.getLogger(__name__)


class DesignAgent(BaseAgent):
    """Agent for generating UML diagrams (Use Case and Class Diagrams)."""

    def __init__(self, llm_client: BaseLLMClient):
        super().__init__(llm_client, AgentType.DESIGN)

    def get_system_prompt(self) -> str:
        return DESIGN_SYSTEM_PROMPT

    def get_user_prompt(self, agent_input: AgentInput) -> str:
        return get_design_user_prompt(
            project_name=agent_input.project_name,
            project_description=agent_input.project_description,
            context=agent_input.context
        )

    def parse_response(self, response: str) -> Dict[str, Any]:
        try:
            use_case_diagram = self._extract_plantuml_block(response, index=0)
            class_diagram = self._extract_plantuml_block(response, index=1)
            return {
                "use_case_diagram": use_case_diagram,
                "class_diagram": class_diagram,
                "diagrams_count": sum([1 if use_case_diagram else 0, 1 if class_diagram else 0])
            }
        except Exception as e:
            logger.warning(f"Failed to parse design response: {e}")
            return {"raw_response": response}

    def _extract_plantuml_block(self, text: str, index: int = 0) -> str:
        try:
            pattern = r"```plantuml\s*(.*?)```|(@startuml.*?@enduml)"
            matches = re.findall(pattern, text, re.DOTALL | re.IGNORECASE)
            if not matches or index >= len(matches):
                return ""
            match = matches[index]
            block = match[0] if match[0] else match[1]
            return block.strip()
        except Exception as e:
            logger.warning(f"Failed to extract PlantUML block at index {index}: {e}")
            return ""
