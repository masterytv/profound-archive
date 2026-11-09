/**
 * Crisis check for shared stories. Reuses the patterns from
 * src/lib/questions/crisis-detection.ts on every paragraph of a story, and
 * lists international support resources to show the person at once.
 */
import { isCrisisTopic } from '@/lib/questions/crisis-detection';

export function storyNeedsCrisisHold(text: string | null | undefined): boolean {
    if (!text) return false;
    // isCrisisTopic is written for short strings; check paragraph by paragraph
    // so one match anywhere in a long story still triggers.
    return text
        .split(/\n+/)
        .some((line) => line.trim() && isCrisisTopic(line));
}

export const SUPPORT_RESOURCES = [
    { region: 'United States', label: '988 Suicide & Crisis Lifeline: call or text 988', href: 'https://988lifeline.org' },
    { region: 'UK & Ireland', label: 'Samaritans: call 116 123', href: 'https://www.samaritans.org' },
    { region: 'Canada', label: '9-8-8 Suicide Crisis Helpline: call or text 988', href: 'https://988.ca' },
    { region: 'Australia', label: 'Lifeline: call 13 11 14', href: 'https://www.lifeline.org.au' },
    { region: 'Anywhere', label: 'Find a free, confidential helpline in your country', href: 'https://findahelpline.com' },
] as const;
