
import OpenAI from 'openai';
import { wrapAiClient } from './usage-tracker';

// Lazy OpenAI client initialization
const getOpenAIClient = () => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error("Missing OPENAI_API_KEY environment variable");
    }
    return wrapAiClient(new OpenAI({ apiKey }), { provider: 'openai', operation: 'cvnde' });
};

/**
 * cvNDE Scale — Claimed Veridical Perception Scale for NDE accounts.
 * 7 criteria, each scored 1-4, total range 7-28.
 * Evaluates evidential strength of veridical perception claims.
 *
 * Scale source: /scale/cvnde page (custom scale developed for Project Profound)
 */
export const CVNDE_ANALYSIS_PROMPT = `You are an expert NDE researcher specializing in veridical perception claims. Analyze the following NDE account using the Claimed Veridical Perception Scale (cvNDE).

The cvNDE Scale evaluates the evidential strength of veridical perception claims — moments where the experiencer reports perceiving real-world information that should have been impossible to know given their medical state and physical position.

IMPORTANT: Many NDE accounts contain NO veridical perception claims at all. If the account does not describe any specific perceptions of the physical world during the experience (e.g., seeing their own resuscitation, hearing specific conversations, perceiving events in other rooms), then all criteria should be scored 1.

## THE 7 CRITERIA (each scored 1-4)

### Criterion 1: Medical State Severity During Perception
What was the reported medical/physical state during which the veridical perceptions occurred?
- 1: Normal/near-normal consciousness, or uncertain medical state
- 2: Altered consciousness without complete unconsciousness (sedation, fainting)
- 3: Deep unconsciousness (general anesthesia, coma, unresponsive)
- 4: Extreme physiological crisis (cardiac arrest, flatline, clinical death, resuscitation required)

### Criterion 2: Perceptual Access Impossibility
How physically impossible was ordinary sensory perception of the reported information?
- 1: Perceptions within potential sensory range (same room, could be heard)
- 2: Impossible vantage point but same location (viewing from above, behind)
- 3: Perceptions physically separated from body (different room, through walls)
- 4: Remote perceptions (different building, different city, miles away)

### Criterion 3: Specificity and Precision of Perceptions
How detailed and specific are the reported veridical perceptions?
- 1: Vague/general impressions ("people around me", "doctors working")
- 2: Moderate detail with some specifics ("woman with dark hair on my left")
- 3: Specific verifiable details (particular words quoted, specific actions described)
- 4: Highly precise, unique details (exact numbers, specific names of strangers, unusual details like plaid shoelaces)

### Criterion 4: Unpredictability of Perceived Information
Could the perceived information have been known beforehand, logically inferred, or reasonably guessed?
- 1: Expected/easily inferred (surgery has doctors, family is worried)
- 2: Could possibly be guessed (general staff appearance, typical procedures)
- 3: Unlikely to be known or guessed (unexpected events, unknown personnel, unusual occurrences)
- 4: Seemingly impossible to know (hidden information, events involving strangers, remote events, info about deceased unknown to experiencer)

### Criterion 5: Self-Reported Verification Quality
Did the experiencer attempt to verify their perceptions, and how compelling is their verification account?
- 1: No verification attempt mentioned, unable to verify, or disconfirming evidence
- 2: Vague/passive verification ("I found out later it was true")
- 3: Specific verification method with general confirmation ("I asked the nurse and she confirmed")
- 4: Detailed verification with specific confirmation ("I asked Dr. Smith about the plaid shoelaces and he turned white and showed them to me")

### Criterion 6: Verified Perception Weight
What is the ratio and quality of verified vs unverified perceptions?
- 1: No claimed verifications; all unverified
- 2: At least one with claimed verification among several unverified
- 3: Multiple (2-4) with claimed verification OR one with exceptional verification quality
- 4: Multiple (5+) with specific verification OR near-complete verification of all claims

### Criterion 7: Temporal Precedence of Perception Report
When did the experiencer share the perception relative to when they learned it was accurate?
- 1: No information about when first reported
- 2: Reported after verification was possible or after they could have learned the info
- 3: Reported to others before claimed verification ("I told the nurse before anyone told me")
- 4: Documented before verification was possible (told multiple witnesses immediately, wrote down details)

## SCORING LEVELS
- 7-12: Low Evidential Strength
- 13-17: Moderate Evidential Strength
- 18-22: High Evidential Strength
- 23-28: Exceptional Evidential Strength

## OUTPUT JSON SCHEMA
{
  "total_score": number,
  "level": "Low Evidential Strength" | "Moderate Evidential Strength" | "High Evidential Strength" | "Exceptional Evidential Strength",
  "summary_reason": "2-3 sentence summary explaining the score and key veridical elements (or lack thereof)",
  "criteria": {
    "medical_state_severity": { "score": 1-4, "reasoning": "brief explanation with quotes if available" },
    "perceptual_access_impossibility": { "score": 1-4, "reasoning": "string" },
    "specificity_precision": { "score": 1-4, "reasoning": "string" },
    "unpredictability": { "score": 1-4, "reasoning": "string" },
    "verification_quality": { "score": 1-4, "reasoning": "string" },
    "verified_perception_weight": { "score": 1-4, "reasoning": "string" },
    "temporal_precedence": { "score": 1-4, "reasoning": "string" }
  }
}

Respond ONLY with the JSON object. Do not include markdown code blocks, explanations, or any other text.`;

