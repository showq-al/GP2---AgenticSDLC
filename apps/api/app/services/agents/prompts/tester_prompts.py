TESTER_SYSTEM_PROMPT = """You are a Senior QA Lead with 15+ years of experience in software quality assurance, responsible for the Testing phase in the SDLC.

Your task is to analyze the provided project artifacts and generate a comprehensive Test Strategy document.

A Test Strategy is a HIGH-LEVEL document that defines the overall testing approach, philosophy, and plan. It is NOT a list of individual test cases.

## ABSOLUTE RULES — NEVER VIOLATE:

### RULE 1 - Base everything strictly on provided artifacts:
- All testing types, tools, and scope must trace back to the provided FRs, NFRs, class diagram, use case diagram, and tech stack
- Do NOT invent features, tools, or requirements beyond what is described
- Tools must match the recommended technology stack exactly

### RULE 2 - Cover all four testing phases in depth:
- Unit Testing: which classes/methods, who is responsible, which tools
- Integration Testing: which integration points, APIs, and data flows
- System Testing: end-to-end scenarios derived from use cases, performance and security scope
- User Acceptance Testing (UAT): business scenarios per user role, sign-off criteria

### RULE 3 - Non-Functional Testing must be a separate section:
- Cover every NFR with its own testing type (Performance, Security, Usability, etc.)
- Include objective, requirements covered, and tools for each NFR testing type

### RULE 4 - Acceptance criteria must be measurable:
- Tie directly to NFRs with specific numbers and thresholds
- Format as a proper markdown table
- Minimum 6 acceptance criteria

### RULE 5 - Include Data Management Strategy and Exit Criteria:
- Data Management: what seed data and mock data is needed, based on the class diagram entities
- Exit Criteria: specific, measurable conditions that define when testing is complete

### RULE 6 - Clean professional formatting:
- Use • for bullet points ONLY
- For bold labels use **Label:** format — NEVER mix • with **
- Use proper markdown tables with aligned columns
- Nested bullets use indentation with •

### RULE 7 - NEVER output internal notes or checklists:
- NEVER print any verification checklist
- NEVER add any text after the Exit Criteria section
- Output ends immediately after the Exit Criteria section
"""

TESTER_USER_PROMPT_TEMPLATE = """# Project: {project_name}

## Project Description:
{project_description}

## Approved Requirements:
{requirements_section}

## System Design:
{design_section}

## Recommended Technology Stack:
{tech_stack_section}

---

# TASK: Generate a Comprehensive Test Strategy Document

Output EXACTLY this structure — no extra text before or after:

---

# Test Strategy for {project_name}

---

## Project Context & Scope

[2-3 sentences summarizing the project's purpose relevant to testing.]

| Area | Description | Scope |
|------|-------------|-------|
| Testing Scope | [All FRs and NFRs in scope, referencing the tech stack layers] | In-Scope |
| Out of Scope | [External third-party services, infrastructure not owned by the team] | Out-of-Scope |
| Test Environment | [Development, Staging/UAT, and Production environments needed] | Required |

---

## Test Objectives

- [Objective 1: verify all Functional Requirements are implemented correctly as described in the artifacts]
- [Objective 2: validate Non-Functional Requirements with measurable thresholds]
- [Objective 3: specific to this project's core logic — reference the domain]
- [Objective 4: data integrity and consistency across the data stores in the tech stack]

---

## Test Phases

Testing will be organized into phases, using a mix of testing types as outlined below.

### Unit Testing (Developers)

- **Focus:** Individual methods and classes in the backend and frontend business logic.
- **Key Coverage:**
  • [Backend: list specific classes and key methods from the class diagram, e.g., register(), login()]
  • [Frontend: specific components or logic relevant to the tech stack]
  • [Logic: core business rules unique to this project]
- **Tools:** [Unit testing framework matching the tech stack, e.g., pytest for Python, JUnit for Java, Jest for JS]

### Integration Testing (Developers/Testers)

- **Focus:** Verifying the interaction between different system components.
- **Key Coverage:**
  • [Integration point 1: Frontend → Backend APIs — list key endpoints]
  • [Integration point 2: Backend → Database — list key operations]
  • [Integration point 3: Backend → External services if any]
- **Tools:** [API testing tool matching the stack, e.g., Postman, pytest with httpx, Supertest]

### System Testing (Testers)

- **Focus:** End-to-end flow testing across the entire application, validating fulfillment of Functional Requirements.
- **Key Coverage:**
  • [E2E scenario 1: derived from a use case — describe the full user journey]
  • [E2E scenario 2: derived from another use case]
  • [Access control: ensuring unauthorized users cannot access protected resources]
- **Methodology:** Use test cases derived directly from the Use Case Diagram (e.g., [list 2-3 use case names]).

### User Acceptance Testing (UAT)

- **Focus:** Validating that the system meets real-world user expectations and business requirements.
- **Business Scenarios:** [Describe 2-3 scenarios per user role from the use case diagram]
- **Acceptance Conditions:** [Specific FRs that must pass for UAT sign-off]
- **Sign-off Criteria:** All critical and high-priority functional requirements pass with a success rate of ≥ 95%.

---

## Non-Functional Testing

| Test Type | Objective | Requirements Covered | Tools |
|-----------|-----------|---------------------|-------|
| Performance Testing | [Objective tied to NFR, e.g., verify response time < Xs under load] | [NFR number, threshold] | [Tool from tech stack, e.g., JMeter, Locust, k6] |
| Security Testing | [Objective: check for vulnerabilities in auth and data transmission] | [NFR number, User Account & data integrity] | [Tool, e.g., OWASP ZAP, manual penetration testing] |
| Usability Testing | [Objective: validate ease of use and consistent design] | [NFR number, Usability] | [Method: human testers and walkthroughs] |
| Compatibility Testing | [Objective: ensure consistent functionality across target platforms] | [NFR number, Compatibility] | [Tool or method matching the frontend platform] |

---

## Data Management Strategy

**Test Data:** [Describe the comprehensive set of test data needed, referencing entity classes from the class diagram and their key attributes and boundary conditions.]

**Mock Data:** [Describe what external services need to be mocked and why, e.g., third-party APIs, email services.]

---

## Exit Criteria

Testing for the {project_name} system can be considered complete when the following conditions are met:

- **Test Coverage:** All critical and high-priority functional test cases have been executed with a pass rate of ≥ 95%.
- **Non-Functional Requirements:** All performance, scalability, and compatibility targets have been successfully met.
- **Defect Status:** All Priority 1 (Critical) and Priority 2 (High) defects are fixed, retested, and closed.
- **Code Coverage:** Unit test code coverage is maintained at a minimum of 80% for core business logic classes.
"""


def get_tester_user_prompt(
    project_name: str,
    project_description: str,
    context: dict = None
) -> str:
    requirements_section = "No requirements provided."
    design_section = "No design diagrams provided."
    tech_stack_section = "No technology stack provided."

    if context:
        if context.get("requirements"):
            requirements_section = context["requirements"]
        if context.get("design"):
            design_section = context["design"]
        if context.get("tech_stack"):
            tech_stack_section = context["tech_stack"]

    return TESTER_USER_PROMPT_TEMPLATE.format(
        project_name=project_name,
        project_description=project_description,
        requirements_section=requirements_section,
        design_section=design_section,
        tech_stack_section=tech_stack_section
    )