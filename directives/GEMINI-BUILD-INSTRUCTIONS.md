# Guidelines for the Builder Agent: Copy-Modify Protocol

> **Prefix: GEMINI-**
> This document contains strategic advice and the exact prompt you should use to instruct the builder LLM during Sprint 1-5.

## Your Questions Answered

**Should I be instructing the LLM to copy and modify?**
Yes, absolutely. Project Profound has highly customized logic (like the pipeline intake, Triad Analysis, and specific UI interactions). Letting an LLM build from scratch will result in generic code that ignores your existing auth patterns, CSS variables, and database clients. 

**Will it be harder for the LLM to copy and modify versus build from scratch?**
It is slightly more "taxing" on the LLM's context window because it has to read the existing file first, hold it in memory, and then output the modified version. LLMs *prefer* to build from scratch because it's computationally lazier. However, with the right prompting, they are exceptional at pattern-matching and translating a file from "Domain A" to "Domain B".

**Is there a way to do this without causing problems during the sprint?**
Yes. The biggest risk when asking an LLM to "copy and modify" is that it might accidentally overwrite the original file instead of creating the new one, or it might miss a crucial database table name (e.g., accidentally leaving `nde_vids` inside a UAP script). 

To prevent this, you must enforce a **"Read → Map → Write"** protocol, and you must remind the LLM of the **Component Polymorphism** rule from your Architecture (we duplicate *routes and pipelines*, but we *reuse and modify* shared UI components).

---

## The Instruction Prompt to Give the Builder LLM

*Copy and paste the block below to the builder LLM whenever you assign it a new task in the sprint.*

***

**System Prompt / Task Instructions for Builder:**

"For this task, you will be copying and modifying existing NDE patterns to build the UAP vertical. Do NOT build from scratch. Follow this strict protocol:

**1. The 'Read → Map → Write' Protocol:**
*   **READ:** Before writing any code, use your `view_file` tool to read the existing NDE equivalent (e.g., if building `/uap/search/page.tsx`, read `/search3/page.tsx` first).
*   **MAP:** Mentally map the NDE terms to UAP terms. 
    *   `nde_vids` → `uap_vids`
    *   `nde_analysis` → `uap_analysis`
    *   `nde_punctuated_embeddings` → `uap_punctuated_embeddings`
    *   `intake.ts` → `uap-intake.ts`
*   **WRITE:** Create the NEW file in the `/uap/` directory using the `write_to_file` tool. **CRITICAL:** Do NOT overwrite the original NDE file. 

**2. Duplication vs. Polymorphism Rule:**
*   **Pipelines, API Routes, and Page Routes:** Duplicate the NDE version and modify it for UAP. (e.g., Copy the NDE video detail page to create the UAP video detail page).
*   **UI Components (Buttons, Cards, Players):** Do NOT duplicate these. Instead, modify the *existing* shared component to accept an optional `domain?: 'nde' | 'uap'` prop. Use the `DomainConfig` to dynamically swap out accent colors, labels, and icons.

**3. Safety Checks:**
*   Always preserve existing imports, specifically custom hooks, `cn()` utilities, and Supabase client initializers.
*   Double-check your SQL/RPC calls in the modified file. Ensure absolutely no `nde_` tables or functions are accidentally left in the UAP files."
