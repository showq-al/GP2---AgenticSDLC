# SDLC Multi-Agent System - API

FastAPI backend for the SDLC multi-agent system.

## Prerequisites

- Python 3.11+
- Poetry (Python package manager)
- MongoDB (local or Atlas)

## Setup

### 1. Install Poetry (if not installed)

```bash
# macOS / Linux
curl -sSL https://install.python-poetry.org | python3 -

# Windows (PowerShell)
(Invoke-WebRequest -Uri https://install.python-poetry.org -UseBasicParsing).Content | python -
```

### 2. Install Dependencies

```bash
cd apps/api
poetry install
```

### 3. Set Up Environment Variables

```bash
# Copy the example env file
cp .env.example .env

# Edit .env with your values
```

### 4. Set Up MongoDB

### 5. Run the Application

```bash
# Using Poetry
poetry run uvicorn app.main:app --reload --port 8000

# Or activate virtual environment first
poetry shell
uvicorn app.main:app --reload --port 8000
```

### 6. Verify It Works

Open your browser:
- http://localhost:8000 - Root endpoint
- http://localhost:8000/docs - Swagger UI
- http://localhost:8000/health - Basic health check
- http://localhost:8000/health/detailed - Detailed health with DB status

## Project Structure

```
apps/api/
├── app/
│   ├── config/           # Configuration and settings
│   ├── routers/          # API route handlers
│   ├── services/         # Business logic
│   │   ├── database/     # MongoDB connection
│   │   ├── llm/          # LLM providers (OpenAI, Gemini)
│   │   ├── agents/       # Agent implementations
│   │   └── orchestrator/ # LangGraph workflow
│   ├── models/           # Pydantic schemas
│   └── main.py           # FastAPI app
├── .env                  # Environment variables (create from .env.example)
├── pyproject.toml        # Python dependencies
└── README.md
```

## Common Issues

### "Database not connected" error
- Make sure MongoDB is running
- Check your `MONGODB_URI` in `.env`
- For Atlas, ensure your IP is whitelisted

### Poetry not found
- Make sure Poetry is in your PATH
- Try restarting your terminal

### Port 8000 already in use
```bash
# Use a different port
uvicorn app.main:app --reload --port 8001
```
