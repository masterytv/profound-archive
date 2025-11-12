DECLARE
   updated_row_count INT;
BEGIN
   -- This is a more advanced query that computes all tsvectors for the batch first,
   -- which is much more efficient than the previous method.
   WITH rows_to_process AS (
       SELECT "videoId"
       FROM public.nde_vids
       WHERE subtitles_tsvector IS NULL
         AND raw_timestamped_subtitles IS NOT NULL
         AND jsonb_typeof(raw_timestamped_subtitles->'data') = 'array'
       LIMIT p_batch_size
   ),
   precomputed_tsvectors AS (
       SELECT
           v."videoId",
           to_tsvector('english', string_agg(elem->>'text', ' ')) AS computed_tsvector
       FROM public.nde_vids v,
            jsonb_array_elements(v.raw_timestamped_subtitles->'data') AS elem
       WHERE v."videoId" IN (SELECT "videoId" FROM rows_to_process)
       GROUP BY v."videoId"
   )
   UPDATE public.nde_vids
   SET subtitles_tsvector = ptv.computed_tsvector
   FROM precomputed_tsvectors ptv
   WHERE public.nde_vids."videoId" = ptv."videoId";


   GET DIAGNOSTICS updated_row_count = ROW_COUNT;
   RETURN updated_row_count;
END;