from langgraph.graph import StateGraph, END
from app.services.orchestrator.state import SDLCState
from app.services.orchestrator.nodes import (
    requirements_node,
    design_node,
    developer_node,
    tester_node,
    document_node
)
from app.services.orchestrator.edges import (
    should_continue_after_requirements,
    should_continue_after_design,
    should_continue_after_developer,
    should_continue_after_tester
)

def build_sdlc_graph():
    graph = StateGraph(SDLCState)

    graph.add_node("requirements", requirements_node)
    graph.add_node("design", design_node)
    graph.add_node("developer", developer_node)
    graph.add_node("tester", tester_node)
    graph.add_node("document", document_node)

    graph.set_entry_point("requirements")

    graph.add_conditional_edges(
        "requirements",
        should_continue_after_requirements,
        {"design": "design", "end": END}
    )
    graph.add_conditional_edges(
        "design",
        should_continue_after_design,
        {"developer": "developer", "end": END}
    )
    graph.add_conditional_edges(
        "developer",
        should_continue_after_developer,
        {"tester": "tester", "end": END}
    )
    graph.add_conditional_edges(
        "tester",
        should_continue_after_tester,
        {"document": "document", "end": END}
    )
    graph.add_edge("document", END)

    return graph.compile()

sdlc_graph = build_sdlc_graph()