import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.llm import LLMFactory
from app.services.agents import RequirementAgent
from app.models.agents import AgentInput, AgentOutput

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/agents", tags=["agents"])


class GenerateSDLCRequest(BaseModel):
    """Request for generating SDLC artifacts."""
    project_name: str
    project_description: str


@router.post("/generate-requirements", response_model=AgentOutput)
async def generate_requirements(request: GenerateSDLCRequest):
    """
    Generate requirements using the Requirement Agent.
    
    Args:
        request: Project name and description
        
    Returns:
        Agent output with requirements
    """
    try:
        logger.info(f"Generating requirements for project: {request.project_name}")
        
        # Create LLM client with API key
        config = {
            "provider": "openai",
            "api_key": "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",
            "model": "gpt-4o"
        }
        
        llm_client = LLMFactory.create_from_config(config)
        
        # Create and execute requirement agent
        agent = RequirementAgent(llm_client)
        
        agent_input = AgentInput(
            project_name=request.project_name,
            project_description=request.project_description
        )
        
        output = agent.execute(agent_input)
        
        if output.status == "failed":
            raise HTTPException(status_code=500, detail=output.error_message)
        
        return output
        
    except Exception as e:
        logger.error(f"Failed to generate requirements: {e}")
        raise HTTPException(status_code=500, detail=str(e))