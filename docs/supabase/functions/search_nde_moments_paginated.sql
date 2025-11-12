DECLARE
   v_offset INT;
BEGIN
   v_offset := (p_page_number - 1) * p_page_size;


   RETURN QUERY
   WITH limited_raw_videos AS (
       SELECT
           v_inner.url,
           v_inner.title,
           v_inner."thumbnailUrl",
           v_inner.raw_timestamped_subtitles,
           v_inner.date,
           v_inner."viewCount",
           v_inner.likes,
           v_inner."commentsCount"
       FROM public.nde_vids AS v_inner
       WHERE v_inner."isNde" = 'clear_nde' AND v_inner.raw_timestamped_subtitles IS NOT NULL
       ORDER BY -- Order for initial pool selection uses the parameters
           CASE WHEN p_sort_by = 'title' AND p_sort_direction = 'ASC' THEN v_inner.title END ASC NULLS LAST,
           CASE WHEN p_sort_by = 'title' AND p_sort_direction = 'DESC' THEN v_inner.title END DESC NULLS LAST,
           CASE WHEN p_sort_by = 'date' AND p_sort_direction = 'ASC' THEN v_inner.date END ASC NULLS LAST,
           CASE WHEN p_sort_by = 'date' AND p_sort_direction = 'DESC' THEN v_inner.date END DESC NULLS LAST,
           CASE WHEN p_sort_by = 'viewCount' AND p_sort_direction = 'ASC' THEN v_inner."viewCount" END ASC NULLS LAST,
           CASE WHEN p_sort_by = 'viewCount' AND p_sort_direction = 'DESC' THEN v_inner."viewCount" END DESC NULLS LAST,
           v_inner.date DESC -- Fallback if parameters don't explicitly match, or for tie-breaking.
                             -- If p_sort_by is 'viewCount' and p_sort_direction 'DESC', it will be primarily sorted by viewCount DESC.
       LIMIT CASE WHEN p_initial_video_limit > 0 THEN p_initial_video_limit ELSE NULL END
   ),
   valid_videos AS (
     SELECT
       v.url,
       v.title,
       v."thumbnailUrl",
       v.raw_timestamped_subtitles,
       v.date,
       v."viewCount",
       v.likes,
       v."commentsCount"
     FROM
       limited_raw_videos AS v
     WHERE
       v.raw_timestamped_subtitles::text ILIKE '%' || p_search_text || '%'
       AND jsonb_typeof(v.raw_timestamped_subtitles -> 'data') = 'array'
   ),
   all_matching_subtitles AS (
       SELECT
         vv.url,
         vv.title,
         vv."thumbnailUrl",
         subtitle_object.value AS matching_subtitle,
         vv.date,
         vv."viewCount",
         vv.likes,
         vv."commentsCount"
       FROM
         valid_videos AS vv,
         jsonb_array_elements(vv.raw_timestamped_subtitles -> 'data') AS subtitle_object
       WHERE
         subtitle_object.value ->> 'text' ILIKE '%' || p_search_text || '%'
   ),
   counted_subtitles AS (
       SELECT *, COUNT(*) OVER() as total_results FROM all_matching_subtitles
   )
   SELECT
       cs.url,
       cs.title,
       cs."thumbnailUrl",
       cs.matching_subtitle,
       cs.total_results,
       cs.date,
       cs."viewCount",
       cs.likes,
       cs."commentsCount"
   FROM counted_subtitles cs
   ORDER BY -- Order for final paginated results uses the parameters
       CASE WHEN p_sort_by = 'title' AND p_sort_direction = 'ASC' THEN cs.title END ASC NULLS LAST,
       CASE WHEN p_sort_by = 'title' AND p_sort_direction = 'DESC' THEN cs.title END DESC NULLS LAST,
       CASE WHEN p_sort_by = 'date' AND p_sort_direction = 'ASC' THEN cs.date END ASC NULLS LAST,
       CASE WHEN p_sort_by = 'date' AND p_sort_direction = 'DESC' THEN cs.date END DESC NULLS LAST,
       CASE WHEN p_sort_by = 'viewCount' AND p_sort_direction = 'ASC' THEN cs."viewCount" END ASC NULLS LAST,
       CASE WHEN p_sort_by = 'viewCount' AND p_sort_direction = 'DESC' THEN cs."viewCount" END DESC NULLS LAST,
       (cs.matching_subtitle->>'start')::numeric ASC
   LIMIT p_page_size
   OFFSET v_offset;


END;