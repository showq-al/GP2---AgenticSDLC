import logging
import re
import time
from typing import Dict, Any
from app.services.llm import BaseLLMClient
from app.models.agents import AgentInput, AgentOutput, AgentType, AgentStatus
from .base import BaseAgent
from .prompts.design_prompts import (
    DESIGN_SYSTEM_PROMPT,
    get_design_user_prompt
)

logger = logging.getLogger(__name__)

MAX_RETRIES = 3
RETRY_DELAY = 5  # seconds between retries


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

    def execute(self, agent_input: AgentInput) -> AgentOutput:
        last_error = None

        for attempt in range(1, MAX_RETRIES + 1):
            try:
                self.logger.info(f"Executing {self.agent_type.value} agent for project: {agent_input.project_name} (attempt {attempt}/{MAX_RETRIES})")
                system_prompt = self.get_system_prompt()
                user_prompt = self.get_user_prompt(agent_input)
                self.logger.debug(f"Generating response with {self.llm_client.__class__.__name__}")
                response = self.llm_client.generate_text(
                    prompt=user_prompt,
                    system_prompt=system_prompt,
                    max_tokens=16000,
                    temperature=0.7
                )
                structured_data = self.parse_response(response)
                use_case = structured_data.get("use_case_diagram", "")
                class_diag = structured_data.get("class_diagram", "")

                # Retry if extraction failed (empty diagrams = truncated or malformed output)
                if (not use_case or not class_diag) and attempt < MAX_RETRIES:
                    wait = RETRY_DELAY * attempt
                    self.logger.warning(
                        f"{self.agent_type.value} agent attempt {attempt}: diagram extraction returned empty "
                        f"(use_case={'ok' if use_case else 'EMPTY'}, class={'ok' if class_diag else 'EMPTY'}). "
                        f"Retrying in {wait}s..."
                    )
                    time.sleep(wait)
                    continue

                output = AgentOutput(
                    agent_type=self.agent_type,
                    status=AgentStatus.COMPLETED,
                    content=response,
                    structured_data=structured_data
                )
                self.logger.info(f"{self.agent_type.value} agent completed successfully")
                return output

            except Exception as e:
                last_error = e
                error_str = str(e)
                is_retryable = any(code in error_str for code in ["503", "429", "UNAVAILABLE", "overloaded", "rate limit"])

                if is_retryable and attempt < MAX_RETRIES:
                    wait = RETRY_DELAY * attempt  # 5s, 10s, 15s
                    self.logger.warning(f"{self.agent_type.value} agent attempt {attempt} failed (retryable): {error_str}. Retrying in {wait}s...")
                    time.sleep(wait)
                else:
                    self.logger.error(f"{self.agent_type.value} agent failed after {attempt} attempt(s): {error_str}")
                    break

        return AgentOutput(
            agent_type=self.agent_type,
            status=AgentStatus.FAILED,
            content="",
            error_message=str(last_error)
        )

    def parse_response(self, response: str) -> Dict[str, Any]:
        logger.debug(f"Design Agent raw response:\n{response}")
        try:
            use_case_diagram = self._extract_plantuml_block(response, index=0)
            class_diagram = self._extract_plantuml_block(response, index=1)
            logger.debug(f"Extracted use_case: {use_case_diagram[:100] if use_case_diagram else 'EMPTY'}")
            logger.debug(f"Extracted class: {class_diagram[:100] if class_diagram else 'EMPTY'}")
            return {
                "use_case_diagram": use_case_diagram,
                "class_diagram": class_diagram,
                "diagrams_count": sum([1 if use_case_diagram else 0, 1 if class_diagram else 0])
            }
        except Exception as e:
            logger.warning(f"Failed to parse design response: {e}")
            return {"raw_response": response}

    def _clean_plantuml(self, code: str) -> str:
        """Remove inline comments and other common LLM-generated syntax issues."""
        lines = []
        for line in code.split('\n'):
            # Strip inline comments after use case declarations: (Name) ' comment → (Name)
            cleaned = re.sub(r"(\([^)]+\))\s*'.*$", r"\1", line)
            # Strip inline comments after actor/arrow lines (but keep standalone comment lines)
            if not cleaned.strip().startswith("'"):
                cleaned = re.sub(r"^(\s*(?:actor|rectangle|skinparam|\w+\s*-->|[\w]+\s*--\|>|[\w]+\s*\.\.\>)[^']*?)\s*'.*$", r"\1", cleaned)
            # Fix: remove invalid `as alias` in class diagram relationship lines
            # e.g. `Review "1" --> "1" User as writer : written by` → `Review "1" --> "1" User : written by`
            cleaned = re.sub(r'(\s*\w[\w\s]*"[^"]*"\s*--[>|]\s*"[^"]*"\s*\w+)\s+as\s+\w+(\s*:)', r'\1\2', cleaned)
            # Fix: two multiplicities before arrow → move second to right, drop third
            # e.g. `A "1" "0..1" --> "1" B` → `A "1" --> "0..1" B`
            cleaned = re.sub(r'("[^"]*")\s+("[^"]*")\s+(--[->|<*.]+)\s+"[^"]*"', r'\1 \3 \2', cleaned)
            lines.append(cleaned)
        return '\n'.join(lines)

    def _extract_plantuml_block(self, text: str, index: int = 0) -> str:
        try:
            blocks = []
            fenced = re.findall(r'```plantuml\s*(.*?)```', text, re.DOTALL | re.IGNORECASE)
            blocks.extend([b.strip() for b in fenced])
            if len(blocks) <= index:
                raw = re.findall(r'(@startuml.*?@enduml)', text, re.DOTALL | re.IGNORECASE)
                blocks.extend([b.strip() for b in raw])
            if len(blocks) <= index:
                generic = re.findall(r'```\s*(.*?)```', text, re.DOTALL)
                for b in generic:
                    if '@startuml' in b:
                        blocks.append(b.strip())
            # Fallback: handle truncated output where @enduml is missing
            if len(blocks) <= index:
                starts = [m.start() for m in re.finditer(r'@startuml', text, re.IGNORECASE)]
                for start in starts:
                    end = text.find('@enduml', start)
                    if end == -1:
                        # Truncated — take everything from @startuml to end of text
                        blocks.append(text[start:].strip())
                    else:
                        blocks.append(text[start:end + len('@enduml')].strip())
            if index < len(blocks):
                block = blocks[index]
                if not block.startswith('@startuml'):
                    block = '@startuml\n' + block
                if not block.endswith('@enduml'):
                    block = block + '\n@enduml'
                return self._clean_plantuml(block)
            return ""
        except Exception as e:
            logger.warning(f"Failed to extract PlantUML block at index {index}: {e}")
            return ""