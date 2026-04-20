# Quality Principles & Fix Priority

## Core Quality Principles

**Conciseness** — Only add context not already known. Question every sentence:
- "Does this explanation justify its token cost?"
- "Can this be assumed as common knowledge?"

**Appropriate freedom** — Match specificity to task fragility:
- Brittle operations (DB migrations) → precise guardrails, specific scripts
- Flexible tasks (code review) → general direction, heuristic guidance

**Progressive disclosure** — Keep SKILL.md under 500 lines. Move detailed content to `references/`. Reference files over 100 lines need a table of contents.

**Writing style:**
- Imperative/infinitive form: "Extract text from..." not "Should extract..."
- Third-person descriptions: "Processes PDFs..." not "I help process PDFs"
- No second person: avoid phrases directed at the reader

**Description field:**
- Include trigger keywords users would say
- State what it does AND when to use it
- Third person only
- Max 1024 characters, no XML tags

**Flat references** — One level deep from SKILL.md only. No chains of references pointing to other references.

**Consistent terminology** — Pick one term, use it everywhere. Do not alternate synonyms.

---

## Fix Priority

### Critical (likely to cause malfunction)
- Missing or empty description
- Description exceeds 1024 characters or contains XML tags
- Name contains invalid characters or reserved words ("anthropic", "claude")
- SKILL.md exceeds 500 lines without progressive disclosure
- Directory name does not match metadata name
- Scripts with unhandled errors that punt to Claude

### Recommended (significantly improves quality)
- Verbose content wasting tokens — trim what Claude already knows
- Missing trigger keywords in description
- Second-person language in instructions or description
- Inconsistent terminology
- Missing feedback loops for quality-critical workflows
- Deeply nested reference chains (more than 1 level)

### Optional (polish)
- Naming convention alignment (prefer gerund form: `processing-pdfs`)
- Table of contents for long reference files (over 100 lines)
- Concrete input/output examples for ambiguous tasks
- Windows-style backslash paths
