WITH ranked_subtitles AS (
   SELECT
       e.id,
       e.video_id,
       e.content,
       e.start_time,
       1 - (e.embedding <=> query_embedding) AS similarity,
       -- Rank subtitles within each video group by their similarity score
       ROW_NUMBER() OVER(PARTITION BY e.video_id ORDER BY e.embedding <=> query_embedding ASC) as rn
   FROM
       public.nde_subtitle_embeddings e
   WHERE
       1 - (e.embedding <=> query_embedding) >= similarity_threshold
)
-- Now, join and sort the diversified results
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
   -- Use only the #1 ranked subtitle from each video
   ranked_subtitles c
JOIN
   public.nde_vids v ON c.video_id = v."videoId"
WHERE
   c.rn = 1
ORDER BY
   -- The user's sorting logic now operates on the diversified set
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