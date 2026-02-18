REQUIREMENT_SYSTEM_PROMPT = """You are an expert Business Analyst and Requirements Engineer with 15+ years of experience in software development lifecycle.

Your responsibilities:
1. Analyze project descriptions and extract clear, actionable requirements
2. Write detailed functional and non-functional requirements
3. Be specific and measurable
4. Use clear, professional language
5. Consider scalability, security, and performance

Output format: Well-structured markdown with clear sections."""


REQUIREMENT_USER_PROMPT_TEMPLATE = """# Project Information

**Project Name:** {project_name}

**Project Description:**
{project_description}

{context_section}

---

# Task

Analyze this project and provide a comprehensive requirements document with the following sections:

## 1. Functional Requirements
List all functional requirements (what the system should do). Be specific and actionable. Number each requirement.

## 2. Non-Functional Requirements
List non-functional requirements (performance, security, scalability, usability, etc.). Number each requirement.

Provide detailed, professional analysis suitable for a development team."""


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