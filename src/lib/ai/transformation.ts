
import OpenAI from 'openai';
import { wrapAiClient } from './usage-tracker';

// Lazy initialization to avoid build-time errors (see LEARNINGS.md)
const getOpenAIClient = () => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error("Missing OPENAI_API_KEY environment variable");
    }
    return wrapAiClient(new OpenAI({ apiKey }), { provider: 'openai', operation: 'transformation' });
};

export const TRANSFORMATION_ANALYSIS_PROMPT = `You are an academic researcher specializing in near-death experience (NDE) aftereffects and transformation. You will analyze a punctuated transcript of a first-person NDE account and score it using the NDE Transformation Index (NDE-TI), a 10-domain scale measuring the transformation described by the experiencer as resulting from their NDE.

IMPORTANT INSTRUCTIONS:
1. Score ONLY what is described or clearly implied in the account. Do not infer transformation that is not mentioned.
2. A score of 0 means the domain was NOT DISCUSSED in this account - it does NOT mean no change occurred.
3. Assess the DEGREE OF CHANGE from the person's own described baseline, not against an external standard.
4. Capture the DIRECTION of change using indicators: up (increased), down (decreased), mixed (mixed/complex), shifted (shifted/redirected), new (newly emerged), or N/A.
5. Provide a brief EVIDENCE SUMMARY and a representative QUOTE for each domain scored >= 1.
6. Be faithful to the experiencer's own words and framing. Do not pathologize, judge, or reinterpret their experience.
7. Note: Many NDE video transcripts focus primarily on the NDE experience itself rather than aftereffects. Low transformation scores are expected and normal in such cases.

SCORING SCALE FOR EACH DOMAIN (0-5):
- 0: Not Addressed - This area of transformation is not discussed in the account.
- 1: Briefly Noted - A passing mention or slight implication of change.
- 2: Mild Change - A noticeable shift is described, with limited detail.
- 3: Moderate Change - A clear, meaningful transformation is described with specific examples or detail.
- 4: Significant Change - A major, life-altering transformation is described in detail; clearly important to the experiencer.
- 5: Profound Transformation - A dramatic, fundamental, life-defining change described with vivid detail and emotional emphasis; central to the account.

THE 10 DOMAINS:
1. Appreciation for Life (AL): Changes in gratitude, wonder, savoring ordinary moments, awareness of beauty, feeling life is precious. (Typical direction: up)
2. Self-Perception & Identity (SI): Changes in self-acceptance, self-worth, inner peace, confidence, personality traits, sense of being a "different person." (Typical direction: up)
3. Compassion & Concern for Others (CC): Changes in empathy, desire to help/serve, tolerance, unconditional love, sensitivity to others' feelings. (Typical direction: up)
4. Values & Priorities (VP): Changes in materialism, status-seeking, competition, simplicity, authenticity, what the person considers most important. (Typical direction: down materialism, up simplicity)
5. Spiritual Awareness (SA): Changes in sense of connection to the divine, universal consciousness, oneness, spiritual practices. Distinct from organized religion. (Typical direction: up)
6. Religious Orientation (RO): Changes in relationship with organized religion, doctrines, institutional participation, faith tradition. Can move in ANY direction. (Directions: up, down, shifted, mixed)
7. Attitude Toward Death (AD): Changes in fear of death, belief in afterlife, death as transition/homecoming, comfort with mortality. (Typical direction: down fear, up belief/comfort)
8. Psychic & Expanded Perception (PE): Emergence or increase of intuition, precognition, telepathy, healing abilities, mediumship, OBEs, synchronicities, electromagnetic sensitivity. (Typical direction: up)
9. Relationships & Social Dynamics (RS): Changes in intimate partnerships, friendships, family dynamics, feelings of alienation, need for deep connection. (Typical direction: mixed)
10. Purpose, Meaning & Life Direction (PD): Changes in life purpose, mission, career path, thirst for knowledge, desire to serve, meaningful work. (Typical direction: up)

OUTPUT FORMAT - Respond with ONLY valid JSON matching this schema exactly:

{
  "quantitative_metrics": {
    "overall_transformation_score": <number 0-50>,
    "transformation_breadth": <number 0-10, count of domains scoring >= 1>,
    "transformation_depth": <number 1.0-5.0, mean of domains scoring >= 1, or 0 if no domains scored>
  },
  "domain_analysis": {
    "AL": { "name": "Appreciation for Life", "score": <0-5>, "direction": "<up|down|mixed|shifted|new|N/A>", "evidence_summary": "<brief explanation>", "key_quote": "<direct quote or empty string>" },
    "SI": { "name": "Self-Perception & Identity", "score": <0-5>, "direction": "<direction>", "evidence_summary": "<brief explanation>", "key_quote": "<quote>" },
    "CC": { "name": "Compassion & Concern for Others", "score": <0-5>, "direction": "<direction>", "evidence_summary": "<brief explanation>", "key_quote": "<quote>" },
    "VP": { "name": "Values & Priorities", "score": <0-5>, "direction": "<direction>", "evidence_summary": "<brief explanation>", "key_quote": "<quote>" },
    "SA": { "name": "Spiritual Awareness", "score": <0-5>, "direction": "<direction>", "evidence_summary": "<brief explanation>", "key_quote": "<quote>" },
    "RO": { "name": "Religious Orientation", "score": <0-5>, "direction": "<direction>", "evidence_summary": "<brief explanation>", "key_quote": "<quote>" },
    "AD": { "name": "Attitude Toward Death", "score": <0-5>, "direction": "<direction>", "evidence_summary": "<brief explanation>", "key_quote": "<quote>" },
    "PE": { "name": "Psychic & Expanded Perception", "score": <0-5>, "direction": "<direction>", "evidence_summary": "<brief explanation>", "key_quote": "<quote>" },
    "RS": { "name": "Relationships & Social Dynamics", "score": <0-5>, "direction": "<direction>", "evidence_summary": "<brief explanation>", "key_quote": "<quote>" },
    "PD": { "name": "Purpose, Meaning & Life Direction", "score": <0-5>, "direction": "<direction>", "evidence_summary": "<brief explanation>", "key_quote": "<quote>" }
  },
  "qualitative_profile": {
    "dominant_themes": ["<Theme 1>", "<Theme 2>", "<Theme 3>"],
    "integration_notes": "<Observations on difficulty/ease of integrating changes>",
    "timeline_notes": "<Immediate vs gradual, time since NDE if mentioned>",
    "unique_features": "<Any distinctive aspects of this transformation>"
  }
}`;

