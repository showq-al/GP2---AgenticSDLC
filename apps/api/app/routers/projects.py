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
