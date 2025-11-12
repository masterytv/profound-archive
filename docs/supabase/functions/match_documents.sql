BEGIN
 RETURN QUERY
 SELECT
   chunks.id,
   chunks.video_id,
   chunks.content,
   vids.title, -- Added
   vids.url,   -- Added
   1 - (chunks.embedding <=> query_embedding) AS similarity
 FROM
   nde_chatbot_chunks AS chunks
 JOIN -- Added Join
   nde_vids AS vids ON chunks.video_id = vids."videoId"
 ORDER BY
   chunks.embedding <=> query_embedding
 LIMIT match_count;
END;