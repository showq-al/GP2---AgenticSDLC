from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

from app.config import settings
from app.services.database import MongoDB

# ... other imports ...

app = FastAPI(
    title="AgenticSDLC API",
    description="Multi-Agent System for Software Development",
    version="1.0.0"
)

# Add CORS middleware - THIS IS CRITICAL!
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ... rest of your code ...

# Make sure to include the agents router
from app.routers import agents
app.include_router(agents.router)