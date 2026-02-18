/**
 * Experience Fingerprint Builder
 *
 * Converts NDERF analysis data into a 27-dimension vector.
 * This vector encodes the experiential structure and enables
 * pgvector-based "Similar Experiences" cosine similarity search.
 *
 * Vector layout (27 dimensions):
 *   [0-14]  15 core NDE elements (1.0 present, 0.0 absent)
 *   [15]    Intensity (normalized 0-1, from 1-10 scale)
 *   [16-18] Tone one-hot: [positive, neutral, negative]
 *   [19-23] Experience type one-hot: [nde, obe, sde, adc, other]
 *   [24-26] Trigger one-hot: [medical, accident, spontaneous]
 */

// The 15 core element names in fixed order — must match core-elements.ts
const ELEMENT_NAMES = [
    "out_of_body",
    "tunnel",
    "bright_light",
    "deceased_relatives",
    "life_review",
    "being_of_light",
    "border_boundary",
    "feelings_of_peace",
    "cosmic_unity",
    "time_distortion",
    "enhanced_senses",
    "telepathy",
    "otherworldly_realm",
    "knowledge_download",
    "choice_to_return",
] as const;

// Tone mapping to 3-dim one-hot: [positive, neutral, negative]
function toneVector(tone: string | null): [number, number, number] {
    switch (tone) {
        case "very_positive":
        case "positive":
            return [1, 0, 0];
        case "neutral":
        case "mixed":
            return [0, 1, 0];
        case "negative":
        case "very_negative":
            return [0, 0, 1];
        default:
            return [0, 1, 0]; // default neutral
    }
}

// Experience type mapping to 5-dim one-hot: [nde, obe, sde, adc, other]
function typeVector(type: string | null): [number, number, number, number, number] {
    switch (type) {
        case "nde":
            return [1, 0, 0, 0, 0];
        case "obe":
            return [0, 1, 0, 0, 0];
        case "sde":
            return [0, 0, 1, 0, 0];
        case "adc":
            return [0, 0, 0, 1, 0];
        default:
            return [0, 0, 0, 0, 1]; // ste, dream, meditation, other
    }
}

// Trigger mapping to 3-dim one-hot: [medical, accident, spontaneous]
function triggerVector(trigger: string | null): [number, number, number] {
    const medical = [
        "medical_crisis", "surgery", "illness", "cardiac_arrest",
        "childbirth", "overdose", "allergic_reaction",
    ];
    const accident = ["accident", "near_drowning", "combat", "suicide_attempt"];

    if (!trigger || trigger === "unknown" || trigger === "other") return [0.33, 0.33, 0.33];
    if (medical.includes(trigger)) return [1, 0, 0];
    if (accident.includes(trigger)) return [0, 1, 0];
    // spontaneous, meditation, etc.
    return [0, 0, 1];
}

export interface FingerprintInput {
    core_elements: any;
    intensity_rating: number | null;
    overall_tone: string | null;
    experience_type: string | null;
    trigger_category: string | null;
}

/**
 * Build a 27-dimension fingerprint from analysis data.
 * Returns null if insufficient data (no core_elements).
 */
export function buildFingerprint(analysis: FingerprintInput): number[] | null {
    if (!analysis.core_elements) return null;

    const elements = Array.isArray(analysis.core_elements)
        ? analysis.core_elements
        : [];

    // Dims 0-14: Element presence (binary)
    const elementDims = ELEMENT_NAMES.map((name) => {
        const el = elements.find((e: any) => e.name === name);
        return el?.present ? 1.0 : 0.0;
    });

    // Dim 15: Intensity normalized to 0-1
    const intensity = analysis.intensity_rating
        ? Math.max(0, Math.min(1, (analysis.intensity_rating - 1) / 9))
        : 0.5;

    // Dims 16-18: Tone
    const tone = toneVector(analysis.overall_tone);

    // Dims 19-23: Experience type
    const type = typeVector(analysis.experience_type);

    // Dims 24-26: Trigger category
    const trigger = triggerVector(analysis.trigger_category);

    return [...elementDims, intensity, ...tone, ...type, ...trigger];
}
