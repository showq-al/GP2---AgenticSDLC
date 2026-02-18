import logging
from abc import ABC, abstractmethod
from typing import Optional, Dict, Any

from app.services.llm import BaseLLMClient
from app.models.agents import AgentInput, AgentOutput, AgentType, AgentStatus

logger = logging.getLogger(__name__)


class BaseAgent(ABC):
    """Base class for all agents."""
    
    def __init__(self, llm_client: BaseLLMClient, agent_type: AgentType):
        """
        Initialize the agent.
        
        Args:
            llm_client: LLM client for generating responses
            agent_type: Type of this agent
        """
        self.llm_client = llm_client
        self.agent_type = agent_type
        self.logger = logging.getLogger(f"{__name__}.{agent_type.value}")
    
    @abstractmethod
    def get_system_prompt(self) -> str:
        """
        Get the system prompt for this agent.
        
        Returns:
            System prompt string
        """
        pass
    
    @abstractmethod
    def get_user_prompt(self, agent_input: AgentInput) -> str:
        """
        Get the user prompt for this agent based on input.
        
        Args:
            agent_input: Input data for the agent
            
        Returns:
            User prompt string
        """
        pass
    
    @abstractmethod
    def parse_response(self, response: str) -> Dict[str, Any]:
        """
        Parse the LLM response into structured data.
        
        Args:
            response: Raw response from LLM
            
        Returns:
            Structured data dictionary
        """
        pass
    
    def execute(self, agent_input: AgentInput) -> AgentOutput:
        """
        Execute the agent with given input.
        
        Args:
            agent_input: Input data for the agent
            
        Returns:
            Agent output with results
        """
        try:
            self.logger.info(f"Executing {self.agent_type.value} agent for project: {agent_input.project_name}")
            
            # Get prompts
            system_prompt = self.get_system_prompt()
            user_prompt = self.get_user_prompt(agent_input)
            
            # Generate response
            self.logger.debug(f"Generating response with {self.llm_client.__class__.__name__}")
            response = self.llm_client.generate_text(
                prompt=user_prompt,
                system_prompt=system_prompt,
                max_tokens=3000,
                temperature=0.7
            )
            
            # Parse response
            structured_data = self.parse_response(response)
            
            # Create output
            output = AgentOutput(
                agent_type=self.agent_type,
                status=AgentStatus.COMPLETED,
                content=response,
                structured_data=structured_data
            )
            
            self.logger.info(f"{self.agent_type.value} agent completed successfully")
            return output
            
        except Exception as e:
            self.logger.error(f"{self.agent_type.value} agent failed: {str(e)}")
            return AgentOutput(
                agent_type=self.agent_type,
                status=AgentStatus.FAILED,
                content="",
                error_message=str(e)
            )
