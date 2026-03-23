# 🧠 Active Project Rules & Constraints

> **CRITICAL:** These are the immutable architectural rules for Project Profound. Violating these will break production.

## 1. Component & Data Architecture
- **Server-First Fetching:** Fetch Supabase data in Server Components and pass as props. NEVER use `useEffect` for Supabase data fetching in Client Components (causes React Strict Mode `AbortError` loops).
- **RSC Boundaries:** When passing icons from Server to Client components, pass the string name (`iconName="Heart"`) and map it client-side. Never pass Lucide component objects across the boundary.
- **Client Singleton:** Supabase browser client uses a `globalThis` singleton to survive Turbopack HMR.

## 2. Server & API Rules
- **Admin Security:** ALL `/api/admin/*` routes MUST import and use `isAdminUser()` from `src/lib/auth/admin-guard.ts`.
- **Auth Tokens:** Always use `getUser()` on the server, NEVER `getSession()`. Use `getAll`/`setAll` for cookie management, never individual get/set methods.
- **Static Page Build:** `generateStaticParams` and `generateMetadata` MUST use the anon/service client. Never use `createClient()` from `@/lib/supabase/server` as `cookies()` throws outside request scopes.
- **Cloudflare Timeouts:** Any API route taking >30s (like AI pipelines) MUST use Next.js `after()` to process work in the background. Cloudflare drops connections at 100s.

## 3. Styling & Theming (CRITICAL)
- **Token System:** Use `globals.css` semantic tokens (`bg-background`, `bg-card`, `text-foreground`). 
- **No Hardcoded Colors:** NEVER use `bg-white`, `bg-slate-50`, or `text-slate-900` without a matching `dark:` alpha variant (e.g., `dark:bg-white/5`).
- **Native Inputs:** Native `<select>` and `<input>` must include `dark:[color-scheme:dark]` to fix OS-level dropdown blinding.

## 4. Media & Memory Constraints
- **Images:** Every thumbnail MUST use Next.js `<Image>` (never `<img>`), request `hqdefault` (not `maxresdefault`), and include accurate `sizes`. Limit grid pages to ≤12 items.
- **Video:** YouTube videos MUST use the click-to-play `<YouTubePlayer>`. Never use raw `<iframe>` with `autoplay=1` (causes massive GPU leaks).
- **Routing:** Internal video links to specific times must use `<TimestampLink>` to trigger `seekYouTubePlayer()` custom events. Do not use `<Link href="?t=45">`.

## 5. AI & Infrastructure
- **Claude JSON Forcing:** To get reliable JSON from Claude, you MUST use Assistant Prefill: `{ role: 'assistant', content: '{' }`. System prompts are not enough.
- **Secrets:** `apphosting.yaml` secrets MUST be pinned to a specific version (e.g., `/versions/1`). Firebase App Hosting will fail builds if set to `/versions/latest`.
- **Formatting:** No Em Dashes (—) in AI outputs. Use parentheses or commas.