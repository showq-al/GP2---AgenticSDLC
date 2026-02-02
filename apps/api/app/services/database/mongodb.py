"""
MongoDB connection manager using Motor (async MongoDB driver).

This module handles:
- Database connection lifecycle
- Collection access
- Index creation
"""

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from typing import Optional
import logging

from app.config import settings, constants

logger = logging.getLogger(__name__)


class MongoDB:
    """
    MongoDB connection manager.
    
    Handles connection lifecycle and provides access to the database.
    Uses the singleton pattern to ensure only one connection pool exists.
    """
    
    _client: Optional[AsyncIOMotorClient] = None
    _database: Optional[AsyncIOMotorDatabase] = None
    
    @classmethod
    async def connect(cls) -> None:
        """
        Establish connection to MongoDB.
        
        Should be called once during application startup.
        """
        if cls._client is not None:
            logger.warning("MongoDB connection already established")
            return
        
        try:
            logger.info(f"Connecting to MongoDB...")
            
            # Create the Motor client
            cls._client = AsyncIOMotorClient(
                settings.MONGODB_URI,
                maxPoolSize=10,
                minPoolSize=1,
                serverSelectionTimeoutMS=5000,
            )
            
            # Get the database
            cls._database = cls._client[settings.MONGODB_DB_NAME]
            
            # Verify connection by pinging the server
            await cls._client.admin.command("ping")
            
            logger.info(f"Connected to MongoDB database: {settings.MONGODB_DB_NAME}")
            
            # Create indexes
            await cls._create_indexes()
            
        except Exception as e:
            logger.error(f"Failed to connect to MongoDB: {e}")
            cls._client = None
            cls._database = None
            raise
    
    @classmethod
    async def disconnect(cls) -> None:
        """
        Close MongoDB connection.
        
        Should be called during application shutdown.
        """
        if cls._client is None:
            logger.warning("MongoDB connection not established")
            return
        
        logger.info("Disconnecting from MongoDB...")
        cls._client.close()
        cls._client = None
        cls._database = None
        logger.info("Disconnected from MongoDB")
    
    @classmethod
    def get_database(cls) -> AsyncIOMotorDatabase:
        """
        Get the database instance.
        
        Returns:
            The MongoDB database instance.
            
        Raises:
            RuntimeError: If database connection not established.
        """
        if cls._database is None:
            raise RuntimeError(
                "Database not connected. Call MongoDB.connect() first."
            )
        return cls._database
    
    @classmethod
    def get_collection(cls, name: str):
        """
        Get a collection by name.
        
        Args:
            name: The collection name.
            
        Returns:
            The MongoDB collection instance.
        """
        return cls.get_database()[name]
    
    @classmethod
    async def _create_indexes(cls) -> None:
        """
        Create indexes for all collections.
        
        Indexes improve query performance significantly.
        """
        logger.info("Creating MongoDB indexes...")
        
        db = cls.get_database()
        
        # Projects collection indexes
        projects = db[constants.COLLECTIONS.PROJECTS]
        await projects.create_index("user_id")
        await projects.create_index("status")
        await projects.create_index([("user_id", 1), ("created_at", -1)])
        await projects.create_index(
            [("user_id", 1), ("title", "text")],
            name="user_title_text_search"
        )
        
        # Messages collection indexes
        messages = db[constants.COLLECTIONS.MESSAGES]
        await messages.create_index("project_id")
        await messages.create_index([("project_id", 1), ("created_at", 1)])
        
        # Artifacts collection indexes
        artifacts = db[constants.COLLECTIONS.ARTIFACTS]
        await artifacts.create_index("project_id")
        await artifacts.create_index([("project_id", 1), ("type", 1)])
        await artifacts.create_index([("project_id", 1), ("version", -1)])
        
        logger.info("MongoDB indexes created successfully")
    
    @classmethod
    async def health_check(cls) -> dict:
        """
        Perform a health check on the database connection.
        
        Returns:
            Dictionary with health status information.
        """
        try:
            if cls._client is None:
                return {
                    "status": "unhealthy",
                    "message": "Database not connected"
                }
            
            # Ping the server
            await cls._client.admin.command("ping")
            
            # Get server info
            server_info = await cls._client.server_info()
            
            return {
                "status": "healthy",
                "database": settings.MONGODB_DB_NAME,
                "mongodb_version": server_info.get("version", "unknown")
            }
            
        except Exception as e:
            return {
                "status": "unhealthy",
                "message": str(e)
            }


# Dependency for FastAPI
async def get_database() -> AsyncIOMotorDatabase:
    """
    FastAPI dependency to get database instance.
    
    Usage:
        @router.get("/items")
        async def get_items(db: AsyncIOMotorDatabase = Depends(get_database)):
            ...
    """
    return MongoDB.get_database()