# Adding a New Feature

> Standard workflow for adding full-stack features.

## Checklists

### 1. Database (If needed)
- [ ] Create a migration file in `supabase/migrations/`.
- [ ] Define the table/columns.
- [ ] **Crucial:** Add RLS policies.
- [ ] Run `supabase db reset` or `migration up` locally.
- [ ] Update `src/lib/supabase/database.types.ts` (Auto-generated usually, or run typegen).

### 2. Backend / API
- [ ] Create a Service function (e.g. `src/lib/services/myFeature.ts`) wrapping the DB calls.
- [ ] If dealing with sensitive logic or AI, create a Route Handler `src/app/api/my-feature/route.ts`.

### 3. Frontend
- [ ] Create UI components in `src/components`.
- [ ] Create the Page in `src/app/my-feature/page.tsx`.
- [ ] Connect state/data fetching.

### 4. Documentation
- [ ] Update `docs/database/SCHEMA.md` if schema changed.
- [ ] Update `docs/api/INTERNAL_API.md` if new API added.
