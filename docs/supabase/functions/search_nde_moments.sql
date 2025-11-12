BEGIN
   RETURN QUERY
   WITH limited_raw_videos AS (
       SELECT
           v_inner.url,
           v_inner.title,
           v_inner."thumbnailUrl",
           v_inner.raw_timestamped_subtitles,
           v_inner."isNde"
       FROM public.nde_vids AS v_inner
       WHERE v_inner."isNde" = 'clear_nde' AND v_inner.raw_timestamped_subtitles IS NOT NULL
       -- Example: ORDER BY created_at DESC if you want to limit by "most recent"
       -- This ORDER BY should ideally align with an index for performance
       ORDER BY v_inner.created_at DESC -- Ensure 'created_at' column exists and is indexed
       LIMIT CASE WHEN p_initial_video_limit IS NOT NULL AND p_initial_video_limit > 0 THEN p_initial_video_limit ELSE NULL END
   ),
   valid_videos AS (
     SELECT
       v.url,
       v.title,
       v."thumbnailUrl",
       v.raw_timestamped_subtitles
     FROM
       limited_raw_videos AS v
     WHERE
       v.raw_timestamped_subtitles::text ILIKE '%' || p_search_text || '%'
       AND jsonb_typeof(v.raw_timestamped_subtitles -> 'data') = 'array'
   )
   SELECT
     vv.url,
     vv.title,
     vv."thumbnailUrl",
     subtitle_object.value AS matching_subtitle
   FROM
     valid_videos AS vv,
     jsonb_array_elements(vv.raw_timestamped_subtitles -> 'data') AS subtitle_object
   WHERE
     subtitle_object.value ->> 'text' ILIKE '%' || p_search_text || '%'
   ORDER BY vv.title ASC, (subtitle_object.value->>'start')::numeric ASC; -- Added ORDER BY for consistency
END;