"""
MongoDB models for projects and artifacts.
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from bson import ObjectId


class PyObjectId(str):
    """Custom ObjectId type for Pydantic."""
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return str(v)


class RequirementItem(BaseModel):
    """Single requirement item."""
    id: str
    description: str


class Requirements(BaseModel):
    """Requirements artifact structure."""
    functional_requirements: List[RequirementItem] = []
    non_functional_requirements: List[RequirementItem] = []


class Project(BaseModel):
    """Project model."""
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    user_id: str  # Supabase user ID
    name: str
    description: str
    status: str = "active"  # active, completed, archived
    
    # Agent artifacts
    requirements: Optional[Requirements] = None
    design: Optional[Dict[str, Any]] = None
    tech_stack: Optional[Dict[str, Any]] = None
    test_strategy: Optional[Dict[str, Any]] = None
    final_document: Optional[Dict[str, Any]] = None
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        json_encoders = {
            ObjectId: str,
            datetime: lambda v: v.isoformat()
        }