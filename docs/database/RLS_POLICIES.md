# Row Level Security (RLS) Policies

> [!IMPORTANT]
> This document describes the security model. Always use the Supabase Dashboard (`Authentication` > `Policies`) to verify the active policies.

## Overview
RLS is enabled on sensitive tables to ensure users can only access their own data. Public data (videos, analysis) is generally readable by everyone but writable only by admins or service roles.

## Policies by Table

### `collections`
- **Enablement:** RLS Enabled
- **Select:** Publicly visible? Or User only? *Likely User only.*
- **Insert:** Authenticated users can insert their own rows (`auth.uid() = user_id`).
- **Update:** Users can update their own rows.
- **Delete:** Users can delete their own rows.

### `favorites`
- **Enablement:** RLS Enabled
- **Select:** Users can see their own favorites (`auth.uid() = user_id`).
- **Insert:** Users can add favorites for themselves.
- **Update:** Users can update their own favorites.
- **Delete:** Users can remove their own favorites.

### `profiles`
- **Enablement:** RLS Enabled
- **Select:** Publicly readable (often required for avatars/names).
- **Update:** Users can update their own profile (`auth.uid() = id`).
- **Insert:** Managed by triggers on `auth.users` creation (usually).

### `nde_vids` & `nde_analysis`
- **Enablement:** RLS Enabled
- **Select:** Public access (anyone can search/view).
- **Insert/Update/Delete:** Admin only or Service Role only.

### `nde_chat_logs`
- **Enablement:** RLS Enabled
- **Select:** Users can see their own chat history (`auth.uid() = user_id` if linked, or via session ID).
- **Insert:** Authenticated users or Service Role.

### `saved_searches`
- **Enablement:** RLS Enabled
- **Select:** Users can see their own saved searches.
- **Insert/Update/Delete:** Owner only.

## Best Practices
1. **Never use `service_role` key on the client.**
2. **Always define policies for both SELECT and modification.**
3. **Use helper functions** like `auth.uid()` to check ownership.
4. **Grant permissions to `authenticated` and `anon` roles explicitly.**
