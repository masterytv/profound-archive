# Project Profound — Brand Guidelines

> Single source of truth for logo, typography, color, component patterns, and spacing. Reference this document when building or modifying any page.

---

## 0. Logo

| Variant | File | Usage |
|---------|------|-------|
| **Solid** (blue bg) | `public/logo-solid.png` | Favicon (`src/app/icon.png`), social sharing |
| **Transparent** | `public/logo-transparent.png` | Site header, light backgrounds |
| **White** | `public/logo-white.png` | Dark backgrounds, overlays |

The header uses the transparent variant at 36×36 via Next.js `Image`:

```tsx
<Image src="/logo-transparent.png" alt="Project Profound logo" width={36} height={36} priority />
```

---

## 1. Typography

| Role | Font | Weights | Usage |
|------|------|---------|-------|
| **Headings** | Crimson Pro (serif) | 400–700, italic 400/600 | Page titles, card titles, hero text |
| **Body** | Inter (sans-serif) | 400–700 | Paragraphs, labels, navigation, buttons |

### Loading

Fonts are loaded via Google Fonts in `layout.tsx`:

```html
<link href="https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
```

### Application

```css
/* Headings — applied inline or via utility */
font-family: 'Crimson Pro', Georgia, serif;

/* Body — default via Tailwind config */
font-family: 'Inter', system-ui, sans-serif; /* class: font-body */
```

---

## 2. Color Palette

### Primary

| Token | Value | Usage |
|-------|-------|-------|
| `blue-600` | `#2563EB` | Primary action, links, hover states |
| `blue-50` | `#EFF6FF` | Greyson icon badge background |
| `slate-900` | `#0F172A` | Primary text, headings |
| `slate-600` | `#475569` | Secondary text, nav items |
| `slate-400` | `#94A3B8` | Muted text, breadcrumbs |
| `slate-50` | `#F8FAFC` | Page backgrounds |

### Score Accents

Each research scale has a dedicated color accent:

| Scale | Color | Badge BG | Text | Icon |
|-------|-------|----------|------|------|
| **Veridical (cvNDE)** | Emerald | `emerald-100` | `emerald-800` | `emerald-600` |
| **Greyson Scale** | Blue | `blue-100` | `blue-800` | `blue-600` |
| **Transformation** | Rose | `rose-100` | `rose-800` | `rose-600` |

### Gradients

| Context | Value |
|---------|-------|
| Hero background | `linear-gradient(135deg, #EBF5FF 0%, #F8FAFC 60%, #FFF1F2 100%)` |
| Veridical header | `linear-gradient(135deg, #EFF6FF 0%, #F8FAFC 100%)` |
| Transformation header | `linear-gradient(135deg, #FFF1F2 0%, #F8FAFC 100%)` |
| Greyson header | `linear-gradient(135deg, #EFF6FF 0%, #F8FAFC 100%)` |

---

## 3. Component Patterns

### Cards

```
rounded-2xl
border border-slate-200/60
bg-white
hover:shadow-xl hover:border-blue-200   (or rose-200 for transformation)
transition-all duration-300
```

### Icon Badges (Explorer Headers)

```
w-12 h-12 rounded-2xl bg-{color}-100
<Icon className="w-6 h-6 text-{color}-600" />
```

### Score Badges (Thumbnails)

```
bg-white/90 backdrop-blur-sm
text-xs font-bold
px-2.5 py-1 rounded-lg shadow-sm
```

### Classification Pills

```
text-[10px] font-medium
px-2 py-0.5 rounded-full
bg-{color}-100 text-{color}-800
```

### Controls Wrapper

```
bg-white rounded-2xl shadow-sm border border-slate-200/60 p-4
```

### Breadcrumb

```
text-sm text-slate-400
gap-1.5
Links: hover:text-blue-600
Active item: text-slate-700 font-medium
Separator: <ChevronRight className="w-3.5 h-3.5" />
```

---

## 4. Layout & Spacing

| Element | Value |
|---------|-------|
| Max content width | `max-w-7xl` (1280px) |
| Page horizontal padding | `px-4` |
| Header height | `h-16` (64px) |
| Header style | `bg-white/80 backdrop-blur-xl sticky top-0 z-50 border-b border-slate-200/60` |
| Explorer header padding | `py-8` |
| Grid gap | `gap-6` |
| Card grid columns | `1 / sm:2 / md:3 / lg:4` |
| Section vertical padding | `py-8` to `py-20` |

