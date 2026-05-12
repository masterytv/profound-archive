import OpenAI from 'openai';
import { z } from 'zod';

// ─── Lazy OpenAI init ────────────────────────────────────────────────────────
const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY environment variable");
  return new OpenAI({ apiKey });
};

// ─── LLM Output Normalizer ───────────────────────────────────────────────────
function normalizeLlmOutput(raw: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(
    JSON.stringify(raw, (_key, value) => {
      if (typeof value !== 'string') return value;
      const lower = value.toLowerCase().trim();

      // Map common "not stated" variants to canonical enum value
      if (lower === 'not stated' || lower === 'not described' || lower === 'not_described') {
        return 'not_stated';
      }

      // If the LLM outputted an exact enum string but with spaces instead of underscores,
      // we could fix it, but it's too risky for free-text fields like names.
      // We rely on Zod's .catch() and the LLM's adherence to the prompt schema instead.

      return value;
    })
  );
}

// ─── Zod Enums ───────────────────────────────────────────────────────────────

const PersonRoleEnum = z.enum([
  'witness', 'whistleblower', 'program_manager', 'gatekeeper', 'investigator',
  'legislator', 'scientist', 'journalist', 'contractor_employee',
  'military_official', 'intelligence_officer', 'other',
]).catch('other');

const PersonStatusEnum = z.enum([
  'whistleblower', 'insider', 'researcher', 'journalist', 'politician',
  'scientist', 'military_witness', 'contractor', 'alleged_gatekeeper', 'other',
]).catch('other');

const StanceEnum = z.enum(['pro_disclosure', 'anti_disclosure', 'neutral', 'unknown']).catch('unknown');

const OrgTypeEnum = z.enum([
  'government_agency', 'military_branch', 'defense_contractor', 'ffrdc',
  'research_institution', 'congressional_body', 'oversight_body',
  'think_tank', 'media_outlet', 'other',
]).catch('other');

const OrgSectorEnum = z.enum([
  'government', 'military', 'intelligence', 'private_defense', 'academic',
  'think_tank', 'media', 'nonprofit', 'other',
]).catch('other');

const ProgramStatusEnum = z.enum(['confirmed', 'alleged', 'debunked', 'disputed']).catch('alleged');

const LocationTypeEnum = z.enum([
  'military_base', 'underground_facility', 'crash_site', 'research_lab',
  'storage_facility', 'nuclear_site', 'congressional_venue', 'hotspot',
  'ocean_uso_zone', 'other',
]).catch('other');

const TechCategoryEnum = z.enum([
  'propulsion', 'materials', 'energy', 'communication', 'stealth_cloaking',
  'biology', 'reverse_engineering', 'sensor_detection', 'other',
]).catch('other');

const EvidenceTypeEnum = z.enum([
  'theoretical', 'alleged_physical', 'witness_testimony', 'leaked_document',
  'scientific_paper', 'speculation',
]).catch('speculation');

const PsiCategoryEnum = z.enum([
  'consciousness_interface', 'remote_viewing', 'telepathy', 'hitchhiker_effect',
  'paranormal_overlap', 'precognition', 'psychokinesis', 'non_local_consciousness',
  'altered_states', 'other',
]).catch('other');

const PsiEvidenceTypeEnum = z.enum([
  'program_documented', 'witness_testimony', 'scientific_paper', 'theoretical', 'speculation',
]).catch('speculation');

const SecrecyTypeEnum = z.enum([
  'sap', 'waived_sap', 'irad_loophole', 'title_10_50_transition',
  'atomic_energy_act', 'ffrdc_firewall', 'nda_intimidation', 'need_to_know',
  'private_sector_transfer', 'classification_abuse', 'congressional_bypass',
  'foreign_government', 'other',
]).catch('other');

const ClaimCategoryEnum = z.enum([
  'crash_retrieval', 'biologics', 'reverse_engineering', 'coverup', 'funding',
  'intimidation', 'international', 'technology', 'non_human_intelligence',
  'historical_event', 'legislative', 'scientific', 'other',
]).catch('other');

