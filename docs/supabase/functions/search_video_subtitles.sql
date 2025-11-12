WITH candidates AS (
   SELECT
       id,
       video_id,
       content,
       start_time,
       -- THE FIX IS HERE: Use cosine distance (1 - result) for similarity
       1 - (embedding <=> query_embedding) AS similarity
   FROM
       public.nde_subtitle_embeddings
   ORDER BY
       -- AND THE FIX IS HERE: Use the correct <=> operator in the ORDER BY clause
       embedding <=> query_embedding
   LIMIT 100000
)
-- [The rest of the function remains the same]
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
WHERE
   c.similarity >= similarity_threshold
ORDER BY
   CASE
       WHEN sort_direction = 'DESC' THEN
           CASE
               WHEN sort_column = 'similarity' THEN c.similarity
               WHEN sort_column = 'viewCount' THEN v."viewCount"::float
               WHEN sort_column = 'date' THEN EXTRACT(EPOCH FROM v."date")
           END
   END DESC,
   CASE
       WHEN sort_direction = 'ASC' THEN
           CASE
               WHEN sort_column = 'similarity' THEN c.similarity
               WHEN sort_column = 'viewCount' THEN v."viewCount"::float
               WHEN sort_column = 'date' THEN EXTRACT(EPOCH FROM v."date")
           END
   END ASC,
   CASE
       WHEN sort_direction = 'DESC' THEN
           CASE
               WHEN sort_column = 'title' THEN v.title
               WHEN sort_column = 'channelName' THEN v."channelName"
           END
   END DESC,
   CASE
       WHEN sort_direction = 'ASC' THEN
           CASE
               WHEN sort_column = 'title' THEN v.title
               WHEN sort_column = 'channelName' THEN v."channelName"
           END
   END ASC
LIMIT
   page_limit
OFFSET
   page_offset;