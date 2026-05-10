import logging
from app.services.orchestrator.state import SDLCState
from app.config import settings
from app.services.llm import LLMFactory
from app.models.agents import AgentInput

logger = logging.getLogger(__name__)

def _get_openai_client():
    return LLMFactory.create_from_config({
        "provider": "openai",
        "api_key": settings.OPENAI_API_KEY,
        "model": "gpt-4o"
    })

def _get_gemini_client():
    return LLMFactory.create_from_config({
        "provider": "gemini",
        "api_key": settings.GEMINI_API_KEY,
        "model": "gemini-2.5-flash"
    })

def requirements_node(state: SDLCState) -> SDLCState:
    logger.info("LangGraph → Requirements Node")
    try:
        from app.services.agents import RequirementAgent
        agent = RequirementAgent(_get_openai_client())
        output = agent.execute(AgentInput(
            project_name=state["project_name"],
            project_description=state["project_description"]
        ))
        if output.status == "failed":
            raise Exception(output.error_message)
        return {**state, "requirements": output.content, "error": None}
    except Exception as e:
        logger.error(f"Requirements node failed: {e}")
        return {**state, "error": str(e)}

def design_node(state: SDLCState) -> SDLCState:
    logger.info("LangGraph → Design Node")
    try:
        from app.services.agents import DesignAgent
        agent = DesignAgent(_get_gemini_client())
        output = agent.execute(AgentInput(
            project_name=state["project_name"],
            project_description=state["project_description"],
            context={"requirements": state.get("requirements", "")}
        ))
        if output.status == "failed":
            raise Exception(f"Gemini design agent failed: {output.error_message}")
        logger.info("Design Node: Gemini succeeded ✅")
        logger.info(f"Design structured_data: {output.structured_data}")
        return {
            **state,
            "design": output.content,
            "design_structured": output.structured_data,
            "error": None
        }
    except Exception as e:
        logger.error(f"Design node failed: {e}")
        return {**state, "error": str(e)}

def developer_node(state: SDLCState) -> SDLCState:
    logger.info("LangGraph → Developer Node")
    try:
        from app.services.agents.developer_agent import DeveloperAgent
        agent = DeveloperAgent(_get_openai_client())
        output = agent.execute(AgentInput(
            project_name=state["project_name"],
            project_description=state["project_description"],
            context={
                "requirements": state.get("requirements", ""),
                "design": state.get("design", "")
            }
        ))
        if output.status == "failed":
            raise Exception(output.error_message)
        return {
            **state,
            "tech_stack": output.content,
            "tech_stack_structured": output.structured_data,
            "error": None
        }
    except Exception as e:
        logger.error(f"Developer node failed: {e}")
        return {**state, "error": str(e)}

def tester_node(state: SDLCState) -> SDLCState:
    logger.info("LangGraph → Tester Node")
    try:
        from app.services.agents.tester_agent import TesterAgent
        agent = TesterAgent(_get_openai_client())
        output = agent.execute(AgentInput(
            project_name=state["project_name"],
            project_description=state["project_description"],
            context={
                "requirements": state.get("requirements", ""),
                "design": state.get("design", ""),
                "tech_stack": state.get("tech_stack", "")
            }
        ))
        if output.status == "failed":
            raise Exception(output.error_message)
        return {
            **state,
            "test_strategy": output.content,
            "test_strategy_structured": output.structured_data,
            "error": None
        }
    except Exception as e:
        logger.error(f"Tester node failed: {e}")
        return {**state, "error": str(e)}

def document_node(state: SDLCState) -> SDLCState:
    logger.info("LangGraph → Document Node")
    try:
        from app.services.agents.document_agent import DocumentAgent
        agent = DocumentAgent(_get_gemini_client())
        design_structured = state.get("design_structured") or {}
        output = agent.execute(AgentInput(
            project_name=state["project_name"],
            project_description=state["project_description"],
            context={
                "requirements": state.get("requirements", ""),
                "design": state.get("design", ""),
                "use_case_diagram": design_structured.get("use_case_diagram", ""),
                "class_diagram": design_structured.get("class_diagram", ""),
                "tech_stack": state.get("tech_stack", ""),
                "test_strategy": state.get("test_strategy", "")
            }
        ))
        if output.status == "failed":
            raise Exception(output.error_message)
        return {
            **state,
            "document": output.content,
            "document_structured": output.structured_data,
            "error": None
        }
    except Exception as e:
        logger.error(f"Document node failed: {e}")
        return {**state, "error": str(e)}