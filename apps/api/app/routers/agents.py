import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.llm import LLMFactory
from app.services.agents import RequirementAgent
from app.models.agents import AgentInput, AgentOutput, AgentType
from app.config import settings

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
        
        # Create LLM client
        config = {
            "provider": "openai",
            "api_key": settings.OPENAI_API_KEY,
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


@router.post("/refine-requirements", response_model=AgentOutput)
async def refine_requirements(request: dict):
    """
    Refine requirements based on user feedback.
    """
    try:
        project_name = request.get("project_name")
        project_description = request.get("project_description")
        original_requirements = request.get("original_requirements")
        user_feedback = request.get("user_feedback")
        
        logger.info(f"Refining requirements for project: {project_name} with feedback")
        
        # Create LLM client
        config = {
            "provider": "openai",
            "api_key": settings.OPENAI_API_KEY,
            "model": "gpt-4o"
        }
        
        llm_client = LLMFactory.create_from_config(config)
        
        # Create system prompt
        system_prompt = """You are an expert Business Analyst. You previously generated requirements for a project. 
The user has provided feedback on those requirements. Your task is to refine and improve the requirements 
by incorporating the user's feedback while maintaining the EXACT SAME professional structure and format.

CRITICAL FORMAT RULES:
- Use simple numbering: FR1, FR2, FR3 (NOT FR-001 or FR-1.1)
- Use simple numbering: NFR1, NFR2, NFR3 (NOT NFR-001)
- Do NOT add bullet points or special characters
- Do NOT add section numbers like 6.3.1
- Keep the same subsection headings
- Use "The user shall be able to..." for user actions
- Use "The seller shall be able to..." for seller actions
- Use "The system shall..." ONLY for automated operations
- Continue numbering from where it left off (e.g., if last was FR24, new ones are FR25, FR26)"""

        # Create user prompt with feedback
        user_prompt = f"""# Project Information

**Project Name:** {project_name}

**Project Description:**
{project_description}

---

# Original Requirements Document

{original_requirements}

---

# User Feedback

{user_feedback}

---

# Task

Refine and update the requirements document by:
1. Incorporating the user's feedback
2. Adding any missing requirements suggested in the feedback
3. Maintaining the EXACT SAME format and structure as the original
4. Using simple numbering: FR1, FR2, FR3 (NOT FR-001)
5. Continuing numbering from where it left off
6. Keeping all existing good requirements that weren't criticized

Provide the complete updated requirements document with the EXACT SAME formatting."""

        # Call LLM using generate_text method
        response = llm_client.generate_text(
            prompt=user_prompt,
            system_prompt=system_prompt,
            temperature=0.7,
            max_tokens=4000
        )
        
        # Create output with correct status
        output = AgentOutput(
            agent_type=AgentType.REQUIREMENT,
            status="completed",
            content=response,
            metadata={
                "project_name": project_name,
                "refined_with_feedback": True
            }
        )
        
        return output
        
    except Exception as e:
        logger.error(f"Failed to refine requirements: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-design", response_model=AgentOutput)
async def generate_design(request: GenerateSDLCRequest):
    try:
        logger.info(f"Generating design for project: {request.project_name}")
        config = {
            "provider": "openai",
            "api_key": settings.OPENAI_API_KEY,
            "model": "gpt-4o"
        }
        llm_client = LLMFactory.create_from_config(config)
        from app.services.agents import DesignAgent
        agent = DesignAgent(llm_client)
        agent_input = AgentInput(
            project_name=request.project_name,
            project_description=request.project_description
        )
        output = agent.execute(agent_input)
        if output.status == "failed":
            raise HTTPException(status_code=500, detail=output.error_message)
        return output
    except Exception as e:
        logger.error(f"Failed to generate design: {e}")
        raise HTTPException(status_code=500, detail=str(e))
