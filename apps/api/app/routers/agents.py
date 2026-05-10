import logging
import datetime
import json
import queue
import threading
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from bson import ObjectId

from app.services.llm import LLMFactory
from app.services.agents import RequirementAgent
from app.models.agents import AgentInput, AgentOutput, AgentType
from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/agents", tags=["agents"])


class GenerateSDLCRequest(BaseModel):
    project_name: str
    project_description: str


# ── Requirements ──────────────────────────────────────────────────────────────

@router.post("/generate-requirements", response_model=AgentOutput)
async def generate_requirements(request: GenerateSDLCRequest):
    """Node 1 — Requirements Agent via LangGraph."""
    try:
        logger.info(f"[LangGraph] Requirements → {request.project_name}")
        from app.services.orchestrator.runner import run_requirements_only
        state = await run_requirements_only(
            project_name=request.project_name,
            project_description=request.project_description
        )
        if state.get("error"):
            raise HTTPException(status_code=500, detail=state["error"])
        return AgentOutput(
            agent_type=AgentType.REQUIREMENT,
            status="completed",
            content=state["requirements"]
        )
    except Exception as e:
        logger.error(f"Failed to generate requirements: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/refine-requirements", response_model=AgentOutput)
async def refine_requirements(request: dict):
    """Refine requirements based on user feedback."""
    try:
        project_name = request.get("project_name")
        project_description = request.get("project_description")
        original_requirements = request.get("original_requirements")
        user_feedback = request.get("user_feedback")

        logger.info(f"Refining requirements for: {project_name}")

        llm_client = LLMFactory.create_from_config({
            "provider": "openai",
            "api_key": settings.OPENAI_API_KEY,
            "model": "gpt-4o"
        })

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
- Use "The system shall..." ONLY for automated operations
- After applying ALL changes, renumber EVERY FR and NFR sequentially from 1 with no gaps (FR1, FR2, FR3... NFR1, NFR2, NFR3...)
- There must be NO skipped numbers in the final output"""

        user_prompt = f"""# Project: {project_name}

## Description:
{project_description}

## Original Requirements:
{original_requirements}

## User Feedback:
{user_feedback}

