 WITH candidates AS (
       -- Find the top 2000 most similar results from the punctuated embeddings table.
       SELECT
           e.id,
           e.video_id,
           e.content,
           e.start_time,
           1 - (e.embedding <=> query_embedding) AS similarity
       FROM
           public.nde_punctuated_embeddings e
       WHERE
           1 - (e.embedding <=> query_embedding) >= similarity_threshold
       ORDER BY
           e.embedding <=> query_embedding
       LIMIT 2000 -- Pre-filter to a smaller set for better join/sort performance.
   )
   -- Join with video details and apply final sorting/pagination.
   SELECT
       c.content,
       c.start_time,
       c.similarity,
       v."videoId" as video_id,
       v.url,
       v.title,
       v."thumbnailUrl",
       v."date",
       v."viewCount",
       v."channelName",
       v.analysis_nde_summary -- Added the summary column to the final SELECT
   FROM
       candidates c
   JOIN
       public.nde_vids v ON c.video_id = v."videoId"
   ORDER BY
       -- Dynamic sorting for numeric/date columns
       CASE WHEN sort_direction = 'DESC' THEN
           CASE
               WHEN sort_column = 'similarity' THEN c.similarity
               WHEN sort_column = 'viewCount' THEN v."viewCount"::float
               WHEN sort_column = 'date' THEN EXTRACT(EPOCH FROM v."date")
           END
       END DESC,
       CASE WHEN sort_direction = 'ASC' THEN
           CASE
               WHEN sort_column = 'similarity' THEN c.similarity
               WHEN sort_column = 'viewCount' THEN v."viewCount"::float
               WHEN sort_column = 'date' THEN EXTRACT(EPOCH FROM v."date")
           END
       END ASC,
       -- Dynamic sorting for text columns
       CASE WHEN sort_direction = 'DESC' THEN
           CASE
               WHEN sort_column = 'title' THEN v.title
               WHEN sort_column = 'channelName' THEN v."channelName"
           END
       END DESC,
       CASE WHEN sort_direction = 'ASC' THEN
           CASE
               WHEN sort_column = 'title' THEN v.title
               WHEN sort_column = 'channelName' THEN v."channelName"
           END
       END ASC
   LIMIT
       page_limit
   OFFSET
       page_offset;