const ClaimContextEnum = z.enum([
  'congressional_testimony', 'interview', 'documentary', 'leaked_document',
  'news_report', 'analysis', 'speculation', 'firsthand_account',
]).catch('speculation');

const SpecificityEnum = z.enum(['vague', 'specific', 'highly_specific']).catch('vague');

const LegislativeEventTypeEnum = z.enum([
  'hearing', 'legislation', 'amendment', 'foia_release', 'whistleblower_action',
  'executive_order', 'media_bombshell', 'academic_publication', 'government_report',
]).catch('media_bombshell');

const LegislativeStatusEnum = z.enum(['passed', 'failed', 'amended', 'pending', 'stripped']).catch('pending');

const VideoTypeEnum = z.enum([
  'news_report', 'deep_dive_analysis', 'hearing_testimony', 'interview',
  'documentary', 'panel_discussion', 'leak_analysis', 'historical_review',
  'technology_explainer', 'editorial_opinion',
]).catch('deep_dive_analysis');

const PrimaryTopicEnum = z.enum([
  'legacy_program_structure', 'crash_retrieval', 'reverse_engineering',
  'whistleblower_testimony', 'congressional_hearing', 'legislation_disclosure',
  'technology_science', 'consciousness_psi', 'historical_case', 'coverup_secrecy',
  'international_programs', 'military_encounters', 'media_analysis', 'other',
]).catch('other');

const ConnectionTypeEnum = z.enum(['person', 'organization', 'program', 'location']).catch('person');

const KnowledgeSourceEnum = z.enum([
  'firsthand',           // Person directly witnessed/participated
  'secondhand',          // Person was told by a direct participant
  'documented',          // Backed by documents, FOIA, official records
  'alleged',             // Unverified claim, no direct source cited
]).catch('alleged');

const VideoToneEnum = z.enum([
  'investigative',       // Fact-finding, evidence-focused
  'conspiratorial',      // Assumes coverup, connects dots speculatively
  'academic',            // Scientific, methodological
  'experiential',        // First-person storytelling
  'journalistic',        // News reporting style
  'editorial',           // Opinion-driven
  'emotional',           // Fear/wonder/awe-driven
  'neutral',             // Balanced presentation
]).catch('neutral');

// ─── Sub-Schemas ─────────────────────────────────────────────────────────────

const PersonMentionSchema = z.object({
  name: z.string(),
  role: PersonRoleEnum,
  affiliation: z.array(z.string()).catch([]),
  military_rank: z.string().optional(),
  civilian_grade: z.string().optional(),
  status: PersonStatusEnum,
  stance: StanceEnum,
  active_period: z.string().optional(),
  first_public_date: z.string().optional(),
  claims_made: z.array(z.string()).catch([]),
  credibility_indicators: z.array(z.string()).catch([]),
  credibility_score: z.number().min(0).max(100).optional(),
  credibility_indicator_count: z.number().min(0).optional(),
  quote: z.string(),
  quote_timestamp_seconds: z.number().optional(),
  confidence: z.number().min(0).max(100),
});

const OrganizationMentionSchema = z.object({
  name: z.string(),
  type: OrgTypeEnum,
  sector: OrgSectorEnum,
  alleged_role: z.string(),
  parent_org: z.string().optional(),
  connected_persons: z.array(z.string()).catch([]),
  connected_programs: z.array(z.string()).catch([]),
  confidence: z.number().min(0).max(100),
});

const ProgramMentionSchema = z.object({
  name: z.string(),
  aliases: z.array(z.string()).catch([]),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  era: z.string(),
  managing_org: z.string(),
  status: ProgramStatusEnum,
  purpose: z.string(),
  classification_level: z.string().optional(),
  budget_info: z.string().optional(),
  successor: z.string().optional(),
  predecessor: z.string().optional(),
  key_figures: z.array(z.string()).catch([]),
  confidence: z.number().min(0).max(100),
});

