BEGIN
   RAISE LOG 'Starting vector search for query with match_threshold: %, match_count: %', match_threshold, match_count;


   RETURN QUERY
   SELECT
       se.id AS moment_id,
       se.video_id,
       se.content,
       se.start_time,
       1 - (se.embedding <=> query_embedding) AS similarity,
       -- Get video details by joining back to the main table
       v.url,
       v.title,
       v."thumbnailUrl",
       v.date,
       v."viewCount",
       v.likes,
       v."commentsCount"
   FROM
       public.nde_subtitle_embeddings se
   JOIN
       public.nde_vids v ON se.video_id = v."videoId"
   WHERE
       1 - (se.embedding <=> query_embedding) > match_threshold
   ORDER BY
       similarity DESC
   LIMIT
       match_count;


   RAISE LOG 'Finished vector search.';
END;