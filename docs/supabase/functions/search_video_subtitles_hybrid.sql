WITH top_candidates AS (
   -- STAGE 1: Quickly get a large pool of the best matches using LIMIT. This is fast.
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
   LIMIT 2000 -- Get a large enough pool to ensure diversity
),
ranked_candidates AS (
   -- STAGE 2: Now, diversify only this small, pre-filtered set of 2000. This is also fast.
   SELECT
       *,
       ROW_NUMBER() OVER(PARTITION BY video_id ORDER BY similarity DESC) as rn
   FROM
       top_candidates
)
-- Now join the final, diversified set and complete the query.
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
   ranked_candidates c
JOIN
   public.nde_vids v ON c.video_id = v."videoId"
WHERE
   c.rn = 1
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