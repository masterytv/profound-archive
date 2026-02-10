# Styling Guide

## Overview
We use **Tailwind CSS** for styling, with design tokens defined in `src/app/globals.css` and `tailwind.config.ts`.

## Core Technologies
- **Tailwind CSS:** Utility-first CSS framework.
- **Shadcn UI:** Component library.
- **Lucide React:** Icon set.

## Design Tokens (CSS Variables)
Defined in `src/app/globals.css`. We support Dark Mode via `.dark` class.

| Token | Description | Usage |
|---|---|---|
| `--background` | Page background | `bg-background` |
| `--foreground` | Main text color | `text-foreground` |
| `--primary` | Primary brand color | `bg-primary` |
| `--muted` | Muted backgrounds | `bg-muted` |
| `--accent` | Interactive elements | `bg-accent` |

## Typography
- **Font:** Inter (Google Fonts).
- **Headings:** Use `font-bold tracking-tight`.
- **Body:** Use `text-sm` or `text-base` typically.

## Responsive Design
- Mobile-first approach.
- Breakpoints:
  - `sm`: 640px
  - `md`: 768px (Tablets)
  - `lg`: 1024px (Laptops)
  - `xl`: 1280px (Desktops)

## Best Practices
1. **Avoid custom CSS files.** Use Tailwind utility classes.
2. **Use `cn()` helper** (from `src/lib/utils.ts`) to merge classes conditionally.
   ```tsx
   <div className={cn("p-4", isActive && "bg-blue-500")}>
   ```
3. **Consistent Spacing:** Use standard Tailwind spacing capabilities (`p-4`, `m-2`, `gap-4`).
