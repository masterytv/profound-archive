# Frontend Routing

## Overview
The application uses the **Next.js 14+ App Router**. Routes are defined by the file system structure in `src/app`.

## Route Map

| Path | File | Purpose | Auth Required? |
|---|---|---|---|
| `/` | `src/app/page.tsx` | Home Page / Landing | No |
| `/login` | `src/app/login/page.tsx` | User Login/Signup | No |
| `/search` | `src/app/search/page.tsx` | Main Search Interface | No |
| `/chat-compassionate` | `src/app/chat-compassionate/page.tsx` | AI Chat | No (but sessions logged) |
| `/video/[id]` | `src/app/video/[id]/page.tsx` | Video Details Page | No |
| `/profile` | `src/app/profile/page.tsx` | User Profile | **Yes** |
| `/dashboard` | `src/app/dashboard/page.tsx` | User Dashboard | **Yes** |
| `/admin` | `src/app/admin/page.tsx` | Admin Dashboard | **Yes (Admin Role)** |

## Data Fetching
- **Server Components:** Prefer fetching data directly in `page.tsx` or `layout.tsx` using Supabase Server Client.
- **Client Components:** Use `useEffect` or React Query (if installed) for dynamic data needs, or invoke Server Actions.

## Middleware
Middleware at `src/middleware.ts` handles route protection for `/admin` and ensures session cookies are refreshed.
