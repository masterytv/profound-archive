# Workflow Overview

> All workflow automation now runs as native code in this repo. The external
> automation platform that previously hosted these workflows was retired, along
> with its webhook environment variables and the `/api/search` proxy.

## Where the logic lives now

| Capability | Code Location |
|---|---|
| Compassionate chat | `src/app/api/chat-compassionate/route.ts` |
| Search (keyword + semantic) | `src/app/api/search3/route.ts` |
| Video intake | `src/lib/pipeline/intake.ts`, `intake-uap.ts` |
| NDE summary generation | `src/lib/ai/nde-summary.ts` |
| Transcript punctuation | `src/lib/pipeline/punctuate-uap.ts`, `scripts/uap-batch-punctuate.ts` |
| Embedding generation | `src/lib/pipeline/embed-uap.ts`, `insert-embedding-rows.ts`, `scripts/uap-batch-embed.ts` |

Batch analysis passes live in `src/lib/ai/` (greyson, cvnde, core-elements,
journey-flow, phenomenology-entities, transformation) and are driven by
`scripts/nde-batch-analysis.ts`.

## Scheduling

Scheduling is owned by the Oracle VM crontab, not by any hosted automation
platform. See `docs/ARCHITECTURE.md` for the scheduling model and
`docs/DEPLOYMENT.md` for how the worker is deployed.

## Not carried over

Two workflows were never rebuilt natively and have no current equivalent:

- **NDE Research Chatbot** — never implemented. The compassionate chatbot is the
  only chat surface in production.
- **NDE Video Verification** — no native replacement was identified when the
  platform was retired. Confirm before assuming verification runs anywhere.
