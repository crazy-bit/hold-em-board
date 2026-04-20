# Skill Quality Checklist

Copy this checklist when reviewing a skill (new or existing) and mark items as completed.

```
## Core Quality
- [ ] Description is specific and includes key trigger terms
- [ ] Description states what the skill does AND when to use it
- [ ] Description uses third-person language
- [ ] SKILL.md body is under 500 lines
- [ ] Extra detail lives in separate reference files (if needed)
- [ ] No time-sensitive information (or isolated in "Legacy Notes" section)
- [ ] Consistent terminology throughout
- [ ] Examples are concrete, not abstract
- [ ] File references are one level deep only
- [ ] Progressive disclosure is used appropriately
- [ ] Workflows have clear sequential steps

## Writing Style
- [ ] Imperative/infinitive form (verb-first instructions)
- [ ] No second-person language ("you should", "you can")
- [ ] No unnecessary explanations of things Claude already knows
- [ ] Content justifies its token cost

## Metadata
- [ ] Name: lowercase, digits, hyphens only
- [ ] Name: max 64 characters
- [ ] Name: no reserved words ("anthropic", "claude")
- [ ] Description: non-empty
- [ ] Description: max 1024 characters
- [ ] Description: no XML tags

## Scripts and Code
- [ ] Scripts solve problems instead of punting to Claude
- [ ] Error handling is explicit and helpful
- [ ] No "voodoo constants" (all values have documented reasoning)
- [ ] Required packages listed and verified as available
- [ ] Scripts have clear documentation
- [ ] No Windows-style backslash paths
- [ ] Validation/verification steps for critical operations
- [ ] Feedback loops for quality-critical tasks

## Structure
- [ ] Only needed resource directories exist (unused ones removed)
- [ ] Reference files >100 lines have a table of contents
- [ ] No deep reference nesting (max one level from SKILL.md)
- [ ] Freedom level matches task fragility

## Testing
- [ ] Tested with representative real-world usage scenarios
- [ ] Skill triggers correctly based on description keywords
- [ ] Resources load and are referenced properly
```
