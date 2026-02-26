# Frontend Components

## Overview
The project uses a component-based architecture built with React and Shadcn UI.

## Directory Structure
- `src/components/ui/`: Generic, reusable UI primitives (Buttons, Inputs, Dialogs). **Do not modify these logic-wise**; they are copied from Shadcn.
- `src/components/`: Feature-specific components.

## Key Components

### `SiteHeader.tsx`
- **Path:** `src/components/site-header.tsx`
- **Purpose:** Global navigation bar. Includes logo, auth buttons (Login/Logout), and mobile menu.
- **Dependencies:** `SupabaseClient` (for auth state).

### `SearchResultCard.tsx`
- **Path:** `src/components/search-result-card.tsx`
- **Purpose:** Displays a single video or NDE account in the search results.
- **Props:** Accepts a video object.
- **Features:** "Add to Collection" and "Favorite" buttons.

### `FavoriteButton.tsx`
- **Path:** `src/components/favorite-button.tsx`
- **Purpose:** Toggles favorite status for a video. Handles optimistic UI updates.

### `AddToCollectionButton.tsx`
- **Path:** `src/components/add-to-collection-button.tsx`
- **Purpose:** Opens a dialog to add a video to a specific user collection.

### Homepage Components (`src/components/home/`)
- **`HeroSearchBar.tsx`**: Client island for the homepage hero. Renders a search bar with keyword/semantic toggle (using `BrainCircuit` icon). On submit, navigates to `/search3?q=...` with query params.
- **`VideoThumbnailCard.tsx`**: Compact video card with thumbnail, score badge, title, channel. Used in homepage curated grid.
- **`CuratedVideoColumn.tsx`**: Column wrapper with themed header (clickable, links to `/explore/` page), card list, and "Explore All →" link. Color-coded: Veridical = emerald, Transformation = red, Greyson = blue.

### Explorer Components (`src/components/explore/`)
- **`ExplorerVideoCard.tsx`**: Rich video card with optional sub-score badges (breadth/depth, category totals).
- **`ExplorerControls.tsx`**: URL-param-driven sort/filter/pagination controls. Shared across all `/explore/*` pages.

### Channel Components (`src/components/channels/`)
- **`ChannelCard.tsx`**: Logo-centric card with large circular YouTube avatar, channel name, country badge, and 3-column stats grid (Videos/Views/Subs). Used on both homepage and `/channels` directory.
- **`ChannelSearch.tsx`**: Client search input for filtering channels by name. Drives URL `q` param.
- **`ExpandableDescription.tsx`**: Client component for expandable text with "Show more/less" toggle and auto-linkified URLs. Used on channel detail pages.

### Analysis Components (`src/components/analysis/`)
> **Pattern:** All data is fetched **server-side** and passed as props to these client components. Never use client-side `useEffect`/`createClient` to fetch analysis data — see LEARNINGS.md §8 for the full explanation.

- **`NderfAnalysisSection.tsx`**: Top-level container for NDERF analysis data on video pages. Renders collapsible sections for badges, journey flow, core elements, phenomenology, and entity encounters. Accepts `NderfAnalysisData` prop from the server component.
- **`ExperienceBadges.tsx`**: Displays classification badges (NDE type, trigger, tone, intensity) in a responsive grid.
- **`JourneyFlowTimeline.tsx`**: Horizontal scrollable timeline of bold, numbered pill badges showing the NDE journey sequence (e.g., ①Observing Body → ②Peace & Calm → ③Being of Light). Uses a warm-to-cool rainbow gradient (amber → rose → violet → indigo → teal) with chevron arrows between steps. Expandable with collapse toggle.
- **`CoreElementsGrid.tsx`**: Grid of detected NDE elements with confidence indicators. Shows which classic NDE elements were found in the account.
- **`PhenomenologyCard.tsx`**: Detailed phenomenological analysis card with expandable sub-sections for sensory, cognitive, emotional, and temporal categories.
- **`EntityEncounters.tsx`**: Displays entity encounter data (deceased relatives, beings of light, religious figures) with relationship types and interaction details.
- **`ChannelAnalysisSummary.tsx`**: Aggregate analysis overview for channel pages. Shows stacked bar charts for experience types, emotional tone, and trigger categories + average intensity. Accepts pre-fetched `stats` prop from channel `page.tsx`.
- **`SimilarExperiences.tsx`**: Displays pgvector-based similar NDE cards with thumbnails, similarity percentages, and type/tone badges. Accepts pre-fetched `results` prop from video `page.tsx`.

### `ChatPopup.tsx`
- **Path:** `src/components/chat-popup.tsx`
- **Purpose:** Site-wide floating chat widget rendered in root `layout.tsx`. Provides quick access to the Compassionate Chat AI from any page.
- **Behavior:**
  - Fixed "Chat with NDEs" pill button (`#2563EB`) in the bottom-right corner.
  - Opens a light-themed panel (white bg, 380×550px) with blue header, welcome message, 3 randomized NDE questions (from a pool of 50), and an input bar.
  - Auto-hides on `/chat-compassionate` to avoid duplicating the full-page experience.
  - Chat history persists across page navigations within the same session.
