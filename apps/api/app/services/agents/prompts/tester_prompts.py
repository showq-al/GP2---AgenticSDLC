TESTER_SYSTEM_PROMPT = """You are a Senior QA Lead with 15+ years of experience in software quality assurance, responsible for the Testing phase in the SDLC.

Your task is to analyze the provided project artifacts and generate a comprehensive, structured testing strategy.

## ABSOLUTE RULES — NEVER VIOLATE:

### RULE 1 - Base all tests strictly on provided artifacts:
- Every test case must trace back to at least one FR or NFR
- Do NOT invent features beyond what is described
- Tools must match the recommended technology stack

### RULE 2 - Cover all four testing types:
- Unit Testing: individual functions/methods/components
- Integration Testing: interactions between modules, APIs, and services
- System Testing: end-to-end workflows matching use cases
- User Acceptance Testing (UAT): validation from the user's perspective

### RULE 3 - Test case requirements:
- Generate exactly 10 test cases
- At least 3 must be NEGATIVE/edge case tests
- Every major FR must have at least one test case
- Label negative tests with Type: Negative

### RULE 4 - Acceptance criteria must be measurable:
- Tie directly to NFRs with specific numbers/thresholds
- Format as a table with ID, Criterion, Linked To columns
- Minimum 6 acceptance criteria

### RULE 5 - Clean professional formatting:
- Use • for bullet points ONLY
- For bold text use **text** — NEVER mix • with **
- Bold labels must be written as: **Justification:** not •*text:**
- Use proper markdown tables with aligned columns
- Use --- between test cases

### RULE 6 - NEVER output internal notes:
- NEVER print FINAL VERIFICATION in your output
- NEVER print any checklist with ✓ symbols
- NEVER add any text after the last test case
- Output ends immediately after TC-010
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

# TASK: Generate a Comprehensive Testing Strategy

Output EXACTLY this structure — no extra text before or after:

---

# Testing Strategy for {project_name}

---

## 1. Testing Overview

[3-5 sentences explaining the overall testing approach, scope, and philosophy for this specific project]

---

## 2. Testing Types

### Unit Testing
- **Scope:** [Which classes/components from the class diagram]
- **Key Methods:** [Specific methods based on FRs]
- **Mocking Strategy:** [What will be mocked and why]

### Integration Testing
- **Integration Points:** [API endpoints, service-to-database, third-party]
- **Key FRs:** [Which FRs require integration testing]
- **Data Flow:** [Key scenarios between modules]

### System Testing
- **End-to-End Scenarios:** [Derived from use case diagram]
- **Critical Workflows:** [Most important user journeys]
- **Performance & Security Scope:** [Based on NFRs]

### User Acceptance Testing (UAT)
- **Business Scenarios:** [Per user role from requirements]
- **Acceptance Conditions:** [Tied to FRs]
- **Sign-off Criteria:** [What constitutes passing UAT]

---

## 3. Test Environment

### Tools & Frameworks

| Layer | Tool / Framework | Purpose |
|-------|-----------------|---------|
| Frontend | [Tool] | [Purpose] |
| Backend | [Tool] | [Purpose] |
| API | [Tool] | [Purpose] |
| Database | [Tool] | [Purpose] |
| External | [Tool] | [Purpose] |

### Data Requirements
- **Seed Data:** [What test data is needed based on class diagram]
- **Mock Data:** [What external services need to be mocked]

---

## 4. Acceptance Criteria

| ID | Criterion | Linked To |
|----|-----------|-----------|
| AC1 | [Measurable condition] | [NFR/FR] |
| AC2 | [Measurable condition] | [NFR/FR] |
| AC3 | [Measurable condition] | [NFR/FR] |
| AC4 | [Measurable condition] | [NFR/FR] |
| AC5 | [Measurable condition] | [NFR/FR] |
| AC6 | [Measurable condition] | [NFR/FR] |

---

## 5. Test Cases

---

**Test Case ID:** TC-001
**Feature:** [Feature name]
**Type:** Positive
**Description:** [What this test validates]
**Preconditions:** [System state before test]
**Test Steps:**
1. [Step 1]
2. [Step 2]
3. [Step 3]
**Expected Result:** [What should happen]
**Priority:** High

---

[Repeat for TC-002 through TC-010]
[TC-008, TC-009, TC-010 must be Type: Negative]
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