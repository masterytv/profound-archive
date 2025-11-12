BEGIN
   RETURN QUERY
   SELECT
       c.id,
       c.content,
       c.metadata,
       c.embedding,
       1 - (c.embedding <=> query_embedding::text::vector) AS similarity,
       v.title AS video_title, -- Select the title from nde_vids
       v.url AS video_url      -- Select the url from nde_vids
   FROM
       nde_chatbot_chunks c
   -- Join the two tables on the video ID
   LEFT JOIN
       nde_vids v ON (c.metadata->>'video_id')::text = v."videoId"::text
   WHERE
       c.metadata @> filter
   ORDER BY
       c.embedding <=> query_embedding::text::vector
   LIMIT match_count;
END;