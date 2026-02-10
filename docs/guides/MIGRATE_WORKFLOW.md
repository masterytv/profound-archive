# Migrating n8n Workflows to Code

> Strategy for converting low-code workflows to maintainable TypeScript.

## The Process

### 1. Analyze the Node Graph
Open the JSON or n8n UI. Identify:
- **Trigger:** Webhook? Schedule?
- **Inputs:** What data starts the flow?
- **Steps:** HTTP Requests, Transformations, AI calls.
- **Outputs:** What is returned or stored?

### 2. Choose the Host
- **Short/Interactive:** Next.js API Route (`src/app/api/...`).
- **Long/Background:** Supabase Edge Function or background job.

### 3. Replicate Logic
- **HTTP Requests:** Use `fetch` or SDKs.
- **Data Munging:** Use standard TS array/object manipulation.
- **AI:** Use OpenAI SDK.

### 4. Verify & Cutover
1. Test the new endpoint with Postman/Curl.
2. Update the frontend to point to the new route.
3. Disable the n8n workflow.
4. Update `docs/workflows/OVERVIEW.md`.
