-- ============================================================
-- Share Your Experience — private media bucket + storage RLS
-- ============================================================
-- Files go straight from the browser to this bucket (resumable/TUS upload
-- with the user's own JWT). Object paths are {user_id}/{story_id}/{file},
-- so the policies below let a user write, read and delete only inside their
-- own folder. Everything else (playback, transcription, narration jobs)
-- uses short-lived signed URLs created by server code.
--
-- ALSO REQUIRED (dashboard, not SQL): Storage → Settings → raise the
-- project-wide "Upload file size limit" to at least 5 GB, or uploads above
-- the global limit fail regardless of this bucket's limit.
--
-- NOTE: shared staging/production database — this IS a production change.
-- ============================================================

BEGIN;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'story-media',
    'story-media',
    false,
    5368709120, -- 5 GB
    ARRAY[
        'audio/webm','audio/ogg','audio/mpeg','audio/mp4','audio/x-m4a','audio/m4a','audio/aac','audio/wav','audio/x-wav',
        'video/webm','video/mp4','video/quicktime','video/x-m4v',
        'text/plain','text/markdown','application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
)
ON CONFLICT (id) DO UPDATE
    SET public = EXCLUDED.public,
        file_size_limit = EXCLUDED.file_size_limit,
        allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "story-media owner insert" ON storage.objects;
DROP POLICY IF EXISTS "story-media owner select" ON storage.objects;
DROP POLICY IF EXISTS "story-media owner update" ON storage.objects;
DROP POLICY IF EXISTS "story-media owner delete" ON storage.objects;

CREATE POLICY "story-media owner insert" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'story-media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "story-media owner select" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'story-media' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Resumable uploads update the object row as chunks arrive.
CREATE POLICY "story-media owner update" ON storage.objects
    FOR UPDATE TO authenticated
    USING (bucket_id = 'story-media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "story-media owner delete" ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'story-media' AND (storage.foldername(name))[1] = auth.uid()::text);

COMMIT;

-- Verify:
-- SELECT id, public, file_size_limit FROM storage.buckets WHERE id = 'story-media';  -- public = false
