-- ============================================================================
-- Migration: Re-chunk oversized rows in nde_punctuated_embeddings (V3)
-- ============================================================================
-- Executed: 2026-04-13
-- Result: 11,212 oversized rows → 43,663 properly-sized chunks
-- Post-fix: Zero chunks over 800 chars remain (max is exactly 800).
--
-- Strategy: Split at sentence boundaries (. ? !), then comma boundaries,
-- then hard-break at word boundaries as a final fallback.
--
-- The existing FTS trigger auto-populates search_vector on INSERT.
-- Embedding (vector) column is NULL on new rows — FTS works, but 
-- semantic/vector search won't find these chunks until native re-intake.
-- ============================================================================

CREATE OR REPLACE FUNCTION rechunk_oversized_embeddings(
    p_max_length INT DEFAULT 800,
    p_target_length INT DEFAULT 500,
    p_dry_run BOOLEAN DEFAULT TRUE
)
RETURNS TABLE (
    action TEXT,
    original_id BIGINT,
    video_id TEXT,
    original_length INT,
    new_chunks_created INT
)
LANGUAGE plpgsql
AS $$
DECLARE
    rec RECORD;
    sentences TEXT[];
    current_chunk TEXT;
    sentence TEXT;
    sub_parts TEXT[];
    sub_part TEXT;
    chunks_created INT;
    total_processed INT := 0;
    total_chunks INT := 0;
    i INT;
    j INT;
    hard_break_pos INT;
BEGIN
    FOR rec IN
        SELECT e.id, e.video_id, e.content, e.start_time
        FROM nde_punctuated_embeddings e
        WHERE LENGTH(e.content) > p_max_length
        ORDER BY LENGTH(e.content) DESC
    LOOP
        sentences := regexp_split_to_array(rec.content, '(?<=[.?!])\s+');
        current_chunk := '';
        chunks_created := 0;

        FOR i IN 1..array_length(sentences, 1) LOOP
            sentence := sentences[i];
            
            IF LENGTH(sentence) > p_target_length THEN
                IF LENGTH(TRIM(current_chunk)) > 0 THEN
                    IF NOT p_dry_run THEN
                        INSERT INTO nde_punctuated_embeddings (video_id, content, start_time, embedding)
                        VALUES (rec.video_id, TRIM(current_chunk), rec.start_time, NULL);
                    END IF;
                    chunks_created := chunks_created + 1;
                    current_chunk := '';
                END IF;
                
                sub_parts := regexp_split_to_array(sentence, ',\s+');
                
                FOR j IN 1..array_length(sub_parts, 1) LOOP
                    sub_part := sub_parts[j];
                    
                    IF LENGTH(sub_part) > p_target_length THEN
                        IF LENGTH(TRIM(current_chunk)) > 0 THEN
                            IF NOT p_dry_run THEN
                                INSERT INTO nde_punctuated_embeddings (video_id, content, start_time, embedding)
                                VALUES (rec.video_id, TRIM(current_chunk), rec.start_time, NULL);
                            END IF;
                            chunks_created := chunks_created + 1;
                            current_chunk := '';
                        END IF;
                        
                        WHILE LENGTH(sub_part) > 0 LOOP
                            IF LENGTH(sub_part) <= p_target_length THEN
                                current_chunk := sub_part;
                                sub_part := '';
                            ELSE
                                hard_break_pos := p_target_length;
                                FOR k IN REVERSE p_target_length .. GREATEST(p_target_length / 2, 1) LOOP
                                    IF SUBSTRING(sub_part FROM k FOR 1) = ' ' THEN
                                        hard_break_pos := k;
                                        EXIT;
                                    END IF;
                                END LOOP;
                                
                                IF NOT p_dry_run THEN
                                    INSERT INTO nde_punctuated_embeddings (video_id, content, start_time, embedding)
                                    VALUES (rec.video_id, TRIM(LEFT(sub_part, hard_break_pos)), rec.start_time, NULL);
                                END IF;
                                chunks_created := chunks_created + 1;
                                sub_part := LTRIM(SUBSTRING(sub_part FROM hard_break_pos + 1));
                            END IF;
                        END LOOP;
                    ELSE
                        IF LENGTH(current_chunk) > 0 AND LENGTH(current_chunk) + LENGTH(sub_part) + 2 > p_target_length THEN
                            IF NOT p_dry_run THEN
                                INSERT INTO nde_punctuated_embeddings (video_id, content, start_time, embedding)
                                VALUES (rec.video_id, TRIM(current_chunk), rec.start_time, NULL);
                            END IF;
                            chunks_created := chunks_created + 1;
                            current_chunk := sub_part;
                        ELSE
                            IF LENGTH(current_chunk) > 0 THEN
                                current_chunk := current_chunk || ', ' || sub_part;
                            ELSE
                                current_chunk := sub_part;
                            END IF;
                        END IF;
                    END IF;
                END LOOP;
            ELSE
                IF LENGTH(current_chunk) > 0 AND LENGTH(current_chunk) + LENGTH(sentence) + 1 > p_target_length THEN
                    IF NOT p_dry_run THEN
                        INSERT INTO nde_punctuated_embeddings (video_id, content, start_time, embedding)
                        VALUES (rec.video_id, TRIM(current_chunk), rec.start_time, NULL);
                    END IF;
                    chunks_created := chunks_created + 1;
                    current_chunk := sentence;
                ELSE
                    IF LENGTH(current_chunk) > 0 THEN
                        current_chunk := current_chunk || ' ' || sentence;
                    ELSE
                        current_chunk := sentence;
                    END IF;
                END IF;
            END IF;
        END LOOP;
        
        IF LENGTH(TRIM(current_chunk)) > 0 THEN
            IF NOT p_dry_run THEN
                INSERT INTO nde_punctuated_embeddings (video_id, content, start_time, embedding)
                VALUES (rec.video_id, TRIM(current_chunk), rec.start_time, NULL);
            END IF;
            chunks_created := chunks_created + 1;
        END IF;
        
        IF NOT p_dry_run THEN
            DELETE FROM nde_punctuated_embeddings WHERE id = rec.id;
        END IF;
        
        total_processed := total_processed + 1;
        total_chunks := total_chunks + chunks_created;
        
        action := CASE WHEN p_dry_run THEN 'DRY_RUN' ELSE 'PROCESSED' END;
        original_id := rec.id;
        video_id := rec.video_id;
        original_length := LENGTH(rec.content);
        new_chunks_created := chunks_created;
        RETURN NEXT;
    END LOOP;
    
    action := 'SUMMARY';
    original_id := total_processed;
    video_id := 'total_new_chunks';
    original_length := total_chunks;
    new_chunks_created := 0;
    RETURN NEXT;
END;
$$;

-- Execution record:
-- SELECT * FROM rechunk_oversized_embeddings(800, 500, FALSE) WHERE action = 'SUMMARY';
-- Result: 11,212 rows processed → 43,663 new chunks created
-- Post-fix verification: Zero chunks > 800 chars remain
