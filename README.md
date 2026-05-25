# AgenticSDLC

A web-based platform that automates the Software Development Life Cycle using a multi-agent AI system. Users submit a project idea through a conversational chat interface, and the system autonomously produces all key SDLC artifacts — requirements, system design, technology stack recommendation, test strategy, and a final IEEE-style document — without manual intervention.

## How It Works

1. User submits a project name and description
2. The **Requirement Agent** (GPT-4o) extracts functional and non-functional requirements
3. User reviews and approves or refines the requirements with feedback
4. The **Design Agent** (Gemini) generates UML use case and class diagrams
5. The **Developer Agent** (GPT-4o) recommends a technology stack
6. The **Tester Agent** (GPT-4o) produces a test strategy and acceptance criteria
7. The **Document Agent** (Gemini) compiles everything into a final formatted document
8. User downloads the complete SDLC document as a PDF

---

## Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| Next.js 14 (React 18) | Frontend framework with App Router |
| TypeScript | Statically typed language |
| Tailwind CSS | Utility-first styling |
| Radix UI | Accessible component primitives |
| Zustand | Client-side state management |
| Axios | HTTP client for API communication |
| jsPDF + html2canvas | PDF export of SDLC documents |
| Supabase JS | Authentication (sign-up, login, sessions) |

### Backend
| Technology | Purpose |
|---|---|
| Python 3.11 | Primary backend language |
| FastAPI | Async REST API framework |
| Uvicorn | ASGI server |
| LangGraph | Multi-agent pipeline orchestration |
| Pydantic | Data validation and settings management |
| Motor | Async MongoDB driver |

### AI / LLM
| Technology | Purpose |
|---|---|
| OpenAI API (GPT-4o) | Requirements, tech stack, and test strategy agents |
| Google Gemini API (gemini-2.5-flash) | Design and document agents |

### Database & Auth
| Technology | Purpose |
|---|---|
| MongoDB | Persistent storage for projects, chats, and artifacts |
| Supabase | Managed authentication and JWT verification |

### DevOps
| Technology | Purpose |
|---|---|
| Docker + Docker Compose | Containerization and service orchestration |
| Turborepo | Monorepo build system |

---

## Prerequisites

- Node.js >= 20
- Python >= 3.11
- Docker and Docker Compose (for containerized setup)
- A MongoDB Atlas cluster (or local MongoDB instance)
- A Supabase project
- OpenAI API key
- Google Gemini API key

---

## Environment Variables

Create a `.env` file inside `apps/api/` using the provided example:

```bash
cp apps/api/.env.example apps/api/.env
```

Then fill in your values:

```env
APP_NAME="SDLC Multi-Agent System"
ENVIRONMENT=development
DEBUG=true

MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net
MONGODB_DB_NAME=sdlc_agents

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key

OPENAI_API_KEY=sk-your-openai-key
GEMINI_API_KEY=your-gemini-key

CORS_ORIGINS=http://localhost:3000
```

---

## Running the Project

### Option 1 — Docker (Recommended)

Runs the frontend, backend, and all services together.

```bash
cd docker
docker compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:4000 |
| API Docs | http://localhost:4000/docs |

To stop:
```bash
docker compose down
```

---

### Option 2 — Local Development (Manual)

#### 1. Install root dependencies

```bash
npm install
```

#### 2. Set up the backend

```bash
cd apps/api

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate        # macOS/Linux
# venv\Scripts\activate         # Windows

# Install Python dependencies
pip install -e .
```

#### 3. Run the backend

```bash
cd apps/api
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Backend will be available at: http://localhost:8000
API docs at: http://localhost:8000/docs

#### 4. Set up and run the frontend

Open a new terminal:

```bash
cd apps/web
npm install
npm run dev
```

Frontend will be available at: http://localhost:3000

---

## Project Structure

```
GP2---AgenticSDLC/
├── apps/
│   ├── api/                        # Python FastAPI backend
│   │   ├── app/
│   │   │   ├── config/             # App settings and constants
│   │   │   ├── middleware/         # Auth, CORS, logging middleware
│   │   │   ├── models/             # Pydantic data models
│   │   │   ├── routers/            # API route handlers
│   │   │   │   ├── agents.py
│   │   │   │   ├── chat.py
│   │   │   │   ├── projects.py
│   │   │   │   └── users.py
│   │   │   ├── services/
│   │   │   │   ├── agents/         # The 5 SDLC agents
│   │   │   │   │   ├── base.py
│   │   │   │   │   ├── requirement_agent.py
│   │   │   │   │   ├── design_agent.py
│   │   │   │   │   ├── developer_agent.py
│   │   │   │   │   ├── tester_agent.py
│   │   │   │   │   └── document_agent.py
│   │   │   │   ├── orchestrator/   # LangGraph pipeline
│   │   │   │   │   ├── graph.py    # Agent graph definition
│   │   │   │   │   ├── nodes.py    # Node implementations
│   │   │   │   │   ├── edges.py    # Conditional routing logic
│   │   │   │   │   ├── state.py    # Shared pipeline state
│   │   │   │   │   └── runner.py   # Pipeline execution helpers
│   │   │   │   ├── llm/            # LLM clients (OpenAI, Gemini, Factory)
│   │   │   │   ├── database/       # MongoDB connection and repositories
│   │   │   │   └── auth/           # Supabase auth integration
│   │   │   └── utils/              # Shared utilities
│   │   ├── .env.example
│   │   └── pyproject.toml
│   │
│   └── web/                        # Next.js frontend
│       └── src/
│           ├── app/
│           │   ├── (auth)/         # Auth pages (login, signup, OTP, reset)
│           │   ├── dashboard/      # Main app (chat, settings)
│           │   └── api/sse/        # SSE streaming route
│           ├── components/
│           │   ├── auth/           # Auth form components
│           │   ├── chat/           # Chat interface components
│           │   ├── feedback/       # Approval and feedback components
│           │   ├── layout/         # Header, sidebar, profile, help center
│           │   ├── messages/       # Per-agent message renderers
│           │   ├── project/        # New/delete project dialogs
│           │   └── ui/             # Shared UI primitives
│           ├── hooks/              # Custom React hooks (useChat, useSSE, useAuth)
│           ├── stores/             # Zustand state stores
│           ├── types/              # TypeScript type definitions
│           └── lib/                # Supabase client setup
│
├── docker/
│   ├── Dockerfile.api
│   ├── Dockerfile.web
│   └── docker-compose.yml
├── package.json                    # Root monorepo config
└── turbo.json                      # Turborepo build config
```

---

## Key Features

- **5-Agent AI Pipeline** — Requirements, Design, Developer, Tester, and Document agents run sequentially via LangGraph
- **Human-in-the-Loop** — User approves or refines requirements before the pipeline continues
- **Real-time Streaming** — Agent outputs are streamed to the UI via Server-Sent Events (SSE)
- **UML Diagrams** — Use case and class diagrams rendered from PlantUML with download as PNG
- **PDF Export** — Full SDLC document exported as a formatted A4 PDF
- **Chat History** — All sessions are saved and searchable by project title
- **Profile Management** — Update display name and profile photo
- **In-app Help Center** — Step-by-step video tutorial for new users