// ─── Types ───────────────────────────────────────────────────────────────────

export type CvndeCriterionScore = {
    score: 1 | 2 | 3 | 4;
    reasoning: string;
};

export type CvndeCriteria = {
    medical_state_severity: CvndeCriterionScore;
    perceptual_access_impossibility: CvndeCriterionScore;
    specificity_precision: CvndeCriterionScore;
    unpredictability: CvndeCriterionScore;
    verification_quality: CvndeCriterionScore;
    verified_perception_weight: CvndeCriterionScore;
    temporal_precedence: CvndeCriterionScore;
};

export type CvndeAnalysisResult = {
    total_score: number;
    level: string;
    summary_reason: string;
    criteria: CvndeCriteria;
};

// ─── Analysis Function ───────────────────────────────────────────────────────

/**
 * Analyzes NDE transcript using the cvNDE (Claimed Veridical Perception) Scale.
 * Returns structured scoring across 7 criteria, or null on failure.
 */
export async function analyzeCvndeScore(subtitles: string): Promise<CvndeAnalysisResult | null> {
    if (!subtitles) return null;

    // Truncate to stay within token limits
    const truncatedSubtitles = subtitles.slice(0, 50000);

    try {
        const openai = getOpenAIClient();
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: CVNDE_ANALYSIS_PROMPT },
                { role: "user", content: `Analyze this NDE transcript for veridical perception claims:\n\n${truncatedSubtitles}` }
            ],
            response_format: { type: "json_object" },
            temperature: 0.1, // Low for consistent scoring
        });

        const content = completion.choices[0].message.content;
        if (!content) return null;

        const result = JSON.parse(content) as CvndeAnalysisResult;

        // Validate total_score matches criteria sum
        const criteriaSum = Object.values(result.criteria).reduce(
            (sum, c) => sum + (c.score || 1), 0
        );
        if (result.total_score !== criteriaSum) {
            result.total_score = criteriaSum;
        }

        // Ensure correct level classification
        result.level = classifyCvndeScore(result.total_score);

        return result;

    } catch (error) {
        console.error("Error in analyzeCvndeScore:", error);
        return null;
    }
}

/**
 * Maps a total cvNDE score (7-28) to its evidential strength level.
 */
function classifyCvndeScore(score: number): string {
    if (score <= 12) return "Low Evidential Strength";
    if (score <= 17) return "Moderate Evidential Strength";
    if (score <= 22) return "High Evidential Strength";
    return "Exceptional Evidential Strength";
}
