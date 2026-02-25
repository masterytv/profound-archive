# Adding a New API Integration

> How to integrate a 3rd party service.

## Verification
1. Is there an existing SDK? (e.g. `openai`, `stripe`). Use it.
2. Does it require a Secret Key?
   - Add to `.env.local` for local development.
   - Add to `docs/ENVIRONMENT.md` and `.env.example`.
   - Add to `apphosting.yaml` as a `secret:` reference (never a `value:`).
   - **CRITICAL - DO NOT USE `versions/latest`**: You MUST pin the secret version (e.g., `versions/1`). The `Secret Manager Secret Accessor` role we use **does not** have permission to resolve `latest`. Using `latest` will cause the build to fail with `PermissionDenied`. This is a hard rule.
   - **Google Cloud Secret Manager (Firebase):** You MUST create the secret in Google Cloud and explicitly grant the `Secret Manager Secret Accessor` role to **BOTH** the `firebase-app-hosting-compute@...` (runtime) and `<project-number>-compute@developer...` (build) service accounts. See `docs/LEARNINGS.md` Section 4B.
   - **Never** expose it to the client (use separate `NEXT_PUBLIC_` var only if safe).

## implementation Pattern

### 1. Create a Typed Wrapper
Create `src/lib/api/serviceName.ts`.
```typescript
export async function fetchFromService(data: InputType): Promise<OutputType> {
  // Implementation
}
```

### 2. Error Handling
Always wrap external calls in `try/catch` and return typed error responses to your frontend.

### 3. Rate Limiting
If the API has limits, implement caching (e.g. Supabase DB cache or Next.js `unstable_cache`).