const LocationMentionSchema = z.object({
  name: z.string(),
  type: LocationTypeEnum,
  coordinates_approx: z.string().optional(),
  country: z.string(),
  alleged_activity: z.array(z.string()).catch([]),
  associated_events: z.array(z.string()).catch([]),
  associated_orgs: z.array(z.string()).catch([]),
  time_period: z.string().optional(),
  event_dates: z.array(z.string()).catch([]).optional(),
  confidence: z.number().min(0).max(100),
});

const TechnologyMentionSchema = z.object({
  name: z.string(),
  category: TechCategoryEnum,
  description: z.string(),
  source_attribution: z.string(),
  evidence_type: EvidenceTypeEnum,
  science_basis: z.string(),
  connected_programs: z.array(z.string()).catch([]),
  date_first_discussed: z.string().optional(),
  alleged_development_era: z.string().optional(),
  confidence: z.number().min(0).max(100),
});

const PsiConsciousnessMentionSchema = z.object({
  category: PsiCategoryEnum,
  description: z.string(),
  source_attribution: z.string(),
  evidence_type: PsiEvidenceTypeEnum,
  connected_programs: z.array(z.string()).catch([]),
  connected_persons: z.array(z.string()).catch([]),
  event_date: z.string().optional(),
  date_disclosed: z.string().optional(),
  confidence: z.number().min(0).max(100),
});

const SecrecyMechanismSchema = z.object({
  mechanism: SecrecyTypeEnum,
  description: z.string(),
  legal_basis: z.string().optional(),
  date_enacted: z.string().optional(),
  date_exposed: z.string().optional(),
  cited_examples: z.array(z.string()).catch([]),
  alleged_abusers: z.array(z.string()).catch([]),
  confidence: z.number().min(0).max(100),
});

const ClaimExtractionSchema = z.object({
  claim_text: z.string(),
  category: ClaimCategoryEnum,
  source_person: z.string(),
  original_source: z.string().optional(),
  context: ClaimContextEnum,
  under_oath: z.boolean(),
  knowledge_source: KnowledgeSourceEnum,
  event_date: z.string().optional(),
  date_of_claim: z.string().optional(),
  specificity: SpecificityEnum,
  falsifiable: z.boolean(),
  corroboration_mentioned: z.array(z.string()).catch([]),
  supporting_evidence: z.array(z.string()).catch([]),
  counter_evidence: z.array(z.string()).catch([]),
  timestamp_seconds: z.number().optional(),
  confidence: z.number().min(0).max(100),
});

const LegislativeEventSchema = z.object({
  event_type: LegislativeEventTypeEnum,
  name: z.string(),
  date: z.string().optional(),
  participants: z.array(z.string()).catch([]),
  key_outcomes: z.array(z.string()).catch([]),
  legislation_name: z.string().optional(),
  status: LegislativeStatusEnum.optional(),
  significance: z.number().min(1).max(10),
  quote: z.string(),
  quote_timestamp_seconds: z.number().optional(),
});

const ConnectionEdgeSchema = z.object({
  source: z.string(),
  source_type: ConnectionTypeEnum,
  target: z.string(),
  target_type: ConnectionTypeEnum,
  relationship: z.string(),
  confidence: z.number().min(0).max(100),
});

// ─── Root Schema ─────────────────────────────────────────────────────────────

export const UapProgramIntelSchema = z.object({
  video_type: VideoTypeEnum,
  primary_topic: PrimaryTopicEnum,
  secondary_topics: z.array(PrimaryTopicEnum).catch([]),
  era_focus: z.array(z.string()).catch([]),
  video_tone: VideoToneEnum,
  persons: z.array(PersonMentionSchema).catch([]),
  organizations: z.array(OrganizationMentionSchema).catch([]),
  programs: z.array(ProgramMentionSchema).catch([]),
  locations: z.array(LocationMentionSchema).catch([]),
  technologies: z.array(TechnologyMentionSchema).catch([]),
  psi_consciousness: z.array(PsiConsciousnessMentionSchema).catch([]),
  claims: z.array(ClaimExtractionSchema).catch([]),
  legislative_events: z.array(LegislativeEventSchema).catch([]),
  secrecy_mechanisms: z.array(SecrecyMechanismSchema).catch([]),
  key_connections: z.array(ConnectionEdgeSchema).catch([]),
  executive_summary: z.string(),
  intelligence_value: z.number().min(1).max(10),
  primary_revelation: z.string(),
});

