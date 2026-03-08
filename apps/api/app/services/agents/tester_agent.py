import logging
import re
from typing import Dict, Any

from app.services.llm import BaseLLMClient
from app.models.agents import AgentInput, AgentType
from .base import BaseAgent
from .prompts.tester_prompts import (
    TESTER_SYSTEM_PROMPT,
    get_tester_user_prompt
)

logger = logging.getLogger(__name__)


class TesterAgent(BaseAgent):
    """
    Agent for generating a comprehensive testing strategy.

    Takes as input:
    - Project idea / description
    - Approved requirements (from RequirementAgent)
    - System design (from DesignAgent)
    - Recommended technology stack (from DeveloperAgent)

    Produces:
    - Testing overview and approach
    - Testing types: Unit, Integration, System, UAT
    - Test environment with tools and frameworks
    - Acceptance criteria
    - Test cases table (8-12 test cases)
    """

    def __init__(self, llm_client: BaseLLMClient):
        """Initialize the Tester Agent."""
        super().__init__(llm_client, AgentType.TESTER)

    def get_system_prompt(self) -> str:
        """Get the system prompt for test strategy generation."""
        return TESTER_SYSTEM_PROMPT

    def get_user_prompt(self, agent_input: AgentInput) -> str:
        """Generate user prompt from input, including context from previous agents."""
        return get_tester_user_prompt(
            project_name=agent_input.project_name,
            project_description=agent_input.project_description,
            context=agent_input.context
        )

    def parse_response(self, response: str) -> Dict[str, Any]:
        """
        Parse the LLM response and extract structured testing strategy data.

        Args:
            response: Raw markdown response from LLM

        Returns:
            Dictionary with testing overview, types, environment, criteria, and test cases
        """
        try:
            parsed = {
                "testing_overview": self._extract_section(response, "Testing Overview"),
                "unit_testing": self._extract_subsection(response, "Unit Testing"),
                "integration_testing": self._extract_subsection(response, "Integration Testing"),
                "system_testing": self._extract_subsection(response, "System Testing"),
                "uat": self._extract_subsection(response, "User Acceptance Testing"),
                "test_environment": self._extract_section(response, "Test Environment"),
                "acceptance_criteria": self._extract_acceptance_criteria(response),
                "test_cases": self._extract_test_cases(response),
            }
            return parsed

        except Exception as e:
            logger.warning(f"Failed to parse tester agent response: {e}")
            return {"raw_response": response}

    def _extract_section(self, text: str, section_name: str) -> str:
        """Extract a top-level numbered section (### N. Section Name)."""
        try:
            pattern = rf"###[^\n]*{re.escape(section_name)}[^\n]*\n(.*?)(?=\n###|\Z)"
            match = re.search(pattern, text, re.DOTALL | re.IGNORECASE)
            if match:
                return match.group(1).strip()
            return ""
        except Exception as e:
            logger.warning(f"Failed to extract section '{section_name}': {e}")
            return ""

    def _extract_subsection(self, text: str, subsection_name: str) -> str:
        """Extract a subsection under #### headings."""
        try:
            pattern = rf"####[^\n]*{re.escape(subsection_name)}[^\n]*\n(.*?)(?=\n####|\n###|\Z)"
            match = re.search(pattern, text, re.DOTALL | re.IGNORECASE)
            if match:
                return match.group(1).strip()
            return ""
        except Exception as e:
            logger.warning(f"Failed to extract subsection '{subsection_name}': {e}")
            return ""

    def _extract_acceptance_criteria(self, text: str) -> list:
        """Extract acceptance criteria as a list of strings."""
        try:
            section = self._extract_section(text, "Acceptance Criteria")
            if not section:
                return []
            criteria = []
            pattern = r"\*\*AC\d+\*\*:\s*(.+)"
            for match in re.finditer(pattern, section):
                criteria.append(match.group(1).strip())
            return criteria
        except Exception as e:
            logger.warning(f"Failed to extract acceptance criteria: {e}")
            return []

    def _extract_test_cases(self, text: str) -> list:
        """Extract test cases as a list of structured dictionaries."""
        try:
            test_cases = []
            # Find each test case block by TC-XXX id
            pattern = (
                r"\*\*Test Case ID:\*\*\s*(TC-\d+)\s*\n"
                r"\*\*Feature:\*\*\s*([^\n]+)\s*\n"
                r"\*\*Description:\*\*\s*([^\n]+)\s*\n"
                r"\*\*Preconditions:\*\*\s*([^\n]+)\s*\n"
                r"\*\*Test Steps:\*\*\s*\n(.*?)"
                r"\*\*Expected Result:\*\*\s*([^\n]+)\s*\n"
                r"\*\*Priority:\*\*\s*([^\n]+)"
            )
            for match in re.finditer(pattern, text, re.DOTALL):
                steps_raw = match.group(5)
                steps = [
                    s.strip()
                    for s in re.findall(r"\d+\.\s*(.+)", steps_raw)
                ]
                test_cases.append({
                    "id": match.group(1).strip(),
                    "feature": match.group(2).strip(),
                    "description": match.group(3).strip(),
                    "preconditions": match.group(4).strip(),
                    "steps": steps,
                    "expected_result": match.group(6).strip(),
                    "priority": match.group(7).strip(),
                })
            return test_cases
        except Exception as e:
            logger.warning(f"Failed to extract test cases: {e}")
            return []
