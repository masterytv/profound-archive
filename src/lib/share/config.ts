/**
 * Share Your Experience — configuration and limits.
 * See directives/PRD-SHARE-YOUR-EXPERIENCE.md and ARCHITECTURE-SHARE-YOUR-EXPERIENCE.md.
 */

/** Current Experiencer Agreement version. Bump it when /share/agreement changes. */
export const AGREEMENT_VERSION = '2026-11-09';
/** Current channel-member code of conduct version (/channels/conduct). */
export const CONDUCT_VERSION = '2026-11-09';

export const MEDIA_BUCKET = 'story-media';
/** Public bucket the rest of PP already uses for generated images. */
export const PUBLIC_MEDIA_BUCKET = 'media';

export const MAX_MEDIA_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB (bucket limit)
export const MAX_TEXT_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_TEXT_CHARS = 200_000;

export const STORIES_PER_DAY = 5;
export const INTROS_PER_WEEK = 10;
export const INVITE_TTL_DAYS = 7;
export const INTRO_TTL_DAYS = 14;
export const YOUTUBE_MIN_AGE_HOURS = 12;

export const EXPERIENCE_TYPES = [
    { value: 'nde', label: 'Near-death experience (NDE)' },
    { value: 'ste', label: 'Spiritually transformative experience (STE)' },
    { value: 'uap', label: 'UAP / contact experience' },
    { value: 'obe', label: 'Out-of-body experience (OBE)' },
    { value: 'adc', label: 'After-death communication (ADC)' },
    { value: 'other', label: 'Something else' },
] as const;
export type ExperienceType = (typeof EXPERIENCE_TYPES)[number]['value'];

export const AUDIO_MIME = ['audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/m4a', 'audio/aac', 'audio/wav', 'audio/x-wav'];
export const VIDEO_MIME = ['video/webm', 'video/mp4', 'video/quicktime', 'video/x-m4v'];
export const TEXT_FILE_MIME = ['text/plain', 'text/markdown', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

/** Feature flag: /share and the channel pages return 404 unless this is "true". */
export function isShareEnabled(): boolean {
    return process.env.SHARE_ENABLED === 'true';
}

/**
 * Staging and production share one database. Every row written from staging
 * is marked is_test, and production never shows or acts on is_test rows.
 */
export function isTestEnvironment(): boolean {
    return process.env.SHARE_ENV === 'staging' || process.env.NODE_ENV === 'development';
}

/** Which is_test values the current environment may read. */
export function visibleTestValues(): boolean[] {
    return isTestEnvironment() ? [true, false] : [false];
}

export function siteUrl(): string {
    return (process.env.NEXT_PUBLIC_SITE_URL || 'https://projectprofound.org').replace(/\/$/, '');
}

export const INTRO_FROM =
    process.env.SHARE_INTRO_FROM ?? 'Project Profound Introductions <intros@mail.projectprofound.org>';
export const INVITE_FROM =
    process.env.SHARE_INVITE_FROM ?? 'Project Profound <invites@mail.projectprofound.org>';
export const SHARE_REPLY_TO = 'hello@projectprofound.org';