export type UapProgramIntelResult = z.infer<typeof UapProgramIntelSchema>;

// Export sub-types for UI components
export type PersonMention = z.infer<typeof PersonMentionSchema>;
export type OrganizationMention = z.infer<typeof OrganizationMentionSchema>;
export type ProgramMention = z.infer<typeof ProgramMentionSchema>;
export type LocationMention = z.infer<typeof LocationMentionSchema>;
export type TechnologyMention = z.infer<typeof TechnologyMentionSchema>;
export type PsiConsciousnessMention = z.infer<typeof PsiConsciousnessMentionSchema>;
export type SecrecyMechanism = z.infer<typeof SecrecyMechanismSchema>;
export type ClaimExtraction = z.infer<typeof ClaimExtractionSchema>;
export type LegislativeEvent = z.infer<typeof LegislativeEventSchema>;
export type ConnectionEdge = z.infer<typeof ConnectionEdgeSchema>;

// ─── Prompts ─────────────────────────────────────────────────────────────────

const PASS_1_NETWORK_PROMPT = `You are an expert UAP intelligence analyst specializing in network mapping, tracking persons of interest, organizations, and alleged legacy programs.

CONTEXT: This is a punctuated transcript from a YouTube video discussing UAP programs, government secrecy, technology, or related research. Extract structured intelligence from the content.

OUTPUT SCHEMA:
{
  "persons": [
    {
      "name": "string",
      "role": "witness" | "whistleblower" | "program_manager" | "gatekeeper" | "investigator" | "legislator" | "scientist" | "journalist" | "contractor_employee" | "military_official" | "intelligence_officer" | "other",
      "affiliation": ["array of strings"],
      "military_rank": "string (optional)",
      "civilian_grade": "string (optional)",
      "status": "whistleblower" | "insider" | "researcher" | "journalist" | "politician" | "scientist" | "military_witness" | "contractor" | "alleged_gatekeeper" | "other",
      "stance": "pro_disclosure" | "anti_disclosure" | "neutral" | "unknown",
      "active_period": "string (optional)",
      "first_public_date": "string (optional)",
      "claims_made": ["array of strings"],
      "credibility_indicators": ["array of strings - verifiable facts like security clearance, sworn testimony, ICIG complaint, career sacrifice"],
      "credibility_score": 0-100,
      "credibility_indicator_count": 0,
      "quote": "string (direct quote, max 40 words)",
      "quote_timestamp_seconds": "number (optional, integer seconds of when this quote appears in the video)",
      "confidence": 0-100
    }
  ],
  "organizations": [
    {
      "name": "string",
      "type": "government_agency" | "military_branch" | "defense_contractor" | "ffrdc" | "research_institution" | "congressional_body" | "oversight_body" | "think_tank" | "media_outlet" | "other",
      "sector": "government" | "military" | "intelligence" | "private_defense" | "academic" | "think_tank" | "media" | "nonprofit" | "other",
      "alleged_role": "string",
      "parent_org": "string (optional)",
      "connected_persons": ["array of strings"],
      "connected_programs": ["array of strings"],
      "confidence": 0-100
    }
  ],
  "programs": [
    {
      "name": "string",
      "aliases": ["array of strings"],
      "start_date": "string (optional)",
      "end_date": "string (optional)",
      "era": "string",
      "managing_org": "string",
      "status": "confirmed" | "alleged" | "debunked" | "disputed",
      "purpose": "string",
      "classification_level": "string (optional)",
      "budget_info": "string (optional)",
      "successor": "string (optional)",
      "predecessor": "string (optional)",
      "key_figures": ["array of strings"],
      "confidence": 0-100
    }
  ]
}

EXTRACTION RULES:
- Only extract persons, organizations, or programs explicitly named in the transcript. Never infer entities not directly stated.
- 'under_oath' should only be noted in 'credibility_indicators' if the transcript explicitly states sworn testimony.
- 'stance' reflects the person's position on UAP disclosure.
- 'credibility_indicators' are verifiable facts (e.g., security clearance level, oath, ICIG complaint, career sacrifice, peer-reviewed publications).
- 'credibility_score' (0-100): Rate based on this rubric: clearance level held (+20), sworn testimony (+20), career sacrifice / whistleblower risk (+15), corroborating witnesses (+15), documented evidence (+15), peer review / academic credentials (+15). Sum applicable factors.
- 'credibility_indicator_count': Set to the length of the credibility_indicators array you produce for this person.
- For 'persons', quote must be a DIRECT quote from the transcript (max 40 words) or empty string.

CRITICAL: Output ONLY valid JSON. No markdown, no code blocks, no explanation. Never use em dashes in output text -- use commas or semicolons instead.`;