---

## 5. Navigation

### Desktop Header

- **Logo**: Transparent logo image (36×36) + Crimson Pro serif "Project Profound"
- **Links**: `text-sm font-medium text-slate-600`, `hover:bg-slate-100/80 rounded-lg px-3 py-2`
- **Dropdowns**: `rounded-xl shadow-xl border-slate-200/60`, items with `hover:bg-slate-50`
- **Explore dropdown**: Rich items with colored icon badges (8×8 rounded-lg)
- **CTA**: Contribute uses `bg-emerald-50 text-emerald-700`

### Footer

- Light `bg-slate-50` with `border-t border-slate-200/60`
- 3-column grid: Brand + tagline, Quick Links, Legal & Support
- Bottom bar with copyright + newsletter link

---

## 6. Icons

All icons use [Lucide React](https://lucide.dev/). Standard sizes:

| Context | Size |
|---------|------|
| Nav items | `w-3.5 h-3.5` |
| Nav dropdown badges | `w-4 h-4` |
| Explorer header badges | `w-6 h-6` |
| Breadcrumb separators | `w-3.5 h-3.5` |

---

## 7. Global CSS

Key global styles in `globals.css`:

```css
html {
  scroll-behavior: smooth;
}
```

Body class: `font-body antialiased flex flex-col min-h-screen bg-background`

---

## 8. File Quick Reference

| Purpose | Path |
|---------|------|
| Root layout (fonts) | `src/app/layout.tsx` |
| Global CSS | `src/app/globals.css` |
| Site Header | `src/components/site-header.tsx` |
| Site Footer | `src/components/site-footer.tsx` |
| Chat Popup | `src/components/chat-popup.tsx` |
| Home page | `src/app/page.tsx` |
| Search page | `src/app/search3/page.tsx` |
| Veridical explorer | `src/app/explore/veridical/page.tsx` |
| Greyson explorer | `src/app/explore/greyson/page.tsx` |
| Transformation explorer | `src/app/explore/transformation/page.tsx` |
| Video detail | `src/app/video/[id]/page.tsx` |
| Resources page | `src/app/resources/page.tsx` |
| Profile page | `src/app/profile/page.tsx` |
| Dashboard page | `src/app/dashboard/page.tsx` |
| Admin layout | `src/app/admin/layout.tsx` |
| Admin overview | `src/app/admin/page.tsx` |
| Admin users | `src/app/admin/users/page.tsx` |
| Admin user row | `src/app/admin/users/user-row.tsx` |
| Favicon / icon | `src/app/icon.png` |
| Logo (transparent) | `public/logo-transparent.png` |
| Logo (solid) | `public/logo-solid.png` |
| Logo (white) | `public/logo-white.png` |

---

## 9. Profile & Dashboard

Both pages share a common pattern:

- **Gradient header**: `bg-gradient-to-br from-slate-50 to-blue-50/30` with breadcrumb + Crimson Pro title + icon badge
- **Content cards**: `rounded-2xl border border-slate-200/60 bg-white` with icon-badged section headers
- **Inputs**: `rounded-xl` with slate-200 borders and blue focus rings

---

## 10. Admin Panel

### Sidebar (`admin/layout.tsx`)

- `bg-slate-50 border-r border-slate-200/60`
- Nav items: `rounded-xl px-3 py-2.5 hover:bg-white hover:shadow-sm`
- Icon badge header: `w-10 h-10 rounded-xl bg-blue-100`

### Stats Cards (`admin/page.tsx`)

- `rounded-2xl border border-slate-200/60 hover:shadow-lg`
- Icon badges with color coding (blue = total, red = banned, emerald = admins)

### Users Table (`admin/users/`)

- Rounded-2xl container, `divide-y divide-slate-100`
- Role/status badges: `rounded-lg` pills
- Action buttons: pill-shaped with hover backgrounds

---

## 11. Chat Popup Widget

- **Trigger**: `bg-[#2563EB]` pill button, bottom-right
- **Panel**: White background, `rounded-2xl shadow-2xl`, 380×550px
- **Header**: `bg-[#2563EB]` with white icon + text
- **Messages area**: `bg-slate-50/50` with white cards for assistant, blue bubbles for user
- **Quick actions**: White pills with `hover:bg-blue-50 hover:border-blue-200`
- **Input**: `bg-slate-50 rounded-full` with blue focus ring

---

## 12. Theme System

### Overview

Project Profound supports three theme options via **next-themes** (`^0.4.6`):

| Option | Class on `<html>` | Behaviour |
|--------|--------------------|----------|
| **Light** | *(none / default)* | Forces light palette regardless of OS |
| **System (Device)** | Follows OS | Reads `prefers-color-scheme` — default on first visit |
| **Dark** | `.dark` | Forces dark palette regardless of OS |

The selected preference is persisted in `localStorage` under the key `theme`.

### How It Works

1. `src/components/theme-provider.tsx` — thin `"use client"` wrapper around `NextThemesProvider`.
2. Wraps the entire app in `src/app/layout.tsx` with `attribute="class" defaultTheme="system" enableSystem`.
3. `suppressHydrationWarning` is set on `<html>` — next-themes injects an inline script that applies the `.dark` class before React hydrates, causing an intentional (harmless) mismatch.
4. `src/components/theme-toggle.tsx` — three-button pill (☀ Light / 💻 System / 🌙 Dark) rendered in both the desktop nav and mobile sheet footer.

### Light Palette (CSS Variables — `:root`)

| Token | HSL | Tailwind Equivalent | Usage |
|-------|-----|---------------------|-------|
| `--background` | `210 40% 98%` | `slate-50` `#F8FAFC` | Page background |
| `--foreground` | `222 47% 11%` | `slate-900` `#0F172A` | Primary text |
| `--card` | `0 0% 100%` | white | Card background |
| `--primary` | `221 83% 53%` | `blue-600` `#2563EB` | Links, buttons, accents |
| `--border` | `214 32% 91%` | `slate-200` | Dividers, card borders |
| `--muted-foreground` | `215 20% 45%` | `slate-500` | Secondary text |

### Dark Palette (CSS Variables — `.dark`)

| Token | HSL | Usage |
|-------|-----|-------|
| `--background` | `222 47% 8%` | Near `slate-950` — page background |
| `--foreground` | `210 40% 96%` | `slate-100` — primary text |
| `--card` | `222 47% 12%` | `slate-900` equiv — card background |
| `--primary` | `221 83% 53%` | `blue-600` — unchanged brand accent |
| `--border` | `222 47% 22%` | Subtle dark border |
| `--muted-foreground` | `215 20% 65%` | Medium-grey secondary text |

### Coding Rules

1. **Prefer CSS variables** (`bg-background`, `text-foreground`, `bg-card`, `border-border`) — they flip automatically with the theme.
2. **Use `dark:` variants** only for hardcoded Tailwind values that don't have a CSS variable equivalent, e.g. `bg-white dark:bg-slate-800`.
3. **Never use raw `bg-white` without `dark:bg-*`** in new components — always pair the light value with a dark override.
4. **Score accent colours** (emerald, rose, blue badges) look good in both themes — no special handling needed.
5. **Admin pages** use a light theme regardless — the admin layout explicitly sets a `bg-[#F8FAFC]` base and should not adopt dark backgrounds.

### Logo in Dark Mode

| Theme | Logo variant to use |
|-------|---------------------|
| Light | `public/logo-transparent.png` (36×36 in nav) |
| Dark | `public/logo-transparent.png` also works on dark backgrounds |
| Dark overlay | Use `public/logo-white.png` for opaque dark surfaces or hero images |

The transparent PNG renders well on both the light `bg-white/80` and the dark `bg-slate-900/80` header — no conditional swap needed for the nav.

### Files

| Purpose | Path |
|---------|------|
| CSS variables (light + dark) | `src/app/globals.css` |
| ThemeProvider wrapper | `src/components/theme-provider.tsx` |
| ThemeToggle button | `src/components/theme-toggle.tsx` |
| Site Header (where toggle lives) | `src/components/site-header.tsx` |

