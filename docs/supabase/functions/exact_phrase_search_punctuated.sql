SELECT
       e.content,
       e.start_time,
       v."videoId" as video_id,
       v.url,
       v.title,
       v."thumbnailUrl",
       v."date",
       v."viewCount",
       v."channelName",
       v.analysis_nde_summary
   FROM
       public.nde_punctuated_embeddings AS e
   JOIN
       public.nde_vids AS v ON e.video_id = v."videoId"
   WHERE
       to_tsvector('english', e.content) @@ phraseto_tsquery('english', search_phrase)
   ORDER BY
       -- This CASE statement allows for dynamic sorting
       CASE WHEN sort_direction = 'DESC' THEN
           CASE
               WHEN sort_column = 'viewCount' THEN v."viewCount"::float
               WHEN sort_column = 'date' THEN EXTRACT(EPOCH FROM v."date")
           END
       END DESC,
       CASE WHEN sort_direction = 'ASC' THEN
           CASE
               WHEN sort_column = 'viewCount' THEN v."viewCount"::float
               WHEN sort_column = 'date' THEN EXTRACT(EPOCH FROM v."date")
           END
       END ASC,
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