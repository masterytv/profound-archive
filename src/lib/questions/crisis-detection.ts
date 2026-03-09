/**
 * crisis-detection.ts
 *
 * Detects whether a question or slug is crisis-related (suicide, self-harm, etc.)
 * so that the question page can display a 988 Lifeline safety banner.
 *
 * Intentionally conservative — better to show the banner one extra time than to miss
 * someone in genuine distress.
 */

const CRISIS_PATTERNS: RegExp[] = [
    /\bsuicid/i,           // suicide, suicidal, suicidality
    /\bself[- ]?harm/i,    // self-harm, self harm, selfharm
    /\bself[- ]?injur/i,   // self-injury, self injure
    /\bkill\s+(my|them|him|her|your)?self/i,  // kill myself, kill yourself
    /\bkilling\s+my(self)?/i,
    /\bgoing\s+to\s+kill\s+my/i,             // going to kill myself
    /\bwant(ing)?\s+to\s+die\b/i,            // wanting to die
    /\bend\s+(my|their)\s+life/i,            // end my life
    /\btake[sn]?\s+(my|their|your|own)\s+(own\s+)?life/i, // takes their own life, take my life
    /\bhurt(ing)?\s+my(self)?/i,             // hurting myself
    /\bcut(ting)?\s+my(self)?/i,             // cutting myself
    /\boverdos/i,                             // overdose, overdosing
];

/**
 * Returns true if the question text or slug suggests a crisis topic.
 * Works with both human-readable question text and URL slugs.
 */
export function isCrisisTopic(questionOrSlug: string): boolean {
    // Normalise slug separators to spaces for pattern matching
    const normalised = questionOrSlug.replace(/-/g, ' ');
    return CRISIS_PATTERNS.some(re => re.test(normalised));
}
