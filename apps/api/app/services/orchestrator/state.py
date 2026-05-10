from typing import TypedDict, Optional

class SDLCState(TypedDict):
    # Inputs
    project_name: str
    project_description: str
    project_id: Optional[str]
    # Agent outputs
    requirements: Optional[str]
    design: Optional[str]
    tech_stack: Optional[str]
    test_strategy: Optional[str]
    document: Optional[str]
    # Structured data
    design_structured: Optional[dict]
    tech_stack_structured: Optional[dict]
    test_strategy_structured: Optional[dict]
    document_structured: Optional[dict]
    # Control
    user_approved: Optional[bool]
    user_feedback: Optional[str]
    error: Optional[str]