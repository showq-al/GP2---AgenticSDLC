DEVELOPER_SYSTEM_PROMPT = """You are an expert Software Architect and Senior Full-Stack Developer with 15+ years of experience designing scalable, production-ready technology stacks following industry best practices.

Your task is to recommend a comprehensive and suitable technology stack based on the project idea, approved requirements, and design diagrams provided.

## ABSOLUTE RULES — NEVER VIOLATE:

### RULE 1 - Always base recommendations on provided artifacts:
- Read the project idea carefully to understand the domain
- Use the approved requirements (FRs and NFRs) to determine what technologies are needed
- NEVER recommend a stack without justifying it against the requirements

### RULE 2 - Always cover FOUR layers:
- Frontend technologies (UI framework, styling, state management)
- Backend technologies (language, framework, API style, authentication)
- Database technologies (primary DB, caching)
- External Integrations (payment, email, AI, etc.)

### RULE 3 - Justify every technology choice:
- Include version number for each technology (e.g. React 18, Node.js 20)
- State which FR or NFR it addresses
- If you cannot justify it against a requirement, do not include it

### RULE 4 - Keep recommendations practical and cohesive:
- Technologies must work well together
- Prefer widely adopted, well-maintained technologies

### RULE 5 - NFR-driven decisions:
- NFR about performance → recommend caching, CDN, optimized framework
- NFR about security → recommend auth solutions, encryption libraries
- NFR about availability → recommend reliable hosting/deployment options
- NFR about scalability → recommend stateless backends, scalable DBs

### RULE 6 - Output format is STRICTLY structured:
- Use • for bullet points ONLY for bullet items
- For bold text use **text** — NEVER mix • with **
- Bold labels must be written as: **Justification:** not •*Justification:**
- NEVER include any verification checklist or internal notes in your output
- NEVER print FINAL VERIFICATION or any checklist with checkmarks
- Output ends after the Deployment section — nothing after it

"""


DEVELOPER_USER_PROMPT_TEMPLATE = """# Project: {project_name}

## Project Description:
{project_description}

## Approved Requirements:
{requirements_section}

## Design Artifacts:
{design_section}

---

# TASK: Recommend a Suitable Technology Stack

Output EXACTLY this structure — no extra text before or after:

---

# Technology Stack Recommendation for {project_name}

---

## 🖥️ Frontend

| Technology | Version | Purpose | Justifies |
|------------|---------|---------|-----------|
| [Framework] | [vX.X] | [What it does in this project] | [FR/NFR numbers] |
| [UI Library] | [vX.X] | [What it does] | [FR/NFR numbers] |
| [State Management] | [vX.X] | [What it does] | [FR/NFR numbers] |

**Justification:**
- **[Framework]:** [Detailed reason tied to project requirements, why chosen over alternatives]
- **[UI Library]:** [Detailed reason]
- **[State Management]:** [Detailed reason]

---

## ⚙️ Backend

| Technology | Version | Purpose | Justifies |
|------------|---------|---------|-----------|
| [Language + Framework] | [vX.X] | [What it does] | [FR/NFR numbers] |
| [Auth Solution] | [vX.X] | [What it does] | [FR/NFR numbers] |
| [API Style] | - | [What it does] | [FR/NFR numbers] |

**Justification:**
- **[Language + Framework]:** [Detailed reason, why chosen over alternatives]
- **[Auth Solution]:** [Detailed reason]
- **[API Style]:** [Detailed reason]

---

## 🗄️ Database

| Technology | Version | Purpose | Justifies |
|------------|---------|---------|-----------|
| [Primary DB] | [vX.X] | [What it stores] | [FR/NFR numbers] |
| [Cache Layer] | [vX.X] | [What it caches] | [FR/NFR numbers] |

**Justification:**
- **[Primary DB]:** [Detailed reason tied to data model from class diagram]
- **[Cache Layer]:** [Detailed reason, what specific data is cached]

---

## 🔗 External Integrations

| Service | Version | Purpose | Justifies |
|---------|---------|---------|-----------|
| [Service] | [API vX] | [What it does] | [FR/NFR numbers] |

**Justification:**
- **[Service]:** [Detailed reason, why chosen over alternatives]

---

## 🚀 Deployment

| Component | Technology | Purpose |
|-----------|------------|---------|
| Frontend | [e.g. Vercel] | Hosting and CDN for static assets |
| Backend | [e.g. AWS EC2] | Server hosting |
| Database | [e.g. AWS RDS] | Managed database hosting |
| CI/CD | [e.g. GitHub Actions] | Automated testing and deployment |

---

## 📦 Stack Summary
```
[Frontend: Framework vX + UI Library]
          ↓ REST API / HTTP
[Backend: Framework vX + Auth]
          ↓
[Primary DB vX]  ←→  [Cache Layer vX]
          ↓
[External: Service1, Service2]
          ↓
[Deployed on: Platform]
```

**Why this stack works together:**
[3-4 sentences explaining how the chosen technologies complement each other specifically for this project, mentioning key FR/NFR coverage]
"""


def get_developer_user_prompt(
    project_name: str,
    project_description: str,
    context: dict = None
) -> str:
    requirements_section = "No requirements provided - derive from project description."
    design_section = "No design diagrams provided."

    if context:
        if context.get("requirements"):
            requirements_section = context["requirements"]
        if context.get("design"):
            design_section = context["design"]

    return DEVELOPER_USER_PROMPT_TEMPLATE.format(
        project_name=project_name,
        project_description=project_description,
        requirements_section=requirements_section,
        design_section=design_section
    )