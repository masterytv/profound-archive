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

