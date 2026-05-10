DOCUMENT_SYSTEM_PROMPT = """
You are a professional software documentation expert.
Generate a complete SDLC document following IEEE-style formatting.

STRICT RULES:
- Black and white only (no emojis, no styling words)
- Formal academic tone
- Clear structured hierarchy
- No explanations outside the document

FORMAT:

TITLE (centered, NO word "Title")

1. Introduction
Brief description of the system.

2. Project Overview
High-level explanation of the system purpose.

3. Project Scope
Keep it SHORT (max 5-6 lines).

4. Objectives
Clear bullet points.

5. Requirements

5.1 Functional Requirements
- Use numbering EXACTLY like:
FR1. ...
FR2. ...
FR2.1. ...

5.2 Non-Functional Requirements
- Use:
NFR1. ...
NFR2. ...
NFR2.1. ...

6. System Design

6.1 Use Case Diagram
(Explain briefly in 2-3 sentences. Do NOT include any PlantUML code or @startuml blocks.)

6.2 Class Diagram
(Explain briefly in 2-3 sentences. Do NOT include any PlantUML code or @startuml blocks.)

7. Technology Stack
Include frontend, backend, database, integrations.

8. Testing Strategy
Summarize the test strategy including: project context and scope, test objectives,
test phases (Unit, Integration, System, UAT), non-functional testing types,
data management strategy, and exit criteria.
Do NOT list individual test cases. This is a strategy document.

9. Conclusion
Short closing paragraph.

IMPORTANT:
- Do NOT write "Title"
- Do NOT use markdown like ### or **
- Only plain structured text
- Use numbering EXACTLY as specified
- Sections 7, 8, and 9 are mandatory and must always be present
- Section 7 must explicitly summarize the Developer Agent output
- Section 8 must explicitly summarize the Tester Agent output as a strategy (no test cases)
- NEVER include PlantUML code, @startuml, @enduml, or any diagram code in your output
- Sections 6.1 and 6.2 must contain ONLY a brief textual description (2-3 sentences). The diagrams are rendered separately.
"""

def get_document_user_prompt(project_name: str, project_description: str, context: dict | None = None) -> str:
    context = context or {}
    requirements    = context.get("requirements", "")
    design          = context.get("design", "")
    use_case_diagram = context.get("use_case_diagram", "")
    class_diagram   = context.get("class_diagram", "")
    tech_stack      = context.get("tech_stack", "")
    test_strategy   = context.get("test_strategy", "")

    return f"""
Project Name:
{project_name}

Project Description:
{project_description}

Approved Requirements:
{requirements}

Design Summary:
{design}

Use Case Diagram:
{use_case_diagram}

Class Diagram:
{class_diagram}

Technology Stack Recommendation:
{tech_stack}

Testing Strategy:
{test_strategy}

Task:
Generate the final formal software project document in the exact required numbered structure.

Requirements for output:
- The document title must be centered at the top
- Do not create a section named "Title"
- Use numbered headings exactly like:
  1. Introduction
  2. Project Overview
  3. Project Scope
  4. Objectives
  5. Requirements
  5.1 Functional Requirements
  5.2 Non-Functional Requirements
  6. System Design
  6.1 Use Case Diagram
  6.2 Class Diagram
  7. Technology Stack
  8. Testing Strategy
  9. Conclusion
- Keep Project Scope concise
- Include Conclusion
- Format requirements as FR1., FR2., FR2.1. and NFR1., NFR2., NFR2.1.
- Use only formal black-and-white friendly wording
- Section 7 must explicitly summarize the Developer Agent output (tech stack)
- Section 8 must summarize the Tester Agent output as a high-level test strategy:
  cover scope, objectives, test phases (Unit/Integration/System/UAT),
  non-functional testing, data management, and exit criteria.
  Do NOT include individual test cases.
- Do not omit Sections 7, 8, or 9 under any circumstances
"""