## Task:
1. Apply the feedback (add, remove, or modify requirements as requested).
2. Renumber ALL functional requirements sequentially: FR1, FR2, FR3... with no gaps.
3. Renumber ALL non-functional requirements sequentially: NFR1, NFR2, NFR3... with no gaps.
4. Output the complete updated document."""

        response = llm_client.generate_text(
            prompt=user_prompt,
            system_prompt=system_prompt,
            temperature=0.7,
            max_tokens=4000
        )

        return AgentOutput(
            agent_type=AgentType.REQUIREMENT,
            status="completed",
            content=response,
            metadata={"project_name": project_name, "refined_with_feedback": True}
        )

    except Exception as e:
        logger.error(f"Failed to refine requirements: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ── Design → Developer → Tester → Document (LangGraph pipeline) ──────────────

@router.post("/generate-design", response_model=AgentOutput)
async def generate_design(request: dict):
    """Nodes 2-5 — Design + Developer + Tester + Document via LangGraph."""
    try:
        project_name = request.get("project_name")
        project_description = request.get("project_description")
        context = request.get("context", {})
        approved_requirements = context.get("requirements", "")
        project_id = context.get("project_id")

        logger.info(f"[LangGraph] Design→Developer→Tester→Document → {project_name}")

        from app.services.orchestrator.runner import run_full_pipeline
        state = await run_full_pipeline(
            project_name=project_name,
            project_description=project_description,
            approved_requirements=approved_requirements,
            project_id=project_id
        )

        if state.get("error"):
            raise HTTPException(status_code=500, detail=state["error"])

        # Save all artifacts to MongoDB in one shot
        if project_id and ObjectId.is_valid(project_id):
            from app.services.database import MongoDB
            db = MongoDB.get_database()
            await db.projects.update_one(
                {"_id": ObjectId(project_id)},
                {"$set": {
                    "design": {
                        "use_case_diagram": (state.get("design_structured") or {}).get("use_case_diagram", ""),
                        "class_diagram": (state.get("design_structured") or {}).get("class_diagram", ""),
                        "raw_content": state.get("design", "")
                    },
                    "tech_stack": {
                        "content": state.get("tech_stack", ""),
                        "structured_data": state.get("tech_stack_structured")
                    },
                    "test_strategy": {
                        "content": state.get("test_strategy", ""),
                        "structured_data": state.get("test_strategy_structured")
                    },
                    "document": {
                        "content": state.get("document", ""),
                        "structured_data": state.get("document_structured")
                    },
                    "updated_at": datetime.datetime.utcnow()
                }}
            )
            logger.info(f"✅ All artifacts (incl. document) saved → project {project_id}")

        return AgentOutput(
            agent_type=AgentType.DESIGN,
            status="completed",
            content=state.get("design", ""),
            structured_data={
                **(state.get("design_structured") or {}),
                "tech_stack": state.get("tech_stack", ""),
                "tech_stack_structured": state.get("tech_stack_structured"),
                "test_strategy": state.get("test_strategy", ""),
                "test_strategy_structured": state.get("test_strategy_structured"),
                "document": state.get("document", ""),
                "document_structured": state.get("document_structured"),
            }
        )

    except Exception as e:
        logger.error(f"Failed to run LangGraph pipeline: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ── Individual endpoints (frontend calls these after pipeline) ────────────────

@router.post("/generate-tech-stack", response_model=AgentOutput)
async def generate_tech_stack(request: dict):
    try:
        project_name = request.get("project_name")
        project_description = request.get("project_description")
        context = request.get("context", {})

        logger.info(f"[LangGraph] Developer node → {project_name}")

        llm_client = LLMFactory.create_from_config({
            "provider": "openai",
            "api_key": settings.OPENAI_API_KEY,
            "model": "gpt-4o"
        })

        from app.services.agents.developer_agent import DeveloperAgent
        agent = DeveloperAgent(llm_client)
        output = agent.execute(AgentInput(
            project_name=project_name,
            project_description=project_description,
            context=context
        ))

        if output.status == "failed":
            raise HTTPException(status_code=500, detail=output.error_message)
        return output

    except Exception as e:
        logger.error(f"Failed to generate tech stack: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate-test-strategy", response_model=AgentOutput)
async def generate_test_strategy(request: dict):
    try:
        project_name = request.get("project_name")
        project_description = request.get("project_description")
        context = request.get("context", {})

        logger.info(f"[LangGraph] Tester node → {project_name}")

        llm_client = LLMFactory.create_from_config({
            "provider": "openai",
            "api_key": settings.OPENAI_API_KEY,
            "model": "gpt-4o"
        })

        from app.services.agents.tester_agent import TesterAgent
        agent = TesterAgent(llm_client)
        output = agent.execute(AgentInput(
            project_name=project_name,
            project_description=project_description,
            context=context
        ))

        if output.status == "failed":
            raise HTTPException(status_code=500, detail=output.error_message)
        return output

    except Exception as e:
        logger.error(f"Failed to generate test strategy: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-document", response_model=AgentOutput)
async def generate_document(request: dict):
    """Node 5 — Document Agent via Gemini."""
    try:
        project_name = request.get("project_name")
        project_description = request.get("project_description")
        context = request.get("context", {})

        logger.info(f"[LangGraph] Document node → {project_name}")

        llm_client = LLMFactory.create_from_config({
            "provider": "gemini",
            "api_key": settings.GEMINI_API_KEY,
            "model": "gemini-2.5-flash"
        })

        from app.services.agents.document_agent import DocumentAgent
        agent = DocumentAgent(llm_client)

        output = agent.execute(AgentInput(
            project_name=project_name,
            project_description=project_description,
            context=context
        ))

        if output.status == "failed":
            raise HTTPException(status_code=500, detail=output.error_message)

        return output

    except Exception as e:
        logger.error(f"Failed to generate final document: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ── LangGraph Streaming Pipeline ─────────────────────────────────────────────

@router.post("/stream-pipeline")
async def stream_pipeline(request: dict):
    """
    Runs the full LangGraph pipeline (design → developer → tester → document)
    and streams a Server-Sent Event after each node completes.
    """
    import asyncio
    from app.services.orchestrator.state import SDLCState

    project_name = request.get("project_name")
    project_description = request.get("project_description")
    requirements = request.get("requirements", "")
    project_id = request.get("project_id")

    async def event_generator():
        from langgraph.graph import StateGraph, END
        from app.services.orchestrator.nodes import design_node, developer_node, tester_node, document_node
        from app.services.orchestrator.edges import (
            should_continue_after_design,
            should_continue_after_developer,
            should_continue_after_tester,
        )

        initial_state: SDLCState = {
            "project_name": project_name,
            "project_description": project_description,
            "project_id": project_id,
            "requirements": requirements,
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
            "error": None,
        }

        graph = StateGraph(SDLCState)
        graph.add_node("design", design_node)
        graph.add_node("developer", developer_node)
        graph.add_node("tester", tester_node)
        graph.add_node("document", document_node)
        graph.set_entry_point("design")
        graph.add_conditional_edges("design", should_continue_after_design, {"developer": "developer", "end": END})
        graph.add_conditional_edges("developer", should_continue_after_developer, {"tester": "tester", "end": END})
        graph.add_conditional_edges("tester", should_continue_after_tester, {"document": "document", "end": END})
        graph.add_edge("document", END)
        pipeline = graph.compile()

        result_queue: queue.Queue = queue.Queue()

        def run_pipeline():
            try:
                for chunk in pipeline.stream(initial_state):
                    result_queue.put(("chunk", chunk))
                result_queue.put(("done", None))
            except Exception as exc:
                result_queue.put(("error", str(exc)))

        thread = threading.Thread(target=run_pipeline, daemon=True)
        thread.start()

        final_state: dict = dict(initial_state)
        loop = asyncio.get_event_loop()

        while True:
            item_type, item = await loop.run_in_executor(None, result_queue.get)

            if item_type == "error":
                logger.error(f"[stream-pipeline] Error: {item}")
                yield f"data: {json.dumps({'node': 'error', 'message': item})}\n\n"
                break

            elif item_type == "done":
                # Persist all artifacts to MongoDB
                if project_id and ObjectId.is_valid(project_id):
                    try:
                        from app.services.database import MongoDB
                        db = MongoDB.get_database()
                        await db.projects.update_one(
                            {"_id": ObjectId(project_id)},
                            {"$set": {
                                "design": {
                                    "use_case_diagram": (final_state.get("design_structured") or {}).get("use_case_diagram", ""),
                                    "class_diagram": (final_state.get("design_structured") or {}).get("class_diagram", ""),
                                    "raw_content": final_state.get("design", ""),
                                },
                                "tech_stack": {
                                    "content": final_state.get("tech_stack", ""),
                                    "structured_data": final_state.get("tech_stack_structured"),
                                },
                                "test_strategy": {
                                    "content": final_state.get("test_strategy", ""),
                                    "structured_data": final_state.get("test_strategy_structured"),
                                },
                                "document": {
                                    "content": final_state.get("document", ""),
                                    "structured_data": final_state.get("document_structured"),
                                },
                                "updated_at": datetime.datetime.utcnow(),
                            }}
                        )
                        logger.info(f"[stream-pipeline] All artifacts saved → project {project_id}")
                    except Exception as db_err:
                        logger.error(f"[stream-pipeline] MongoDB save failed: {db_err}")

                yield f"data: {json.dumps({'node': 'complete'})}\n\n"
                break

            else:  # chunk
                node_name = list(item.keys())[0]
                node_state = item[node_name]
                final_state.update(node_state)

                if node_name == "design":
                    event_data = {
                        "node": "design",
                        "content": node_state.get("design", ""),
                        "structured_data": node_state.get("design_structured") or {},
                    }
                elif node_name == "developer":
                    event_data = {
                        "node": "developer",
                        "content": node_state.get("tech_stack", ""),
                        "structured_data": node_state.get("tech_stack_structured") or {},
                    }
                elif node_name == "tester":
                    event_data = {
                        "node": "tester",
                        "content": node_state.get("test_strategy", ""),
                        "structured_data": node_state.get("test_strategy_structured") or {},
                    }
                elif node_name == "document":
                    event_data = {
                        "node": "document",
                        "content": node_state.get("document", ""),
                        "structured_data": node_state.get("document_structured") or {},
                    }
                else:
                    continue

                logger.info(f"[stream-pipeline] Node completed: {node_name}")
                yield f"data: {json.dumps(event_data)}\n\n"

        thread.join(timeout=5)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )
