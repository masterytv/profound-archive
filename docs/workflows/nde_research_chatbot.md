# NDE Research Chatbot

**Status:** ⬜ Not Started
**File:** `docs/n8n/nde_research_chatbot.json`

## Description
A more analytical chatbot designed for researching NDEs, likely with different prompting and retrieval parameters than the Compassionate Chatbot.

## Logic (n8n)
1. **Trigger:** Webhook/Chat Interface.
2. **Retrieval:** Fetches data from `nde_vids` or `nde_analysis`.
3. **Processing:** LLM analysis of the retrieved data.
4. **Response:** Data-heavy or citation-heavy response.

## Migration Plan
1. Create `src/app/api/chat-research/route.ts`.
2. Replicate the specific system prompt and retrieval filters from the JSON.
