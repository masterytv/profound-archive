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
- **`VideoThumbnailCard.tsx`**: Compact video card with thumbnail, score badge, title, channel. Used in homepage curated grid.
- **`CuratedVideoColumn.tsx`**: Column wrapper with themed header, card list, and "Explore All →" link.

### Explorer Components (`src/components/explore/`)
- **`ExplorerVideoCard.tsx`**: Rich video card with optional sub-score badges (breadth/depth, category totals).
- **`ExplorerControls.tsx`**: URL-param-driven sort/filter/pagination controls. Shared across all `/explore/*` pages.

## Design System (Shadcn UI)
We use [Shadcn UI](https://ui.shadcn.com/) components.
- **Styling:** Tailwind CSS classes.
- **Icons:** Lucide React.
- **Animation:** `tailwindcss-animate`.

To add a new component:
```bash
npx shadcn-ui@latest add [component-name]
```
