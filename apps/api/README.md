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

#### Option A: Local MongoDB (Recommended for Development)

1. Install MongoDB Community Edition:
   - **macOS**: `brew install mongodb-community`
   - **Windows**: Download from https://www.mongodb.com/try/download/community
   - **Linux**: Follow https://www.mongodb.com/docs/manual/administration/install-on-linux/

2. Start MongoDB:
   ```bash
   # macOS
   brew services start mongodb-community
   
   # Linux
   sudo systemctl start mongod
   
   # Windows - it runs as a service automatically
   ```

3. Your `.env` should have:
   ```
   MONGODB_URI=mongodb://localhost:27017
   MONGODB_DB_NAME=sdlc_agents
   ```

#### Option B: MongoDB Atlas (Cloud - Free Tier Available)

1. Go to https://www.mongodb.com/atlas
2. Create a free account
3. Create a new cluster (free tier M0)
4. Click "Connect" → "Connect your application"
5. Copy the connection string
6. Update `.env`:
   ```
   MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net
   MONGODB_DB_NAME=sdlc_agents
   ```

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
