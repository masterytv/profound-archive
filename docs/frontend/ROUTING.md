# Frontend Routing

## Overview
The application uses the **Next.js 14+ App Router**. Routes are defined by the file system structure in `src/app`.

## Route Map

| Path | File | Purpose | Auth Required? |
|---|---|---|---|
| `/` | `src/app/page.tsx` | Home Page — curated video grid (ISR 6h) | No |
| `/login` | `src/app/login/page.tsx` | User Login/Signup | No |
| `/search` | `src/app/search/page.tsx` | Main Search Interface | No |
| `/chat-compassionate` | `src/app/chat-compassionate/page.tsx` | AI Chat | No (but sessions logged) |
| `/video/[id]` | `src/app/video/[id]/page.tsx` | Video Details Page | No |
| `/explore/transformation` | `src/app/explore/transformation/page.tsx` | NDE-TI Explorer (sort/filter/paginate) | No |
| `/explore/veridical` | `src/app/explore/veridical/page.tsx` | cvNDE Explorer (sort/filter/paginate) | No |
| `/explore/greyson` | `src/app/explore/greyson/page.tsx` | Greyson Scale Explorer (sort/filter/paginate) | No |
| `/scale/greyson` | `src/app/scale/greyson/page.tsx` | Greyson NDE Scale Info | No |
| `/scale/cvnde` | `src/app/scale/cvnde/page.tsx` | cvNDE Perception Scale Info | No |
| `/scale/transformation` | `src/app/scale/transformation/page.tsx` | NDE-TI Scale Info | No |
| `/profile` | `src/app/profile/page.tsx` | User Profile | **Yes** |
| `/dashboard` | `src/app/dashboard/page.tsx` | User Dashboard | **Yes** |
| `/channels` | `src/app/channels/page.tsx` | Channel Directory (sort/filter/paginate) | No |
| `/channel/[channelId]` | `src/app/channel/[channelId]/page.tsx` | Channel Detail — videos, stats, description | No |
| `/resources` | `src/app/resources/page.tsx` | NDE Research Ecosystem Directory — organizations, academic, books, support | No |
| `/about` | `src/app/about/page.tsx` | About Project Profound — mission, what we do, contact form | No |
| `/about/founder` | `src/app/about/founder/page.tsx` | Founder story + media/researcher intro with live archive stats (ISR 1h) | No |
| `/about/[slug]` | `src/app/about/[slug]/page.tsx` | Author bio pages (tom-wood, micul-love, pamela-harris), force-static | No |
| `/admin` | `src/app/admin/page.tsx` | Admin Dashboard | **Yes (Admin Role)** |

## Data Fetching
- **Server Components:** Prefer fetching data directly in `page.tsx` or `layout.tsx` using Supabase Server Client.
- **Client Components:** Use `useEffect` or React Query (if installed) for dynamic data needs, or invoke Server Actions.

## Middleware
Middleware at `src/middleware.ts` handles route protection for `/admin` and ensures session cookies are refreshed.
