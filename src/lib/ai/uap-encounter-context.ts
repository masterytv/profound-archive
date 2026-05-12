/**
 * UAP Encounter Context Extraction Module
 *
 * Lean "Light Pass" for Tier 1 encounter videos — extracts factual context
 * that the phenomenology pipeline DOESN'T capture:
 *   1. Event date/time — when did the encounter happen?
 *   2. Location/facility context — where, and near what?
 *   3. Military context — witness rank, branch, base assignment
 *   4. Connected cases — references to known UAP events
 *
 * This data feeds Epic 6.6 (Event Timeline Infrastructure) and enables
 * geographic clustering, witness credibility signals, and event linkage.
 *
 * Single gpt-4o-mini call, ~$0.001/video.
 */

import OpenAI from 'openai';
import { z } from 'zod';

// ─── Lazy OpenAI init (avoids build-time env errors — see LEARNINGS.md) ──────

const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY environment variable");
  return new OpenAI({ apiKey });
};

// ─── Enums ───────────────────────────────────────────────────────────────────

const SettingEnum = z.enum([
  'urban', 'suburban', 'rural', 'wilderness', 'desert',
  'ocean', 'airborne', 'military_base', 'highway',
  'residential', 'not_stated',
]);

// ─── LLM Normalizer ─────────────────────────────────────────────────────────
// Same approach as uap-phenomenology.ts — handle LLM drift in enums

function normalizeLlmOutput(raw: unknown): unknown {
  if (raw === null || raw === undefined) return raw;
  if (typeof raw === 'string') return raw;
  if (Array.isArray(raw)) return raw.map(normalizeLlmOutput);

  if (typeof raw === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
      const normalizedKey = key.toLowerCase().trim().replace(/ /g, '_');
      if (typeof value === 'string') {
        // Only normalize enum-like fields (short, single-concept values)
        // Preserve natural language in descriptions and free-text
        const isEnumField = [
          'setting', 'branch', 'country',
        ].includes(normalizedKey);
        if (isEnumField) {
          result[normalizedKey] = value.toLowerCase().trim().replace(/ /g, '_');
        } else {
          result[normalizedKey] = value;
        }
      } else {
        result[normalizedKey] = normalizeLlmOutput(value);
      }
    }
    return result;
  }
  return raw;
}

// ─── Sub-schemas ─────────────────────────────────────────────────────────────

const LocationContextSchema = z.object({
  description: z.string(),           // "rural road near Dandenong Ranges, Victoria"
  nearest_city: z.string(),          // "Melbourne, Australia"
  state_province: z.string(),        // "Victoria" — helps with geographic precision
  country: z.string(),               // "Australia"
  setting: SettingEnum,
  nearby_facilities: z.array(z.string()), // ["military base", "nuclear power plant"]
  geographic_features: z.string(),   // "mountainous terrain", "open desert", "coastal"
});

const MilitaryContextSchema = z.object({
  is_military_witness: z.boolean(),
  branch: z.string(),               // "Navy", "Air Force", "Army"
  rank: z.string(),                  // "Commander", "Lt. Colonel"
  base_assignment: z.string(),       // "NAS Oceana", "Wright-Patterson AFB"
  duty_context: z.string(),          // "routine training flight", "guard duty"
  clearance_mentioned: z.boolean(),  // did they mention having security clearance?
  years_of_service: z.string(),      // "20 years", "not stated"
});

const ConnectedCaseSchema = z.object({
  event_name: z.string(),            // "Phoenix Lights", "Rendlesham Forest"
  connection_type: z.string(),       // "same event", "similar sighting", "referenced by witness"
  date_mentioned: z.string(),        // "March 1997", "December 1980"
});

const MediaCoverageSchema = z.object({
  was_reported_in_media: z.boolean(),
  media_outlets: z.array(z.string()).catch([]),
  documentary_appearances: z.array(z.string()).catch([]),
});

// ─── Root Schema ─────────────────────────────────────────────────────────────

export const UapEncounterContextSchema = z.object({
  // When
  event_date: z.string(),             // "1993-08-08", "summer 1977", "not stated"
  event_time: z.string(),             // "2:30 AM", "night", "dusk", "not stated"
  event_year: z.number().nullable(),  // 1993 — parsed year for sorting/filtering

  // Where
  location: LocationContextSchema,

  // Military context
  military_context: MilitaryContextSchema,

  // Connected cases / events
  connected_cases: z.array(ConnectedCaseSchema),

  // Additional witness info (supplements phenomenology)
  total_witnesses_mentioned: z.number(), // how many witnesses mentioned?
  named_witnesses: z.array(z.string()), // names of other witnesses mentioned
  
  // Official reporting
  reported_to_authorities: z.boolean(),  // did they report to police/military/FAA?
  authority_response: z.string(),        // "Air Force investigated", "police filed report", "not stated"
  
  // Media coverage — enables "most-documented encounters" analysis
  media_coverage: MediaCoverageSchema.optional(),
});

export type UapEncounterContextResult = z.infer<typeof UapEncounterContextSchema>;
export type LocationContext = z.infer<typeof LocationContextSchema>;
export type MilitaryContext = z.infer<typeof MilitaryContextSchema>;
export type ConnectedCase = z.infer<typeof ConnectedCaseSchema>;
export type MediaCoverage = z.infer<typeof MediaCoverageSchema>;

// ─── System Prompt ───────────────────────────────────────────────────────────