const PASS_2_PHYSICAL_PROMPT = `You are an expert UAP intelligence analyst specializing in physical trace evidence, technology, consciousness/psi phenomena, and significant locations.

CONTEXT: This is a punctuated transcript from a YouTube video discussing UAP programs, government secrecy, technology, or related research. Extract structured intelligence from the content.

OUTPUT SCHEMA:
{
  "locations": [
    {
      "name": "string",
      "type": "military_base" | "underground_facility" | "crash_site" | "research_lab" | "storage_facility" | "nuclear_site" | "congressional_venue" | "hotspot" | "ocean_uso_zone" | "other",
      "coordinates_approx": "string (optional)",
      "country": "string",
      "alleged_activity": ["array of strings"],
      "associated_events": ["array of strings"],
      "associated_orgs": ["array of strings"],
      "time_period": "string (optional)",
      "event_dates": ["array of strings (optional)"],
      "confidence": 0-100
    }
  ],
  "technologies": [
    {
      "name": "string",
      "category": "propulsion" | "materials" | "energy" | "communication" | "stealth_cloaking" | "biology" | "reverse_engineering" | "sensor_detection" | "other",
      "description": "string",
      "source_attribution": "string",
      "evidence_type": "theoretical" | "alleged_physical" | "witness_testimony" | "leaked_document" | "scientific_paper" | "speculation",
      "science_basis": "string",
      "connected_programs": ["array of strings"],
      "date_first_discussed": "string (optional)",
      "alleged_development_era": "string (optional)",
      "confidence": 0-100
    }
  ],
  "psi_consciousness": [
    {
      "category": "consciousness_interface" | "remote_viewing" | "telepathy" | "hitchhiker_effect" | "paranormal_overlap" | "precognition" | "psychokinesis" | "non_local_consciousness" | "altered_states" | "other",
      "description": "string",
      "source_attribution": "string",
      "evidence_type": "program_documented" | "witness_testimony" | "scientific_paper" | "theoretical" | "speculation",
      "connected_programs": ["array of strings"],
      "connected_persons": ["array of strings"],
      "event_date": "string (optional)",
      "date_disclosed": "string (optional)",
      "confidence": 0-100
    }
  ]
}

EXTRACTION RULES:
- Locations must have a country; use "United States" as default if it is clearly within the US.
- Technology 'evidence_type' must distinguish between theoretical, alleged_physical, and testimony.
- Psi/consciousness is a STANDALONE domain, not a tech subcategory. Do not conflate it with technology unless the transcript explicitly links them (e.g., consciousness interface).
- Never extract generic or unmentioned locations/technologies. If none exist, return an empty array.

CRITICAL: Output ONLY valid JSON. No markdown, no code blocks, no explanation. Never use em dashes in output text -- use commas or semicolons instead.`;

