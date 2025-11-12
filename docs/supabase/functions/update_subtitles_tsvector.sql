BEGIN
   -- This checks if the subtitles have actually changed before doing work.
   IF (TG_OP = 'INSERT' OR NEW.raw_timestamped_subtitles <> OLD.raw_timestamped_subtitles) THEN
       -- It combines all subtitle text into a single block and converts it to a tsvector.
       NEW.subtitles_tsvector := (
           SELECT to_tsvector('english', string_agg(elem ->> 'text', ' '))
           FROM jsonb_array_elements(NEW.raw_timestamped_subtitles -> 'data') AS elem
       );
   END IF;
   RETURN NEW;
END;