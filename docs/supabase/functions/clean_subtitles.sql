-- This single, set-based query is highly efficient.
   SELECT
       -- Step 3: Take the original JSONB object and replace its 'subtitles' key
       -- with the new, cleaned array we build in the subquery.
       jsonb_set(
           raw_jsonb,
           '{subtitles}',
           (
               -- Step 2: Aggregate the cleaned subtitle objects back into a single JSONB array.
               SELECT jsonb_agg(cleaned_item)
               FROM (
                   -- Step 1: Unpack the 'subtitles' array and clean each element.
                   SELECT
                       jsonb_set(
                           item,
                           '{text}',
                           to_jsonb(
                               -- Perform the cleaning by nesting replace() calls.
                               -- 1. Replace ampersand entity
                               replace(
                                   -- 2. Replace quote entity
                                   replace(
                                       -- 3. Replace apostrophe entity
                                       replace(
                                           -- 4. Remove bracketed text like [Music]
                                           regexp_replace(item->>'text', '\[.*?\]', '', 'g'),
                                       '&#39;', ''''),
                                   '&quot;', '"'),
                               '&amp;', '&')
                           )
                       ) AS cleaned_item
                   FROM
                       -- Unpack the array into a set of rows (elements)
                       jsonb_array_elements(raw_jsonb->'subtitles') AS item
                   WHERE
                       -- Filter out any subtitles where the text becomes empty after cleaning (e.g., "[Music]").
                       -- This prevents empty subtitle entries in the final result.
                       trim(regexp_replace(item->>'text', '\[.*?\]', '', 'g')) != ''
               ) AS subquery
           )
       )