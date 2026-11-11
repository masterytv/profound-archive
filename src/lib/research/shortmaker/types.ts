/**
 * Short Maker research API: the response contract.
 *
 * Short Maker (masterytv/short-maker) keeps a copy of these schemas and validates every
 * response against them, so a change here is a breaking change there. Bump API_VERSION
 * and coordinate when a field changes meaning or disappears; adding a field is safe.
 */
import { z } from 'zod';

export const API_VERSION = '1';

export const SITE_URL = 'https://projectprofound.org';

export const MomentSchema = z.object({
    text: z.string(),
    start_seconds: z.number().nullable(),
    url: z.string(),
    similarity: z.number().nullable(),
});

export const ElementSchema = z.object({
    key: z.string(),
    label: z.string(),
    confidence: z.number(),
    quote: z.string(),
    start_seconds: z.number().nullable(),
});

export const CaseSchema = z.object({
    case_id: z.string(),
    video_id: z.string(),
    match: z
        .object({
            score: z.number(),
            moments: z.array(MomentSchema),
        })
        .nullable(),
    experiencer: z.object({
        name: z.string().nullable(),
        profile_slug: z.string().nullable(),
        profile_url: z.string().nullable(),
        links: z.record(z.string(), z.string()),
        other_video_count: z.number(),
    }),
    source: z.object({
        platform: z.literal('youtube'),
        title: z.string().nullable(),
        channel_name: z.string().nullable(),
        channel_id: z.string().nullable(),
        channel_url: z.string().nullable(),
        video_url: z.string(),
        published_at: z.string().nullable(),
        views: z.number().nullable(),
        pp_url: z.string(),
    }),
    summary: z.string().nullable(),
    classification: z.object({
        experience_type: z.string().nullable(),
        trigger_category: z.string().nullable(),
        trigger_description: z.string().nullable(),
        overall_tone: z.string().nullable(),
        intensity: z.number().nullable(),
        journey_type: z.string().nullable(),
    }),
    elements: z.array(ElementSchema),
    scores: z.object({
        greyson: z.number().nullable(),
        transformation: z.number().nullable(),
        veridical: z.number().nullable(),
        veridical_level: z.string().nullable(),
        veridical_reason: z.string().nullable(),
    }),
    content_safety: z.object({
        warning_level: z.string().nullable(),
        flags: z.array(z.string()),
    }),
    permission: z.object({
        status: z.literal('none_on_file'),
        note: z.string(),
    }),
});

export const JourneyStepSchema = z.object({
    order: z.number(),
    element: z.string(),
    excerpt: z.string().nullable(),
});

export const EncounterSchema = z.object({
    entity_type: z.string().nullable(),
    identity: z.string().nullable(),
    emotional_quality: z.string().nullable(),
    message_summary: z.string().nullable(),
    message_quote: z.string().nullable(),
});

export const TranscriptSegmentSchema = z.object({
    start: z.number(),
    end: z.number(),
    text: z.string(),
});

export const CaseDetailSchema = CaseSchema.extend({
    journey: z.array(JourneyStepSchema).optional(),
    encounters: z.array(EncounterSchema).optional(),
    transcript: z.object({ segments: z.array(TranscriptSegmentSchema) }).optional(),
});

export const SearchResponseSchema = z.object({
    api_version: z.literal(API_VERSION),
    query: z.record(z.string(), z.unknown()),
    cases: z.array(CaseSchema),
});

export const CaseResponseSchema = z.object({
    api_version: z.literal(API_VERSION),
    case: CaseDetailSchema,
});

export const CountsResponseSchema = z.object({
    api_version: z.literal(API_VERSION),
    query: z.record(z.string(), z.unknown()),
    count: z.number(),
    total: z.number(),
    share: z.number(),
    unit: z.literal('videos'),
    as_of: z.string(),
    method: z.string(),
    source_line: z.string(),
    caveat: z.string().nullable(),
    example_video_ids: z.array(z.string()),
});

/** One of an experiencer's videos, as the experiencer list gives it (no transcript or coding). */
export const ExperiencerVideoSchema = z.object({
    video_id: z.string(),
    title: z.string().nullable(),
    channel_name: z.string().nullable(),
    channel_url: z.string().nullable(),
    video_url: z.string(),
    pp_url: z.string(),
    views: z.number().nullable(),
    published_at: z.string().nullable(),
    summary: z.string().nullable(),
    safety_flags: z.array(z.string()),
});

/** A published experiencer profile, as on projectprofound.org/experiencer. */
export const ExperiencerSchema = z.object({
    slug: z.string(),
    name: z.string(),
    profile_url: z.string(),
    total_views: z.number(),
    /** Their videos the API can serve (hidden channels and non-NDE videos left out), most viewed first. */
    videos: z.array(ExperiencerVideoSchema),
});

export const ExperiencersResponseSchema = z.object({
    api_version: z.literal(API_VERSION),
    /** Published profiles in all, for paging. */
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    experiencers: z.array(ExperiencerSchema),
});

export type Moment = z.infer<typeof MomentSchema>;
export type CaseElement = z.infer<typeof ElementSchema>;
export type Case = z.infer<typeof CaseSchema>;
export type CaseDetail = z.infer<typeof CaseDetailSchema>;
export type SearchResponse = z.infer<typeof SearchResponseSchema>;
export type CaseResponse = z.infer<typeof CaseResponseSchema>;
export type CountsResponse = z.infer<typeof CountsResponseSchema>;
export type ExperiencerVideo = z.infer<typeof ExperiencerVideoSchema>;
export type Experiencer = z.infer<typeof ExperiencerSchema>;
export type ExperiencersResponse = z.infer<typeof ExperiencersResponseSchema>;

/** Labels for the 15 standard core elements (same wording as the experiencer pages). */
export const ELEMENT_LABELS: Record<string, string> = {
    out_of_body: 'Out-of-Body Experience',
    tunnel: 'The Tunnel',
    bright_light: 'Brilliant Light',
    deceased_relatives: 'Deceased Loved Ones',
    life_review: 'Life Review',
    being_of_light: 'Being of Light',
    border_boundary: 'Border or Boundary',
    feelings_of_peace: 'Overwhelming Peace',
    cosmic_unity: 'Cosmic Unity',
    time_distortion: 'Time Distortion',
    enhanced_senses: 'Enhanced Senses',
    telepathy: 'Telepathic Communication',
    otherworldly_realm: 'Otherworldly Realm',
    knowledge_download: 'Universal Knowledge',
    choice_to_return: 'Choice to Return',
};

export const CORE_ELEMENT_KEYS = Object.keys(ELEMENT_LABELS);

export const ENTITY_TYPES = [
    'deceased_relative',
    'deceased_friend',
    'religious_figure',
    'angel',
    'guide',
    'being_of_light',
    'shadow_figure',
    'animal',
    'group',
    'unknown',
] as const;

export const SAFETY_FLAGS = [
    'suicide_related',
    'self_harm',
    'distressing_content',
    'medical_graphic',
    'child_death',
] as const;

export const PERMISSION_NOTE =
    'Public YouTube testimony. Retell in your own words, use short quotes, and credit and link the person. ' +
    'Project Profound holds no permission for photos or clips.';
