-- This set-based query is much faster than a PL/pgSQL loop
   SELECT
       jsonb_agg(
           jsonb_set(item, '{text}', to_jsonb(
               replace(regexp_replace(item->>'text', '\[.*?\]', '', 'g'), '&#39;', '''')
           ))
       )
   FROM
       -- Unpack the array into a set of rows
       jsonb_array_elements(
           -- Gracefully handle NULL or non-array inputs
           CASE WHEN jsonb_typeof(raw_data) = 'array' THEN raw_data ELSE '[]'::jsonb END
       ) AS item
   WHERE
       -- Filter out lines that become empty after cleaning (like "[Music]")
       regexp_replace(item->>'text', '\[.*?\]', '', 'g') != ''