const PASS_3_PAPER_TRAIL_PROMPT = `You are an expert UAP intelligence analyst specializing in claims, legislative events, secrecy mechanisms, entity connections, and overall video classification.

CONTEXT: This is a punctuated transcript from a YouTube video discussing UAP programs, government secrecy, technology, or related research. Extract structured intelligence from the content.

OUTPUT SCHEMA:
{
  "claims": [
    {
      "claim_text": "string",
      "category": "crash_retrieval" | "biologics" | "reverse_engineering" | "coverup" | "funding" | "intimidation" | "international" | "technology" | "non_human_intelligence" | "historical_event" | "legislative" | "scientific" | "other",
      "source_person": "string",
      "original_source": "string (optional)",
      "context": "congressional_testimony" | "interview" | "documentary" | "leaked_document" | "news_report" | "analysis" | "speculation" | "firsthand_account",
      "under_oath": true/false,
      "knowledge_source": "firsthand" | "secondhand" | "documented" | "alleged",
      "event_date": "string (optional)",
      "date_of_claim": "string (optional)",
      "specificity": "vague" | "specific" | "highly_specific",
      "falsifiable": true/false,
      "corroboration_mentioned": ["array of strings"],
      "supporting_evidence": ["array of strings"],
      "counter_evidence": ["array of strings"],
      "timestamp_seconds": "number (optional, integer seconds of when this claim is stated in the video)",
      "confidence": 0-100
    }
  ],
  "legislative_events": [
    {
      "event_type": "hearing" | "legislation" | "amendment" | "foia_release" | "whistleblower_action" | "executive_order" | "media_bombshell" | "academic_publication" | "government_report",
      "name": "string",
      "date": "string (optional)",
      "participants": ["array of strings"],
      "key_outcomes": ["array of strings"],
      "legislation_name": "string (optional)",
      "status": "passed" | "failed" | "amended" | "pending" | "stripped",
      "significance": 1-10,
      "quote": "string",
      "quote_timestamp_seconds": "number (optional, integer seconds of when this quote appears in the video)"
    }
  ],
  "secrecy_mechanisms": [
    {
      "mechanism": "sap" | "waived_sap" | "irad_loophole" | "title_10_50_transition" | "atomic_energy_act" | "ffrdc_firewall" | "nda_intimidation" | "need_to_know" | "private_sector_transfer" | "classification_abuse" | "congressional_bypass" | "foreign_government" | "other",
      "description": "string",
      "legal_basis": "string (optional)",
      "date_enacted": "string (optional)",
      "date_exposed": "string (optional)",
      "cited_examples": ["array of strings"],
      "alleged_abusers": ["array of strings"],
      "confidence": 0-100
    }
  ],
  "key_connections": [
    {
      "source": "string",
      "source_type": "person" | "organization" | "program" | "location",
      "target": "string",
      "target_type": "person" | "organization" | "program" | "location",
      "relationship": "string",
      "confidence": 0-100
    }
  ],
  "video_type": "news_report" | "deep_dive_analysis" | "hearing_testimony" | "interview" | "documentary" | "panel_discussion" | "leak_analysis" | "historical_review" | "technology_explainer" | "editorial_opinion",
  "primary_topic": "legacy_program_structure" | "crash_retrieval" | "reverse_engineering" | "whistleblower_testimony" | "congressional_hearing" | "legislation_disclosure" | "technology_science" | "consciousness_psi" | "historical_case" | "coverup_secrecy" | "international_programs" | "military_encounters" | "media_analysis" | "other",
  "secondary_topics": ["array of PrimaryTopicEnum"],
  "era_focus": ["array of strings"],
  "video_tone": "investigative" | "conspiratorial" | "academic" | "experiential" | "journalistic" | "editorial" | "emotional" | "neutral",
  "executive_summary": "string (2-3 sentences)",
  "intelligence_value": 1-10,
  "primary_revelation": "string (single most important new claim)"
}

EXTRACTION RULES:
- Claims must use dual-date tracking: 'event_date' (when it happened) vs 'date_of_claim' (when stated publicly).
- 'under_oath' is ONLY true if explicitly stated as sworn testimony.
- 'knowledge_source' classifies HOW the source_person knows this claim: 'firsthand' (directly witnessed/participated), 'secondhand' (told by a direct participant), 'documented' (backed by official records, FOIA releases, or published papers), 'alleged' (unverified, no direct source cited). Default to 'alleged' when unclear.
- 'key_connections' should reference entities explicitly linked within the transcript. Connect what you can see.
- 'video_type', 'primary_topic', 'secondary_topics', 'era_focus', 'video_tone' classify the whole video.
- 'video_tone' captures the overall presentation style: 'investigative' (fact-finding, evidence-focused), 'conspiratorial' (assumes coverup), 'academic' (scientific, methodological), 'experiential' (first-person storytelling), 'journalistic' (news reporting), 'editorial' (opinion-driven), 'emotional' (fear/wonder/awe-driven), 'neutral' (balanced).
- 'executive_summary' should be exactly 2-3 sentences.
- 'primary_revelation' should be the single most important or novel claim in the transcript.
- FIRST-PERSON ENCOUNTERS: For videos where an experiencer describes direct contact with non-human entities, altered consciousness, or anomalous phenomena, extract their key assertions as claims with category "non_human_intelligence" and context "firsthand_account". This includes: entity descriptions, telepathic communication, out-of-body experiences, consciousness expansion, anomalous perceptions, and physical effects. Use "Unnamed individual" or the experiencer's name as source_person. These claims are valuable intelligence even without named government sources.

CRITICAL: Output ONLY valid JSON. No markdown, no code blocks, no explanation. Never use em dashes in output text -- use commas or semicolons instead.`;

