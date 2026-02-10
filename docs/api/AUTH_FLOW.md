# Authentication Flow

## Overview
Authentication is handled by Supabase Auth (GoTrue). We use the `@supabase/ssr` package for Next.js integration.

## Mechanisms
- **Client-Side:** `createBrowserClient` in `src/lib/supabase/client.ts`. Used for components that need to check login status or sign in/out.
- **Server-Side:** `createServerClient` in `src/lib/supabase/server.ts`. Used in Server Components, API routes, and Middleware to validate sessions.
- **Middleware:** `src/middleware.ts` runs on every request (except statics) to refresh credentials and protect routes.

## Protected Routes
The Middleware explicitly protects:
- `/admin/*` - Requires the user to be logged in AND have a profile role of `admin` or `super_admin`.

## User Roles
Roles are stored in the `profiles` table, which is linked to `auth.users` by ID.
- `user`: Standard access.
- `admin`: Access to `/admin`.
- `super_admin`: Full access (including staging prompts).

## Auth Providers
- **Email/Password:** Standard login.
- **Social Providers:** (Check Supabase Dashboard for active providers like Google/GitHub).
