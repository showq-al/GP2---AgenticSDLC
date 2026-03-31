"""
SDLC Multi-Agent System API

Main FastAPI application entry point.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.config import settings
from app.services.database import MongoDB
from app.routers import health_router
from app.routers.users import router as users_router

# Configure logging
logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager.
    
    Handles startup and shutdown events:
    - Startup: Connect to database, initialize services
    - Shutdown: Close database connections, cleanup
    """
    # Startup
    logger.info(f"Starting {settings.APP_NAME}...")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    
    # Connect to MongoDB
    await MongoDB.connect()
    
    logger.info("Application startup complete")
    
    yield  # Application runs here
    
    # Shutdown
    logger.info("Shutting down application...")
    
    # Disconnect from MongoDB
    await MongoDB.disconnect()
    
    logger.info("Application shutdown complete")


# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    description="A multi-agent system for automating the Software Development Life Cycle",
    version="1.0.0",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health_router)

# Import and include projects router
from app.routers.projects import router as projects_router
app.include_router(projects_router)

app.include_router(users_router) 

# Import and include agents router if it exists
try:
    from app.routers.agents import router as agents_router
    app.include_router(agents_router)
except Exception as e:
    logger.warning(f"Agents router not found, skipping... Reason: {e}")


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": f"Welcome to {settings.APP_NAME}",
        "docs": "/docs" if settings.DEBUG else "Disabled in production",
        "health": "/health"
    }