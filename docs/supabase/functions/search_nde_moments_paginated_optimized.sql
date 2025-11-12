DECLARE
   v_offset INT;
   v_ts_query tsquery;
BEGIN
   v_ts_query := websearch_to_tsquery('english', p_search_text);
   v_offset := (p_page_number - 1) * p_page_size;


   RETURN QUERY
   WITH matching_videos AS (
       SELECT
           v."videoId",
           v.url,
           v.title,
           v."thumbnailUrl",
           v.raw_timestamped_subtitles,
           v.date,
           v."viewCount",
           v.likes,
           v."commentsCount",
           (
               SELECT jsonb_agg(elem)
               FROM jsonb_array_elements(v.raw_timestamped_subtitles->'data') AS elem
               WHERE to_tsvector('english', elem->>'text') @@ v_ts_query
           ) AS matching_subtitles_array
       FROM public.nde_vids v
       WHERE v."isNde" = 'clear_nde'
         AND v.subtitles_tsvector @@ v_ts_query
   )
   SELECT
       mv.url,
       mv.title,
       mv."thumbnailUrl",
       -- Return the first matching subtitle from the filtered array
       mv.matching_subtitles_array->0,
       -- This is a placeholder; a full count is expensive.
       0::bigint,
       mv.date,
       mv."viewCount",
       mv.likes,
       mv."commentsCount"
   FROM matching_videos mv
   WHERE mv.matching_subtitles_array IS NOT NULL AND jsonb_array_length(mv.matching_subtitles_array) > 0
   ORDER BY
       CASE WHEN p_sort_by = 'viewCount' AND p_sort_direction = 'DESC' THEN mv."viewCount" END DESC NULLS LAST,
       CASE WHEN p_sort_by = 'date' AND p_sort_direction = 'DESC' THEN mv.date END DESC NULLS LAST,
       mv.date DESC
   LIMIT p_page_size
   OFFSET v_offset;
END;