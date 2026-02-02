"""
Health check endpoints.

Used for:
- Kubernetes/Docker health probes
- Load balancer health checks
- Monitoring systems
"""

from fastapi import APIRouter
from datetime import datetime

from app.services.database import MongoDB
from app.config import settings

router = APIRouter(tags=["Health"])


@router.get("/health")
async def health_check():
    """
    Basic health check endpoint.
    
    Returns:
        Simple health status.
    """
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": settings.APP_NAME
    }


@router.get("/health/detailed")
async def detailed_health_check():
    """
    Detailed health check including all dependencies.
    
    Returns:
        Health status of all system components.
    """
    # Check MongoDB
    db_health = await MongoDB.health_check()
    
    # Overall status
    all_healthy = db_health["status"] == "healthy"
    
    return {
        "status": "healthy" if all_healthy else "unhealthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": settings.APP_NAME,
        "environment": settings.ENVIRONMENT,
        "components": {
            "database": db_health
        }
    }