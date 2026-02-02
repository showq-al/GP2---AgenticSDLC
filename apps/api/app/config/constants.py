"""
Application-wide constants.
"""

from enum import Enum


class AgentType(str, Enum):
    """Types of agents in the SDLC pipeline."""
    REQUIREMENT = "requirement"
    DESIGN = "design"
    DEVELOPER = "developer"
    TESTER = "tester"
    DOCUMENT = "document"


class MessageType(str, Enum):
    """Types of messages in chat."""
    USER = "user"
    AGENT = "agent"
    SYSTEM = "system"
    ERROR = "error"


class ProjectStatus(str, Enum):
    """Status of a project."""
    ACTIVE = "active"
    COMPLETED = "completed"
    ARCHIVED = "archived"


class WorkflowStatus(str, Enum):
    """Status of the agent workflow."""
    PENDING = "pending"
    PROCESSING = "processing"
    WAITING_APPROVAL = "waiting_approval"
    COMPLETED = "completed"
    FAILED = "failed"


class CollectionNames:
    """MongoDB collection names."""
    PROJECTS = "projects"
    MESSAGES = "messages"
    ARTIFACTS = "artifacts"


class Constants:
    """Application constants."""
    
    # Agent types
    AGENT_TYPE = AgentType
    
    # Message types
    MESSAGE_TYPE = MessageType
    
    # Project status
    PROJECT_STATUS = ProjectStatus
    
    # Workflow status
    WORKFLOW_STATUS = WorkflowStatus
    
    # Collection names
    COLLECTIONS = CollectionNames
    
    # Pagination defaults
    DEFAULT_PAGE_SIZE = 20
    MAX_PAGE_SIZE = 100


constants = Constants()