# 2026-09-09 — Dr. Chase Skylar DeMayo: profile corrections and duplicate merge

Trigger: email from Dr. Chase Skylar DeMayo asking us to correct his profile
(`/experiencer/chase-skyler-deo`) and the linked interview (`/video/bmG4atiklV4`).

## What the audit found

- **Three duplicate profiles** for the same person, all published:
  - #20 `chase-demayo` "Chase DeMayo" — 3 videos (Coming Home, Life & Beyond, IANDS), 2.5M views
  - #130 `chase-skylar-demayo` "Chase Skylar DeMayo" — 2 videos (IANDS, The Other Side NDE)
  - #2005 `chase-skyler-deo` "Chase Skyler Deo" — 1 video (NDE Diary). The name came from the
    auto-caption "My name is Chase Skyler Deo".
- **Four more videos of his** were linked to no profile (Passion Harvest ×2, NDE Radio with
  Lee Witting, Beyond with Heather Tesch). Ten videos total.
- The misspelling ("Skyler Deo", "Skyler DeMaio", "Skyler Dimeo") was in the caption
  transcripts of 7 videos, in 7 AI summaries, the NDE justification, 13 chatbot chunks and
  11 search chunks.
- Trigger was `surgery` on 3 videos (and therefore on two of the profiles). His cardiac
  arrest happened in the Langley AFB hospital after an IV air embolism; the knee surgery was
  months earlier.
- Age was wrong in 6 summaries ("19-year-old", one "18-year-old") and in blog post #85. He was 20
  (April 1, 2008).
- Transcript quotes in the fingerprint for bmG4atiklV4 were checked word-for-word against
  the transcript: all 14 are accurate.
- **Life Review** was marked present on 7 videos and scored 2/2 on the Greyson scale on 9,
  every time for the scene where he watches himself as a small child in the garden. That is
  not a review of life events (the site's own definition: "Reviewed life events or life
  flash"). **Choice to Return** was marked present on 9 videos; in every telling he is told
  "you have to go back" and answers "yeah, I know". Tom's call: that is a choice to return,
  keep it.

## What was changed

Code (this branch → `staging`):
- `next.config.ts`: permanent redirects `/experiencer/chase-skyler-deo` and
  `/experiencer/chase-demayo` → `/experiencer/chase-skylar-demayo`.
- `src/app/video/[id]/page.tsx`: the experiencer link now only matches **published** profiles,
  so unpublished merged duplicates can never win the name lookup.
- `scripts/fix-chase-demayo-profile.mjs`: the data correction (dry run by default, `APPLY=1`
  to write). Verified in dry run against production data on 2026-09-09.
- `scripts/regenerate-experiencer-profile.ts`: CLI wrapper around the existing profile
  pipeline, to rebuild the merged profile's derived fields afterwards.

Data (run by a human — the agent session was not permitted to write to the shared database):
1. `node scripts/fix-chase-demayo-profile.mjs` (review the plan)
2. `APPLY=1 node scripts/fix-chase-demayo-profile.mjs`
3. `npx tsx scripts/regenerate-experiencer-profile.ts 130`

The script keeps profiles #20 and #2005 as **unpublished, empty rows** on purpose: the intake
sync (`experiencer-sync.ts`) creates a profile whenever a name has no exact match, and its
slug-collision guard is what stops "Chase DeMayo" / "Chase Skyler Deo" from being recreated.
Do not delete them.

## Decisions (confirmed by Tom, 2026-09-09)

- Display name is "Dr. Chase Skylar DeMayo" everywhere (profile, video pages, metadata);
  narrative summaries use "Chase Skylar DeMayo" without the title.
- Trigger: cardiac arrest during medical care at Langley AFB, on every video.
- Life Review → not present; Greyson life-review item → 0 (totals drop by 1–2 points).
- Choice to Return → **kept as present**. Jesus told him he had to go back and he answered
  "yeah, I know", as if he had done it many times before.
- The Greyson "border / point of no return" item is left as scored.

## Outcome (2026-09-09, later the same day)

- Tom allowed the two scripts via a local `.claude/settings.json` (the repo ignores `.claude`,
  so it is not committed). `APPLY=1` ran clean; the backup of original rows was handed to Tom.
- `regenerate-experiencer-profile.ts 130` → 13 elements, 8 channels, 5 themes. Verified in the
  database afterwards: one published profile with all 10 videos, trigger cardiac_arrest,
  no misspellings left in any table, Life Review cleared on 10/10 videos, Choice to Return
  present on 9/10.
- Cache: `POST /api/admin/revalidate` with the concrete URL reported success but the page
  stayed stale, because the route passed `'page'` as the type for a concrete URL under a
  dynamic route. Passing the pattern `/experiencer/[slug]` worked immediately; the route now
  omits the type for concrete URLs. Verified on staging: redirects 308 to the new slug, the
  profile shows the new name, 10 videos across 8 channels, Cardiac Arrest, the website link,
  and Life Review as "not described".

## Still worth a look
- Two summaries contain claims that could not be verified from bmG4atiklV4 and were left:
  7qKrXhpFxo4 ("passed out from depression and injury-related frustration") and QLZB64hBV0U
  ("Air Force journalist", "fainting from oversleeping").
