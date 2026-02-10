# Adding a New API Integration

> How to integrate a 3rd party service.

## Verification
1. Is there an existing SDK? (e.g. `openai`, `stripe`). Use it.
2. Does it require a Secret Key?
   - Add to `.env.local`.
   - Add to `docs/ENVIRONMENT.md` and `.env.example`.
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
