DECLARE
   v_offset INT;
BEGIN
   v_offset := (p_page_number - 1) * p_page_size;


   RETURN QUERY
   SELECT
       v.url,
       v.title,
       v."thumbnailUrl",
       jsonb_build_object('text', s.content, 'start', s.start_time) AS matching_subtitle,
       (1 - (s.embedding <=> query_embedding))::float AS similarity_score,
       v.date,
       v."viewCount",
       v.likes,
       v."commentsCount"
   FROM
       public.nde_subtitle_embeddings s
   JOIN
       public.nde_vids v ON s.video_id = v."videoId"
   WHERE
       1 - (s.embedding <=> query_embedding) > p_match_threshold
   ORDER BY
       similarity_score DESC
   LIMIT p_page_size
   OFFSET v_offset;
END;