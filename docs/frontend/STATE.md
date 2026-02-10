# State Management

## Overview
We favor **Server State** over Client State where possible.

## Mechanisms

### 1. URL State
For search filters, pagination, and sorting, we use URL Search Params.
- **Benefit:** Sharable links, SEO friendly.
- **Implementation:** `useSearchParams()` hook.

### 2. Server State (Supabase)
Data is fetched server-side in Page components and passed down as props.
- **Mutations:** Use Server Actions or API routes `/api/*` for writes.
- **Revalidation:** Use `revalidatePath()` after mutations to refresh server data.

### 3. Client State (React)
- `useState`: For local UI toggles (modals, optimistic updates).
- `Context`: Used by UI libraries (Shadcn Form, Toast, Tooltip providers).

### 4. Auth State
Managed by Supabase Auth Helpers.
- Service: `SupabaseAuthContext` (or similar internal wrapper if exists, otherwise direct `supabase.auth.onAuthStateChange` usage in `SiteHeader`).
