from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
from enum import Enum


class AgentType(str, Enum):
    """Types of agents in the system."""
    REQUIREMENT = "requirement"
    DESIGN = "design"
    DEVELOPER = "developer"
    TESTER = "tester"
    DOCUMENT = "document"


class AgentStatus(str, Enum):
    """Status of agent execution."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class AgentInput(BaseModel):
    """Input for an agent."""
    project_name: str = Field(..., description="Name of the project")
    project_description: str = Field(..., description="Description of what to build")
    context: Optional[Dict[str, Any]] = Field(default=None, description="Additional context from previous agents")


class AgentOutput(BaseModel):
    """Output from an agent."""
    agent_type: AgentType = Field(..., description="Type of agent that generated this output")
    status: AgentStatus = Field(..., description="Status of the agent execution")
    content: str = Field(..., description="Main content/output from the agent")
    structured_data: Optional[Dict[str, Any]] = Field(default=None, description="Structured data output")
    error_message: Optional[str] = Field(default=None, description="Error message if failed")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Timestamp of creation")
    
    class Config:
        json_schema_extra = {
            "example": {
                "agent_type": "requirement",
                "status": "completed",
                "content": "## Requirements\n\n1. User authentication\n2. Dashboard...",
                "structured_data": {
                    "requirements": ["auth", "dashboard"],
                    "priority": "high"
                },
                "error_message": None,
                "created_at": "2024-02-06T19:30:00Z"
            }
        }


class RequirementOutput(BaseModel):
    """Structured output from Requirement Agent."""
    functional_requirements: List[str] = Field(..., description="List of functional requirements")
    non_functional_requirements: List[str] = Field(..., description="List of non-functional requirements")
    user_stories: List[str] = Field(..., description="User stories")
    acceptance_criteria: List[str] = Field(..., description="Acceptance criteria")
    constraints: Optional[List[str]] = Field(default=None, description="Project constraints")
    assumptions: Optional[List[str]] = Field(default=None, description="Project assumptions")
