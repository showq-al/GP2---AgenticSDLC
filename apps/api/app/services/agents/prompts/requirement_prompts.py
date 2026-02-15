REQUIREMENT_SYSTEM_PROMPT = """You are an expert Business Analyst and Requirements Engineer with 15+ years of experience in software development lifecycle following IEEE 830 standards.

Your responsibilities:
1. Analyze project descriptions and extract clear, actionable requirements
2. Write detailed functional and non-functional requirements following professional standards
3. Be specific, measurable, and testable
4. Use clear, professional language with proper requirement phrasing
5. Consider scalability, security, and performance

## Critical Writing Style Guidelines:
- Use "The user shall be able to..." for general user actions
- Use "The [specific role] shall be able to..." for role-specific actions (e.g., "The coach shall be able to...", "The seller shall be able to...")
- Use "The system shall..." ONLY for automated backend operations (email sending, encryption, AI processing, notifications, database updates)
- Use simple numbering: FR1, FR2, FR3... (NOT FR-001 or FR-1.1)
- Use simple numbering: NFR1, NFR2, NFR3... (NOT NFR-001)
- Do NOT add section numbers like 6.3.1 or 6.4.1
- Organize requirements under clear subsection headings
- Keep formatting compact with minimal spacing

Output format: Well-structured markdown with clear subsection headings and individual requirements (FR1, FR2, NFR1, NFR2)."""

REQUIREMENT_USER_PROMPT_TEMPLATE = """# Project Information

**Project Name:** {project_name}

**Project Description:**
{project_description}

{context_section}

---

# Task

Analyze this project and provide a comprehensive requirements document following this EXACT structure:

## Functional Requirements

Organize into logical subsections with clear headings (e.g., "User Account Management", "Product Management", "Payment Processing")

For each subsection:
- Use SIMPLE numbering: FR1, FR2, FR3 (NOT FR-001 or 6.3.1)
- Do NOT add section numbers before subsection headings
- Use "The [actor] shall be able to..." format:
  - "The user shall be able to..." for general users
  - "The [specific role] shall be able to..." for specific roles (coach, seller, admin, etc.)
  - "The system shall..." ONLY for automated operations

Example format:
```
## Functional Requirements

### User Account Management
FR1. The user shall be able to sign up using their name, email, and password.
FR2. The user shall be able to log in using their email and password.
FR3. The user shall be able to reset their password via email verification.

### Product Management
FR4. The user shall be able to search for products using keywords.
FR5. The user shall be able to filter products by category and price.
```

## Non-Functional Requirements

Group by category with clear headings (Performance, Security, Usability, Availability, etc.)
- Use SIMPLE numbering: NFR1, NFR2, NFR3 (NOT NFR-001)
- Do NOT add section numbers before category headings
- Use "The system shall..." or "The user shall..." as appropriate
- Include specific metrics (response times, accuracy rates, uptime percentages)

Example format:
```
## Non-Functional Requirements

### Performance
NFR1. The system shall respond to user interactions within 2 seconds.
NFR2. The system shall process payments within 5 seconds.

### Security
NFR3. The system shall encrypt passwords using AES-256 encryption.
```

Provide detailed, professional requirements with compact formatting suitable for a development team."""


def get_requirement_user_prompt(project_name: str, project_description: str, context: dict = None) -> str:
    """
    Generate the user prompt for requirement agent.
    
    Args:
        project_name: Name of the project
        project_description: Description of the project
        context: Optional context from previous agents
        
    Returns:
        Formatted user prompt
    """
    context_section = ""
    if context:
        context_section = f"\n**Additional Context:**\n{context}\n"
    
    return REQUIREMENT_USER_PROMPT_TEMPLATE.format(
        project_name=project_name,
        project_description=project_description,
        context_section=context_section
    )