- **Dependencies:** `/api/chat-compassionate` endpoint, `lucide-react` icons.
- **Animations:** Custom Tailwind keyframes (`chat-slide-up`, `chat-slide-down`, `subtle-pulse`) defined in `tailwind.config.ts`.

## Resources Page (`src/app/resources/page.tsx`)

A comprehensive NDE research ecosystem directory with 8 sections and 3 reusable sub-components.

### Sub-Components (defined inline)
- **`ResourceCard`**: Linked card with icon badge, title, org, description, optional stat. Opens external links in new tab.
- **`BookCard`**: Non-linked card for books with Crimson Pro italic title, author, year, and description.
- **`SectionHeader`**: Icon badge + Crimson Pro title + subtitle. Used to introduce each section.

### Sections
1. **Organizations & Nonprofits** — IANDS, NDERF, NoeticMap, Shared Crossing, ADCRF, Eternea
2. **Academic Institutions** — UVA DOPS, NYU AWARE Study, Journal of Near-Death Studies
3. **Research & Academic Literature** — NoeticMap literature search, findings, paper browser, cases, NDERF research
4. **First-Hand Account Databases** — NDERF archive, NoeticMap community
5. **New to NDEs? Start Here** — Educational resources from IANDS, NDERF, NoeticMap
6. **Essential Books** — 6 foundational NDE books (Moody, Long, Greyson, Alexander, van Lommel, Moorjani)
7. **Support & Community** — IANDS support groups, conference, NDERF submission
8. **About These Organizations** — Detailed bios for IANDS, NDERF, NoeticMap, Shared Crossing Project

### Design
- Hero with gradient background and dot pattern overlay
- Alt1 design system: rounded-2xl cards, icon badges, Crimson Pro headings
- Fully responsive 1/2/3 column grid
- Closing "About These Organizations" section with detailed org descriptions

## Design System (Shadcn UI)
We use [Shadcn UI](https://ui.shadcn.com/) components.
- **Styling:** Tailwind CSS classes.
- **Icons:** Lucide React.
- **Animation:** `tailwindcss-animate`.

To add a new component:
```bash
npx shadcn-ui@latest add [component-name]
```

## Auth & Admin Pages

### Profile Page (`src/app/profile/page.tsx`)
- Client component with gradient header, breadcrumb, Crimson Pro title.
- Two card sections: "Edit Profile" (email, name) and "Account Management" (password change).
- Uses Supabase client for auth operations.

### Dashboard Page (`src/app/dashboard/page.tsx`)
- Client component with gradient header and icon badge.
- "My Collections" accordion with thumbnail grids and delete dialogs.
- "Saved Searches" section with interactive parameter pills.

### Admin Layout (`src/app/admin/layout.tsx`)
- Server component with sidebar navigation (Overview, Users, Chatbot Editor).
- Role-based access: redirects non-admin users.
- Sidebar: slate-50 background, rounded-xl nav items with icon badges.

### Admin Overview (`src/app/admin/page.tsx`)
- Server component fetching user stats from Supabase.
- Three stats cards (Total Users, Banned, Admins) with icon badges.

### Admin Users (`src/app/admin/users/page.tsx`, `user-row.tsx`)
- Server component fetching profiles + auth emails.
- User table with rounded-2xl container, role/status badge pills.
- Client `UserRow` component with ban/unban toggle, role selector, delete.

## Video Page (`src/app/video/[id]/page.tsx`)

A server component displaying the full detail view for a single NDE video.

### Layout (Desktop — `lg`)
Two-column grid: `grid-cols-[1fr_340px]`

| Left Column | Right Sidebar (`hidden lg:block`) |
|---|---|
| YouTube player | Research Scores summary (mini-cards) |
| Title & metadata | **Veridical Perception** (full card) |
| AI Summary | Greyson Scale (full card) |
| Experience Analysis (NDERF) | Transformation Analysis (full card) |
| Similar Experiences | |
| Transcript (collapsible) | |

### Layout (Mobile — single column)
The right sidebar is hidden. Analysis cards are rendered inline in the left column using `lg:hidden`:
1. Research Scores mini-cards (3-up grid)
2. Veridical Perception full card (`id="section-veridical-mobile"`)
3. Greyson Scale full card (`id="section-greyson"`)
4. Transformation Analysis full card (`id="section-transformation"`)

### Analysis Score Cards
- **Veridical Perception (cvNDE):** Score `/28`, level badge, summary reason, collapsible criteria breakdown. Color-coded from `getLevelColor()` (emerald/amber/blue).
- **Greyson Scale:** `<GreysonScoreCard>` component (score `/32`, classification, breakdown).
- **Transformation Analysis:** `<TransformationScoreCard>` component (score `/50`, classification, breakdown).

> **Rule:** Always add new analysis cards to both the right sidebar (desktop) AND as an `lg:hidden` block in the left column (mobile). Use distinct `id` attributes for mobile vs desktop anchors to avoid scroll conflicts.


