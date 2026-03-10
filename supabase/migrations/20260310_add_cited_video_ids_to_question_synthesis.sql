-- Pin the [1]–[4] citation mapping to specific video IDs at synthesis write time.
-- When serving a cached synthesis, cited_video_ids order is used to anchor
-- citations so they never silently point to the wrong video if vector search
-- order changes or a video is re-ranked.
ALTER TABLE public.question_synthesis
    ADD COLUMN IF NOT EXISTS cited_video_ids text[] NOT NULL DEFAULT '{}'::text[];
