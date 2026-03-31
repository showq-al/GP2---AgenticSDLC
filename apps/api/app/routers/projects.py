"""
Projects API endpoints.
"""
from fastapi import APIRouter, HTTPException
from typing import List, Optional
from datetime import datetime
from bson import ObjectId
from app.services.database import MongoDB
from app.models.project import Project, Requirements

router = APIRouter(prefix="/projects", tags=["projects"])


@router.post("/", response_model=dict)
async def create_project(
    user_id: str,
    name: str,
    description: str
):
    """Create a new project."""
    db = MongoDB.get_database()
    project_data = {
        "user_id": user_id,
        "name": name,
        "description": description,
        "status": "active",
        "requirements": None,
        "design": None,
        "tech_stack": None,
        "test_strategy": None,
        "final_document": None,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    result = await db.projects.insert_one(project_data)
    return {
        "project_id": str(result.inserted_id),
        "message": "Project created successfully"
    }


@router.put("/{project_id}/requirements")
async def save_requirements(
    project_id: str,
    requirements: Requirements
):
    """Save requirements for a project."""
    db = MongoDB.get_database()
    if not ObjectId.is_valid(project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID")
    result = await db.projects.update_one(
        {"_id": ObjectId(project_id)},
        {
            "$set": {
                "requirements": requirements.dict(),
                "updated_at": datetime.utcnow()
            }
        }
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"message": "Requirements saved successfully"}


@router.put("/{project_id}/design")
async def save_design(
    project_id: str,
    design: dict
):
    """Save design diagrams for a project."""
    db = MongoDB.get_database()
    if not ObjectId.is_valid(project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID")
    result = await db.projects.update_one(
        {"_id": ObjectId(project_id)},
        {
            "$set": {
                "design": design,
                "updated_at": datetime.utcnow()
            }
        }
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"message": "Design saved successfully"}

@router.get("/completed/{user_id}")
async def get_completed_projects(user_id: str):
    """Return completed chats/projects for sidebar history."""
    db = MongoDB.get_database()

    projects_cursor = db.projects.find(
        {"user_id": user_id, "status": "completed"},
        {
            "_id": 1,
            "name": 1,
            "description": 1,
            "created_at": 1,
            "updated_at": 1,
            "final_document": 1
        }
    ).sort("updated_at", -1)

    projects = []
    async for project in projects_cursor:
        projects.append({
            "id": str(project["_id"]),
            "title": project.get("name", "Untitled Project"),
            "description": project.get("description", ""),
            "has_final_document": bool(project.get("final_document")),
            "created_at": project.get("created_at"),
            "updated_at": project.get("updated_at")
        })

    return {"projects": projects}

@router.get("/{project_id}")
async def get_project(project_id: str):
    """Get a project by ID."""
    db = MongoDB.get_database()
    if not ObjectId.is_valid(project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID")
    project = await db.projects.find_one({"_id": ObjectId(project_id)})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    project["_id"] = str(project["_id"])
    return project

@router.put("/{project_id}/tech-stack")
async def save_tech_stack(
    project_id: str,
    tech_stack: dict
):
    """Save tech stack recommendation for a project."""
    db = MongoDB.get_database()
    if not ObjectId.is_valid(project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID")
    result = await db.projects.update_one(
        {"_id": ObjectId(project_id)},
        {
            "$set": {
                "tech_stack": tech_stack,
                "updated_at": datetime.utcnow()
            }
        }
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"message": "Tech stack saved successfully"}

#what about test strategies? we need to save them too
@router.put("/{project_id}/test-strategy")
async def save_test_strategy(
    project_id: str,
    test_strategy: dict
):
    """Save test strategy for a project."""
    db = MongoDB.get_database()
    if not ObjectId.is_valid(project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID")

    result = await db.projects.update_one(
        {"_id": ObjectId(project_id)},
        {
            "$set": {
                "test_strategy": test_strategy,
                "updated_at": datetime.utcnow()
            }
        }
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")

    return {"message": "Test strategy saved successfully"}

@router.put("/{project_id}/final-document")
async def save_final_document(
    project_id: str,
    final_document: dict
):
    """Save final generated document for a project."""
    db = MongoDB.get_database()
    if not ObjectId.is_valid(project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID")

    result = await db.projects.update_one(
        {"_id": ObjectId(project_id)},
        {
            "$set": {
                "final_document": final_document,
                "updated_at": datetime.utcnow()
            }
        }
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")

    return {"message": "Final document saved successfully"}

@router.put("/{project_id}/complete")
async def complete_project(project_id: str):
    """Mark project as completed after final document generation."""
    db = MongoDB.get_database()

    if not ObjectId.is_valid(project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID")

    result = await db.projects.update_one(
        {"_id": ObjectId(project_id)},
        {
            "$set": {
                "status": "completed",
                "updated_at": datetime.utcnow()
            }
        }
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")

    return {"message": "Project marked as completed"}

@router.delete("/{project_id}")
async def delete_project(project_id: str):
    db = MongoDB.get_database()
    if not ObjectId.is_valid(project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID")
    result = await db.projects.delete_one({"_id": ObjectId(project_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"message": "Project deleted successfully"}    