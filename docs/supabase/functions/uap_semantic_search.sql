BEGIN
   -- This query returns the most relevant chunks based on vector similarity
   -- and joins with the videos table to enrich the results.
   RETURN QUERY
   SELECT
       -- Select relevant columns from the embeddings table
       e.id,
       e.content,
       e.start_time,
       -- Calculate cosine similarity from the distance. 1 is most similar.
       1 - (e.embedding <=> query_embedding) AS similarity,
       -- Select detailed information from the videos table
       v.title AS video_title,
       v.url AS video_url,
       v.channel,
       v.views,
       v.thumbnail
   FROM
       uap_embeddings e
   -- Join with the videos table to get video metadata
   LEFT JOIN
       uap_vids v ON e.video_id = v.video_id
   ORDER BY
       -- The '<=>' operator calculates the cosine distance.
       -- Ordering by this puts the most relevant results first.
       e.embedding <=> query_embedding
   LIMIT match_count;
END;