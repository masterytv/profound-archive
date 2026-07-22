# 🎯 AI Vibecoding Guide

> **How to prompt Gemini (or any AI) to code effectively in this project.**

## The Golden Rule & Context
**Gemini reads `GEMINI.md` automatically.** Use this to your advantage. You don't need to paste files constantly.

## Prompting Strategy

### 1. Feature Requests
**Pattern:**
> "I want to add [Feature X]. Refer to `docs/guides/NEW_FEATURE.md`. Start by creating the migration."

**Example:**
> "I want to add a 'Journal' feature where users can write private notes.
> 1. Create a `journals` table linked to `profiles`.
> 2. Enable RLS (User can only read/write their own).
> 3. Create the Typescript interfaces."

### 2. Bug Fixes
**Pattern:**
> "Fix the bug in [File]. It fails when [Condition]. Refer to `docs/database/SCHEMA.md` to check relations."

### 3. New Pipeline Stage
**Pattern:**
> "Add a summarisation stage to the intake pipeline. Follow the shape of
> `src/lib/ai/nde-summary.ts` and wire it into `src/lib/pipeline/intake.ts`."

## Dos and Don'ts

| Do ✅ | Don't ❌ |
|---|---|
| Ask for modest, incremental changes. | Ask "Build the whole app". |
| reference docs by path (`docs/api/...`). | Assume the AI knows the schema. |
| Ask the AI to update docs after changes. | Let docs rot. |

## Magic Phrases
- **"Follow the existing service pattern"**: Ensures code looks like `src/lib/services`.
- **"Use Shadcn components"**: Ensures UI consistency.
- **"Respect RLS"**: Reminds AI not to bypass security with `service_role` unless necessary.
- **"Update Docs"**: If you feel the AI is forgetting, just say "Update Docs" and it will scan for discrepancies.
