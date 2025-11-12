WITH candidates AS (
   -- Find the top 200 most similar results that also meet the quality threshold
   SELECT
       e.id,
       e.video_id,
       e.content,
       e.start_time,
       1 - (e.embedding <=> query_embedding) AS similarity
   FROM
       public.nde_subtitle_embeddings e
   WHERE
       1 - (e.embedding <=> query_embedding) >= similarity_threshold
   ORDER BY
       e.embedding <=> query_embedding
   LIMIT 2000 -- This is the key change!
)
-- Now, the JOIN and complex SORT only operate on a maximum of 2000 rows
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
   v."channelName"
FROM
   candidates c
JOIN
   public.nde_vids v ON c.video_id = v."videoId"
ORDER BY
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