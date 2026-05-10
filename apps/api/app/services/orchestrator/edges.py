from app.services.orchestrator.state import SDLCState

def should_continue_after_requirements(state: SDLCState) -> str:
    if state.get("error"):
        return "end"
    return "design"

def should_continue_after_design(state: SDLCState) -> str:
    if state.get("error"):
        return "end"
    return "developer"

def should_continue_after_developer(state: SDLCState) -> str:
    if state.get("error"):
        return "end"
    return "tester"

def should_continue_after_tester(state: SDLCState) -> str:
    if state.get("error"):
        return "end"
    return "document"

