import logging
from app.services.orchestrator.state import SDLCState

logger = logging.getLogger(__name__)


async def run_requirements_only(
    project_name: str,
    project_description: str
) -> SDLCState:
    from app.services.orchestrator.nodes import requirements_node
    initial_state: SDLCState = {
        "project_name": project_name,
        "project_description": project_description,
        "project_id": None,
        "requirements": None,
        "design": None,
        "tech_stack": None,
        "test_strategy": None,
        "document": None,
        "design_structured": None,
        "tech_stack_structured": None,
        "test_strategy_structured": None,
        "document_structured": None,
        "user_approved": None,
        "user_feedback": None,
        "error": None
    }
    return requirements_node(initial_state)


async def run_full_pipeline(
    project_name: str,
    project_description: str,
    approved_requirements: str,
    project_id: str = None
) -> SDLCState:
    initial_state: SDLCState = {
        "project_name": project_name,
        "project_description": project_description,
        "project_id": project_id,
        "requirements": approved_requirements,
        "design": None,
        "tech_stack": None,
        "test_strategy": None,
        "document": None,
        "design_structured": None,
        "tech_stack_structured": None,
        "test_strategy_structured": None,
        "document_structured": None,
        "user_approved": True,
        "user_feedback": None,
        "error": None
    }

    from langgraph.graph import StateGraph, END
    from app.services.orchestrator.nodes import (
        design_node, developer_node, tester_node, document_node
    )
    from app.services.orchestrator.edges import (
        should_continue_after_design,
        should_continue_after_developer,
        should_continue_after_tester
    )

    graph = StateGraph(SDLCState)
    graph.add_node("design", design_node)
    graph.add_node("developer", developer_node)
    graph.add_node("tester", tester_node)
    graph.add_node("document", document_node)

    graph.set_entry_point("design")

    graph.add_conditional_edges("design", should_continue_after_design,
                                {"developer": "developer", "end": END})
    graph.add_conditional_edges("developer", should_continue_after_developer,
                                {"tester": "tester", "end": END})
    graph.add_conditional_edges("tester", should_continue_after_tester,
                                {"document": "document", "end": END})
    graph.add_edge("document", END)

    pipeline = graph.compile()
    result = pipeline.invoke(initial_state)
    return result