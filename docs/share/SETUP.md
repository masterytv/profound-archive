# Share Your Experience: setup and testing

Everything here is a step for **Tom**. Agents write code and migrations but
never run migrations, create secrets or change Google/YouTube settings.

Docs: `directives/PRD-SHARE-YOUR-EXPERIENCE.md`, `directives/ARCHITECTURE-SHARE-YOUR-EXPERIENCE.md`.

## 1. Database (shared staging/production database: these ARE production changes)

Run in order, in the Supabase SQL editor, then run the "Verify" query at the bottom of each:

1. `supabase/migrations/20261109_001_share_tables.sql`: 10 `share_*` tables + row-level security
2. `supabase/migrations/20261109_002_experiencer_profiles_user_id.sql`: links named storytellers' profiles to their accounts
3. `supabase/migrations/20261109_003_share_storage_bucket.sql`: private `story-media` bucket + storage access rules
4. `supabase/migrations/20261109_004_share_allow_video_without_full_name.sql`: lets people share video without their full name

Then, in the Supabase dashboard: **Storage → Settings → Upload file size limit → at least 5 GB**
(the project-wide limit applies before the bucket's own 5 GB limit).

Rollback (destructive): `supabase/rollbacks/20261109_share_rollback.sql`.

Nothing new is written to the database until `SHARE_ENABLED` is `true`, so merging the code first is safe.

## 2. App Hosting secrets and variables

| Name | Where | What |
|---|---|---|
| `SHARE_ENABLED` | `apphosting.staging.yaml` (and later `apphosting.yaml`) | `"true"` turns on `/share`, `/experiences`, `/channels/*`. Off by default. |
| `SHARE_ENV` | `apphosting.staging.yaml` | Already `"staging"`: staging rows are marked `is_test`. Never set it in production. |
| `GEMINI_API_KEY` | Secret Manager → `apphosting.yaml` | Google AI Studio key (paid tier: data not used for training). Without it, stories publish with no editor suggestions. |
| `GEMINI_MODEL` | optional | Defaults to `gemini-pro-latest`. |
| `ASSEMBLYAI_API_KEY` | Secret Manager → `apphosting.yaml` | Transcription. Without it, audio/video stories wait in "processing". |
| `ASSEMBLYAI_WEBHOOK_SECRET` | Secret Manager → `apphosting.yaml` | Any long random string; AssemblyAI sends it back on the webhook. |
| `RESEND_WEBHOOK_SECRET` | Secret Manager → `apphosting.yaml` | From the Resend webhook you create in §3. |
| `SHARE_INTRO_FROM`, `SHARE_INVITE_FROM` | optional | Default `intros@mail.projectprofound.org` / `invites@mail.projectprofound.org` (the domain Resend already sends from). |

Add each secret with a **numeric** version (`/versions/1`), as `docs/LEARNINGS.md` §5 requires.
`FAL_API_KEY`, `RESEND_API_KEY`, `SUPABASE_SERVICE_KEY` and `CRON_SECRET` already exist.

## 3. Resend open tracking

Resend → Webhooks → add endpoint `https://projectprofound.org/api/share/webhooks/resend`, event **email.opened**.
Copy its signing secret into `RESEND_WEBHOOK_SECRET`. Turn on **open tracking** for the sending domain.
(Staging: a second webhook pointing at `https://staging.projectprofound.org/...` if you want to test it there.)

## 4. YouTube (PP's own Google Cloud project)

1. Create a Google Cloud project for PP, enable **YouTube Data API v3**, create an OAuth client (Desktop or Web).
2. Get a refresh token for the **Project Profound** channel with scope `https://www.googleapis.com/auth/youtube` (upload + delete).
3. Apply for YouTube's **API audit**. Until it passes, every API upload is forced to **private** (Short Maker's notes say the same).
4. Check the daily quota: uploads cost a lot of quota units, so the default allows only a handful per day. Ask for an increase if needed.

## 5. GitHub Actions (daily narration + YouTube job)

Workflow: `.github/workflows/share-youtube.yml` (daily 04:23 UTC, or run it by hand).

Repo **secrets**: `CRON_SECRET` (same value as the app's), `SHARE_NARRATOR_SAMPLE_URL`,
`YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REFRESH_TOKEN`.
Repo **variables**: `SHARE_JOB_APP_URL` (default `https://projectprofound.org`), `SHARE_JOB_ENABLED` = `true` to run on the schedule.

**Narrator voice:** `SHARE_NARRATOR_SAMPLE_URL` must be a URL the runner can download: your voice sample (the
same clip Short Maker uses), e.g. a long-lived signed URL. Chatterbox clones it. Every narrated story is labelled
"Read by a synthetic voice".

**Speed (not verified):** Chatterbox runs on a free CPU runner. Short Maker budgets 50 minutes for a short script,
so a long story may take an hour or more. The job stops at 300 minutes and continues the next day.

## 6. Test on staging

1. Run §1 migrations; set `SHARE_ENABLED: "true"` in `apphosting.staging.yaml`; deploy staging.
2. `/share` → sign in → accept the agreement → share a **typed** story (anonymous). You should land on the review
   page with Gemini suggestions (or none if `GEMINI_API_KEY` is unset). Accept/reject → **Publish** →
   `/experiences` shows it under **Read**, marked "Test story (staging)".
3. Share a **named audio** recording: it waits in "processing" until AssemblyAI calls back (a few minutes),
   then you get the "ready to review" email.
4. Write a story containing "I tried to end my life": after publishing, it shows support resources and appears in
   `/admin/share` under **held**, with softened edits to approve.
5. `/admin/share/channels` → invite your own second email to a channel → open the link signed in as that email →
   accept the code of conduct → `/channels/directory` lists stories that opted in → **Request an introduction** →
   the experiencer email gets Accept/Decline.
6. **Delete** a story in My stories: it vanishes from `/experiences` and its files are removed from the bucket.
7. Run the workflow by hand with `app_url` = `https://staging.projectprofound.org`: staging test stories get a
   narration (Listen tab) but are **never** uploaded to YouTube.

Staging test rows, invites and files are purged automatically after 7 days by the daily maintenance call.
