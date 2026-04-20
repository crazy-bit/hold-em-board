# Skill Anatomy Reference

## Directory Structure

Every skill consists of a required `SKILL.md` and optional bundled resources:

```
skill-name/
├── SKILL.md              # Required — metadata + instructions
├── scripts/              # Optional — executable code (Python/Bash)
├── references/           # Optional — docs loaded into context as needed
└── assets/               # Optional — files used in output (templates, images, fonts)
```

## SKILL.md Format

```yaml
---
name: hyphen-case-name          # Required. Lowercase, digits, hyphens. Max 64 chars.
description: "What it does..."  # Required. Max 1024 chars. No XML tags.
---

# Skill Title

## Overview
[1-2 sentences]

## [Main sections...]
```

## Resource Types

| Directory | Purpose | Loaded into context? |
|---|---|---|
| `scripts/` | Deterministic, reusable code | Executed directly; read only when patching needed |
| `references/` | Detailed docs, schemas, guides | Read on demand |
| `assets/` | Templates, images, fonts, boilerplate | Used in output, never read into context |

## Resource Planning

When designing a skill, map concrete usage examples to resource types:
- Code that gets rewritten repeatedly → `scripts/`
- Documentation needed while working → `references/`
- Files that appear in output → `assets/`

## Progressive Disclosure (3-level loading)

1. **Metadata** (name + description) — always in context (~100 words)
2. **SKILL.md body** — loaded when skill triggers (keep under 500 lines)
3. **Bundled resources** — loaded as needed (unlimited)

Keep SKILL.md under 500 lines. Move detailed content to `references/`. Reference files over 100 lines need a table of contents.

## Structure Patterns

Choose one (or mix) for organizing SKILL.md:

| Pattern | When to Use | Example Layout |
|---|---|---|
| **Workflow-Based** | Sequential processes | Step 1 → Step 2 → Step 3 |
| **Task-Based** | Multiple independent operations | Quick Start → Task A → Task B |
| **Reference/Guidelines** | Standards or specs | Guidelines → Specifications → Usage |
| **Capabilities-Based** | Interrelated features | Core Capabilities → Feature 1 → Feature 2 |

## Storage Locations

- **User skills**: `~/.codebuddy/skills/<skill-name>/`
- **Project skills**: `<project-root>/.codebuddy/skills/<skill-name>/`
