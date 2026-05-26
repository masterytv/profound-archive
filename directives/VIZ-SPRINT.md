# VIZ-SPRINT: 3D Visualization System

> Phase 3 | BMAD Methodology | Type A Development Project
> Date: 2026-05-26
> Parent: directives/VIZ-ARCHITECTURE.md

## Sprint Status

| Sprint | Status | Completed |
|--------|--------|-----------|
| Sprint V1: Foundation + NDE Element Network | 🔄 In Progress | — |
| Sprint V2: UAP Phenomenology Network | 📋 Planned | — |
| Sprint V3: UAP Intelligence Network | 📋 Planned | — |
| Sprint V4: Global Geography Globe | 📋 Planned | — |
| Phase 1B: Similarity Space, Hynek, Channels, Timeline | 📋 Planned | — |

---

## Sprint V1: Foundation + NDE Element Network

**Goal:** Build shared viz infrastructure and ship the simplest visualization (15-node NDE element co-occurrence network) to prove the 3D stack.

### Epic V1.1: Package Installation (User Action)

- [ ] User runs in host terminal: `npm install react-force-graph-3d three && npm install -D @types/three` (**BLOCKING**)

### Epic V1.2: Shared Viz Infrastructure (1d)

#### Story V1.2.1: Shared Components
- [x] Create `src/components/viz/VizPageShell.tsx` — dark full-screen DOM layout (NOT a Three.js context)
- [x] Create `src/components/viz/VizLegend.tsx` — color legend with toggles
- [x] Create `src/components/viz/VizNodeTooltip.tsx` — hover/tap info popup
- [x] Create `src/components/viz/hooks/useIsMobile.ts` — mobile detection
- [x] Create `src/components/viz/hooks/useReducedMotion.ts` — prefers-reduced-motion

#### Story V1.2.2: Viz Routes
- [x] Create `src/app/visualize/layout.tsx` — dark immersive layout with transparent header
- [x] Create `src/app/visualize/page.tsx` — hub page with cards linking to each visualization

### Epic V1.3: Pre-compute Pipeline + Cache (1d)

#### Story V1.3.1: Database Cache Table
- [x] Create migration `viz_graph_cache` — stores pre-computed graph JSON per visualization
- [x] RLS: public read, service_role write

#### Story V1.3.2: NDE Element Co-occurrence Computation
- [x] Computed via direct SQL: unpivots JSONB array, generates all present-element pairs per row, counts co-occurrences
- [x] Cache seeded: 15 nodes, 105 edges, 5,031 experiences in `viz_graph_cache`

#### Story V1.3.3: API Route
- [x] Create `src/app/api/viz/nde-elements/route.ts` — simple SELECT from `viz_graph_cache WHERE viz_id = 'nde-elements'`

### Epic V1.4: NDE Element Network 3D Graph (2d)

#### Story V1.4.1: Page Wrapper
- [x] Create `src/app/visualize/nde-elements/page.tsx` — server component with metadata + dynamic import
- [x] `generateMetadata` for SEO

#### Story V1.4.2: 3D Graph Client Component
- [x] Create `src/app/visualize/nde-elements/nde-element-graph.tsx` — `'use client'` component
- [x] Uses `react-force-graph-3d` with ForceGraph3D
- [x] 15 nodes (one per core element), sized by frequency (how common that element is)
- [x] Edges = co-occurrence, thickness = weight (pair frequency)
- [x] Color by element category (cognitive / perceptual / affective / boundary)
- [x] Click node → popup with stats: "Present in X% of experiences"
- [x] Click edge → popup: "These appear together in N experiences (Y%)"
- [x] Slider: minimum co-occurrence threshold (hide weak connections)
- [x] Mobile: freeze physics after 200 ticks (`cooldownTicks(200)`)
- [x] `prefers-reduced-motion`: disable auto-rotation, instant transitions

### Epic V1.5: Polish + Testing (1d)

- [ ] Mobile touch testing (rotate, pinch-zoom, tap node)
- [ ] Dark theme compliance (BRAND.md tokens)
- [ ] Loading skeleton appears before 3D initializes
- [ ] prefers-reduced-motion disables auto-animation
- [ ] NDE pages unaffected (regression check)
- [ ] `npm run build` clean

---

## Sprint V2: UAP Phenomenology Network (Phase 1A)

> Planned. Same architecture as V1, richer data (50+ nodes across 7 dimensions).

## Sprint V3: UAP Intelligence Network (Phase 1A)

> Planned. Knowledge graph of people/orgs/programs. Search + camera animation.

## Sprint V4: Global Geography Globe (Phase 1A)

> Planned. Needs geocoding pipeline first. 3D globe with toggleable layers.
