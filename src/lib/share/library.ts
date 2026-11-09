/**
 * Which library tabs (Watch / Listen / Read) a story appears in, and what
 * plays in each. ARCHITECTURE §4.4a:
 *
 * | Shared as          | Watch          | Listen                         | Read        |
 * |--------------------|----------------|--------------------------------|-------------|
 * | Video (named)      | original video | the video's audio track        | transcript  |
 * | Audio (named)      | –              | original audio                 | transcript  |
 * | Audio (anonymous)  | –              | synthetic narration, labelled  | transcript  |
 * | Text / file (any)  | –              | synthetic narration, labelled  | text        |
 *
 * An anonymous person's own voice is never published.
 */
export type LibraryTab = 'watch' | 'listen' | 'read';

export interface LibraryInput {
    display_mode: 'named' | 'anonymous' | string;
    media_kind: 'text' | 'audio' | 'video' | 'file' | string;
    media_path: string | null;
    narration_path: string | null;
    body_text: string | null;
}

export interface LibraryFormats {
    /** Storage path of the video to show, or null. */
    watch: string | null;
    /** Storage path of the audio to play, or null. */
    listen: string | null;
    /** True when `listen` is a synthetic narration (must be labelled). */
    listenIsSynthetic: boolean;
    read: boolean;
    tabs: LibraryTab[];
}

export function libraryFormats(s: LibraryInput): LibraryFormats {
    const named = s.display_mode === 'named';
    let watch: string | null = null;
    let listen: string | null = null;
    let listenIsSynthetic = false;

    if (s.media_kind === 'video' && named && s.media_path) {
        watch = s.media_path;
        listen = s.media_path; // the browser plays the video's audio track
    } else if (s.media_kind === 'audio' && named && s.media_path) {
        listen = s.media_path;
    } else if (s.narration_path) {
        listen = s.narration_path;
        listenIsSynthetic = true;
    }

    const read = Boolean(s.body_text && s.body_text.trim());
    const tabs: LibraryTab[] = [];
    if (watch) tabs.push('watch');
    if (listen) tabs.push('listen');
    if (read) tabs.push('read');
    return { watch, listen, listenIsSynthetic, read, tabs };
}

/** Does this story still need a synthetic narration generated? */
export function needsNarration(s: LibraryInput): boolean {
    if (s.narration_path) return false;
    const named = s.display_mode === 'named';
    if (named && (s.media_kind === 'video' || s.media_kind === 'audio')) return false;
    return Boolean(s.body_text && s.body_text.trim());
}