// ─── Main Function ───────────────────────────────────────────────────────────

export async function analyzeUapProgramIntel(subtitles: string): Promise<UapProgramIntelResult | null> {
  if (!subtitles) return null;
  const truncated = subtitles.slice(0, 50000);

  try {
    const openai = getOpenAIClient();

    // 3 passes in parallel
    const [pass1Raw, pass2Raw, pass3Raw] = await Promise.all([
      callPass(openai, PASS_1_NETWORK_PROMPT, truncated),
      callPass(openai, PASS_2_PHYSICAL_PROMPT, truncated),
      callPass(openai, PASS_3_PAPER_TRAIL_PROMPT, truncated),
    ]);

    if (!pass1Raw && !pass2Raw && !pass3Raw) {
      console.error("[uap-program-intel] All 3 passes returned null");
      return null;
    }

    // Merge results
    const merged = {
      // Pass 3 provides video-level metadata
      video_type: pass3Raw?.video_type ?? 'deep_dive_analysis',
      primary_topic: pass3Raw?.primary_topic ?? 'other',
      secondary_topics: pass3Raw?.secondary_topics ?? [],
      era_focus: pass3Raw?.era_focus ?? [],
      // Pass 1: Network
      persons: pass1Raw?.persons ?? [],
      organizations: pass1Raw?.organizations ?? [],
      programs: pass1Raw?.programs ?? [],
      // Pass 2: Physical
      locations: pass2Raw?.locations ?? [],
      technologies: pass2Raw?.technologies ?? [],
      psi_consciousness: pass2Raw?.psi_consciousness ?? [],
      // Pass 3: Paper Trail
      claims: pass3Raw?.claims ?? [],
      legislative_events: pass3Raw?.legislative_events ?? [],
      secrecy_mechanisms: pass3Raw?.secrecy_mechanisms ?? [],
      key_connections: pass3Raw?.key_connections ?? [],
      executive_summary: pass3Raw?.executive_summary ?? '',
      intelligence_value: pass3Raw?.intelligence_value ?? 5,
      primary_revelation: pass3Raw?.primary_revelation ?? '',
    };

    const parsed = UapProgramIntelSchema.safeParse(normalizeLlmOutput(merged));
    if (!parsed.success) {
      console.error("[uap-program-intel] Zod validation failed:", JSON.stringify(parsed.error.issues, null, 2));
      return null;
    }

    return parsed.data;
  } catch (error) {
    console.error("[uap-program-intel] Analysis error:", error);
    return null;
  }
}

// Helper: call a single pass
async function callPass(openai: OpenAI, systemPrompt: string, transcript: string): Promise<Record<string, any> | null> {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Extract structured intelligence from this UAP program/research transcript:\n\n${transcript}` },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });
    const content = completion.choices[0].message.content;
    if (!content) return null;
    return JSON.parse(content);
  } catch (error) {
    console.error("[uap-program-intel] Pass error:", error);
    return null;
  }
}