// --- TypeScript Types ---

export type TransformationDomainCode = 'AL' | 'SI' | 'CC' | 'VP' | 'SA' | 'RO' | 'AD' | 'PE' | 'RS' | 'PD';

export type TransformationDirection = 'up' | 'down' | 'mixed' | 'shifted' | 'new' | 'N/A';

export type TransformationDomainItem = {
    name: string;
    score: number;
    direction: TransformationDirection;
    evidence_summary: string;
    key_quote: string;
};

export type TransformationQualitativeProfile = {
    dominant_themes: string[];
    integration_notes: string;
    timeline_notes: string;
    unique_features: string;
};

export type TransformationAnalysisResult = {
    quantitative_metrics: {
        overall_transformation_score: number;
        transformation_breadth: number;
        transformation_depth: number;
    };
    domain_analysis: Record<TransformationDomainCode, TransformationDomainItem>;
    qualitative_profile: TransformationQualitativeProfile;
};

/**
 * Classifies the overall transformation score into a human-readable label.
 * Based on the NDE-TI scoring guide (Part IV, Section 4.1).
 */
export function classifyTransformationScore(score: number): string {
    if (score === 0) return 'No Transformation Discussed';
    if (score <= 10) return 'Minimal Transformation';
    if (score <= 20) return 'Moderate Transformation';
    if (score <= 30) return 'Significant Transformation';
    if (score <= 40) return 'Major Transformation';
    return 'Comprehensive Profound Transformation';
}

/**
 * Analyzes a transcript using the NDE Transformation Index via OpenAI GPT-4o-mini.
 * @param subtitles The subtitles_punctuated text content to analyze
 * @returns A structured TransformationAnalysisResult or null on failure.
 */
export async function analyzeTransformationScore(subtitles: string): Promise<TransformationAnalysisResult | null> {
    if (!subtitles) return null;

    // Truncate to avoid token limits. GPT-4o-mini handles 128k context,
    // but 50k chars covers most hour-long videos and keeps costs reasonable.
    const truncatedSubtitles = subtitles.slice(0, 50000);

    try {
        const openai = getOpenAIClient();
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: TRANSFORMATION_ANALYSIS_PROMPT },
                { role: "user", content: `Analyze the following NDE account transcript:\n\n${truncatedSubtitles}` }
            ],
            response_format: { type: "json_object" },
            temperature: 0.1, // Low temperature for deterministic/consistent scoring
        });

        const content = completion.choices[0].message.content;
        if (!content) return null;

        const result = JSON.parse(content) as TransformationAnalysisResult;
        return result;

    } catch (error) {
        console.error("Error in analyzeTransformationScore:", error);
        return null;
    }
}
