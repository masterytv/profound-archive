# Seed Data

## Overview
Seed data is used to populate the database with initial data for development or testing.

## Location
Seed data is typically found in `supabase/seed.sql`.

## What's Included
- **Test Users:** `user@example.com` / `password`
- **Initial Profiles:** Admin and standard user profiles.
- **Sample Videos:** A few entries in `nde_vids` to test the UI.
- **Sample Collections:** Defaults to test collection features.

## How to Reset
To reset the database and re-apply seed data locally:
```bash
supabase db reset
```
This command drops the database, re-runs all migrations, and then runs `seed.sql`.