export const UAP_ENCOUNTER_CONTEXT_PROMPT = `You are a UAP research analyst specializing in extracting factual context from first-person encounter transcripts.

Your task: Extract the FACTUAL CONTEXT of this encounter — the who, when, where, and connections — NOT the experiential/phenomenological details (those are handled separately).

Respond with a single JSON object matching this structure:

{
  "event_date": "1993-08-08",
  "event_time": "11:30 PM",
  "event_year": 1993,
  "location": {
    "description": "rural road in the Dandenong Ranges",
    "nearest_city": "Melbourne",
    "state_province": "Victoria",
    "country": "Australia",
    "setting": "rural",
    "nearby_facilities": ["Puckapunyal Military Base"],
    "geographic_features": "mountainous bushland"
  },
  "military_context": {
    "is_military_witness": false,
    "branch": "not stated",
    "rank": "not stated",
    "base_assignment": "not stated",
    "duty_context": "not stated",
    "clearance_mentioned": false,
    "years_of_service": "not stated"
  },
  "connected_cases": [
    {
      "event_name": "1993 Dandenong UFO Wave",
      "connection_type": "same event series",
      "date_mentioned": "August 1993"
    }
  ],
  "total_witnesses_mentioned": 3,
  "named_witnesses": ["Bill", "Andrew"],
  "reported_to_authorities": true,
  "authority_response": "police investigated but found nothing",
  "media_coverage": {
    "was_reported_in_media": true,
    "media_outlets": ["local TV news"],
    "documentary_appearances": ["Unsolved Mysteries S3E5"]
  }
}

EXTRACTION RULES:

Event Date/Time:
- Extract the most specific date possible from the transcript.
- If only a year is mentioned, use "1977" for event_date and set event_year to 1977.
- If a season is mentioned, use "summer 1977" for event_date.
- If a specific date is given, use ISO format: "1993-08-08".
- event_year must be a number (or null if truly unknown). This enables timeline sorting.
- For event_time, extract the most specific time. "Night", "around midnight", "3 AM" are all valid.
- If not stated, use "not stated" for both.

Location:
- Extract the most specific location details available.
- nearby_facilities: ONLY facilities explicitly mentioned or clearly implied by context ("I was driving past the base", "near the nuclear plant"). Do NOT infer facilities that aren't mentioned.
- setting enum values: urban, suburban, rural, wilderness, desert, ocean, airborne, military_base, highway, residential, not_stated.
- country should be the full country name ("United States", "Australia", "United Kingdom").

Military Context:
- is_military_witness should be TRUE only if the experiencer (the person telling the story) is/was in the military.
- Do NOT set is_military_witness true for civilians who happened to see something near a base.
- Extract rank, branch, base assignment ONLY if explicitly stated.
- duty_context describes what they were doing in their military role ("routine training flight", "on patrol", "stationed at").
- clearance_mentioned: true ONLY if they explicitly mention having a security clearance.
- For all fields not stated, use "not stated".

Connected Cases:
- Only include explicit references to known UAP events or other sightings.
- connection_type describes HOW this encounter relates: "same event", "similar sighting same area", "witness referenced this case", "same night as".
- If no connected cases are mentioned, return an empty array.

Witnesses:
- total_witnesses_mentioned: count of ALL witnesses described (including the primary experiencer).
- named_witnesses: only ADDITIONAL named witnesses beyond the primary speaker. If the speaker is alone, return empty array.

Authority Response:
- reported_to_authorities: did the experiencer or other witnesses report to any official body?
- authority_response: what happened when they reported? Use "not stated" if they didn't report or didn't mention the response.

Media Coverage:
- was_reported_in_media: true ONLY if the transcript explicitly mentions news coverage, newspaper articles, TV reports, or documentary appearances about this specific encounter.
- media_outlets: names of news organizations that covered the encounter (e.g., "CNN", "New York Times", "local TV news").
- documentary_appearances: specific documentaries or TV shows that featured this encounter (e.g., "Unsolved Mysteries S2E1", "The Phenomenon").
- If no media coverage is mentioned, omit the entire media_coverage object.
- Do NOT infer media coverage from the fact that the video exists on YouTube — the YouTube video itself is NOT media coverage.

ANTI-HALLUCINATION RULE: Extract ONLY what is explicitly stated in the transcript. Use "not stated", false, 0, null, or empty arrays for anything not mentioned. NEVER infer or fabricate context.`;

// ─── Analysis Function ───────────────────────────────────────────────────────

/**
 * Extracts factual encounter context from a Tier 1 UAP transcript.
 * Complements phenomenology by capturing when, where, military context,
 * and connections to known UAP events.
 *
 * @param subtitles The subtitles_punctuated text content to analyze
 * @returns Validated UapEncounterContextResult or null on failure
 */
export async function analyzeUapEncounterContext(subtitles: string): Promise<UapEncounterContextResult | null> {
  if (!subtitles) return null;

  const truncatedSubtitles = subtitles.slice(0, 50000);

  try {
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: UAP_ENCOUNTER_CONTEXT_PROMPT },
        {
          role: "user",
          content: `Extract the factual context (date, location, military background, connected events) from this UAP encounter transcript:\n\n${truncatedSubtitles}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      console.error("[uap-encounter-context] Empty response from model");
      return null;
    }

    const raw = JSON.parse(content);
    const normalized = normalizeLlmOutput(raw);
    const parsed = UapEncounterContextSchema.safeParse(normalized);

    if (!parsed.success) {
      console.error("[uap-encounter-context] Zod validation failed:", JSON.stringify(parsed.error.issues, null, 2));
      console.error("[uap-encounter-context] Raw output keys:", Object.keys(raw));
      return null;
    }

    return parsed.data;
  } catch (error) {
    console.error("[uap-encounter-context] Analysis error:", error);
    return null;
  }
}
