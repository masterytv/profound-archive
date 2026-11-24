/**
 * Caption language handling — shared by the caption providers, the intake
 * pipelines and the read-only audit script (scripts/report-non-english-transcripts.ts).
 *
 * Why this exists (2026-11-20): YouTube now auto-dubs many videos, so a video
 * can carry caption tracks like ['ar','nl','en','fr',…]. Supadata, called with
 * no `lang`, returns the FIRST track — Arabic — and the pipeline logged
 * "484 segments (ar, auto)" and carried on, building every downstream field
 * (cleaned text, embeddings, analysis, rvnde score) from the Arabic. 41
 * nde_vids rows were damaged that way.
 *
 * Rules enforced by checkCaptionLanguage():
 *   - English transcript                       → accept.
 *   - Non-English but English IS available     → reject (wrong_language, retryable).
 *   - Non-English and English is NOT available → accept, but flag nonEnglish
 *                                                 (a genuinely non-English video).
 *   - Non-English and availability unknown     → reject (we can't prove there
 *                                                 is no English track, so don't
 *                                                 save a possibly-wrong transcript).
 * A provider's language label is also cross-checked against the text itself:
 * a transcript labelled "en" that is mostly Arabic/Cyrillic/CJK/… script is
 * treated as non-English.
 */

import type { CaptionFetchResult, CaptionSegment } from './subtitles';

export const PREFERRED_CAPTION_LANG = 'en';

/** True for "en", "en-US", "en_GB", "English", "English (auto-generated)", … */
export function isEnglishLang(lang: string | null | undefined): boolean {
    if (!lang) return false;
    const l = lang.trim().toLowerCase();
    return l === 'en' || /^en[-_]/.test(l) || l === 'english' || l.startsWith('english ') || l.startsWith('english(');
}

// ─── Text-based language detection ───────────────────────────────────────────

export type ScriptName =
    | 'latin' | 'arabic' | 'cyrillic' | 'devanagari' | 'cjk' | 'hangul'
    | 'hebrew' | 'greek' | 'thai' | 'other';

const SCRIPT_RANGES: Array<[ScriptName, RegExp]> = [
    ['latin', /[A-Za-zÀ-ɏ]/],
    ['arabic', /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/],
    ['cyrillic', /[Ѐ-ӿ]/],
    ['devanagari', /[ऀ-ॿ]/],
    ['cjk', /[぀-ヿ㐀-䶿一-鿿]/],
    ['hangul', /[가-힯ᄀ-ᇿ]/],
    ['hebrew', /[֐-׿]/],
    ['greek', /[Ͱ-Ͽ]/],
    ['thai', /[฀-๿]/],
];

/** Count letters per script. Non-letters (digits, punctuation, spaces) are ignored. */
export function scriptCounts(text: string): Record<ScriptName, number> {
    const counts = Object.fromEntries(
        [...SCRIPT_RANGES.map(([n]) => n), 'other'].map(n => [n, 0]),
    ) as Record<ScriptName, number>;
    for (const ch of text) {
        if (!/\p{L}/u.test(ch)) continue;
        const hit = SCRIPT_RANGES.find(([, re]) => re.test(ch));
        counts[hit ? hit[0] : 'other']++;
    }
    return counts;
}

/** The script that makes up most of the letters, plus its share (0–1). */
export function dominantScript(text: string): { script: ScriptName; share: number; letters: number } {
    const counts = scriptCounts(text);
    const letters = Object.values(counts).reduce((a, b) => a + b, 0);
    if (letters === 0) return { script: 'other', share: 0, letters: 0 };
    const [script, n] = (Object.entries(counts) as Array<[ScriptName, number]>)
        .sort((a, b) => b[1] - a[1])[0];
    return { script, share: n / letters, letters };
}

// Very common function words. Used only to tell Latin-script languages apart.
const STOPWORDS: Record<string, string[]> = {
    en: ['the', 'and', 'that', 'was', 'you', 'it', 'is', 'of', 'to', 'in', 'i', 'my', 'this', 'with', 'what', 'have', 'they', 'just', 'like', 'so'],
    es: ['que', 'el', 'la', 'de', 'y', 'en', 'los', 'por', 'una', 'es', 'lo', 'pero', 'como', 'muy', 'yo', 'mi', 'eso', 'del', 'las', 'fue'],
    pt: ['que', 'não', 'de', 'e', 'uma', 'um', 'para', 'com', 'eu', 'meu', 'isso', 'foi', 'muito', 'mas', 'como', 'você', 'ele', 'ela', 'do', 'da'],
    fr: ['le', 'la', 'les', 'et', 'je', 'que', 'est', 'une', 'pas', 'vous', 'il', 'des', 'mais', 'avec', 'pour', 'dans', 'ce', 'qui', 'mon', 'était'],
    de: ['und', 'die', 'der', 'das', 'ich', 'ist', 'nicht', 'ein', 'eine', 'zu', 'mit', 'es', 'auf', 'war', 'sie', 'mein', 'auch', 'dass', 'wir', 'aber'],
    nl: ['de', 'het', 'een', 'en', 'ik', 'niet', 'dat', 'van', 'is', 'je', 'was', 'wat', 'op', 'mijn', 'maar', 'met', 'voor', 'zijn', 'ze', 'er'],
    it: ['che', 'il', 'di', 'e', 'la', 'non', 'un', 'una', 'per', 'io', 'mi', 'era', 'sono', 'ma', 'con', 'del', 'della', 'questo', 'gli', 'anche'],
};

const SCRIPT_TO_LANG: Partial<Record<ScriptName, string>> = {
    arabic: 'ar', cyrillic: 'ru', devanagari: 'hi', hangul: 'ko', hebrew: 'he', greek: 'el', thai: 'th', cjk: 'ja/zh',
};

export interface LanguageGuess {
    /** ISO-ish code: 'en', 'es', …; for non-Latin scripts the script's main language (ar, ru, hi, ko, ja/zh…). */
    lang: string;
    script: ScriptName;
    /** 0–1. Script share for non-Latin; stopword margin for Latin. */
    confidence: number;
    /** True when the text is clearly English (Latin script and English stopwords dominate). */
    english: boolean;
    letters: number;
}

/**
 * Cheap, dependency-free language guess from transcript text. Good enough to
 * separate English from Arabic/Hindi/Russian/… (by script) and from the
 * common Latin-script dub languages (es/pt/fr/de/nl/it, by stopwords).
 * Pass a sample of a few thousand characters — more adds nothing.
 */
export function guessLanguage(text: string): LanguageGuess {
    const sample = text.slice(0, 20_000);
    const { script, share, letters } = dominantScript(sample);
    if (letters < 40) return { lang: 'unknown', script, confidence: 0, english: false, letters };
    if (script !== 'latin') {
        return { lang: SCRIPT_TO_LANG[script] ?? script, script, confidence: share, english: false, letters };
    }
    const words = sample.toLowerCase().match(/\p{L}+/gu) ?? [];
    const total = Math.max(words.length, 1);
    const scores = Object.entries(STOPWORDS).map(([lang, list]) => {
        const set = new Set(list);
        let hits = 0;
        for (const w of words) if (set.has(w)) hits++;
        return { lang, rate: hits / total };
    }).sort((a, b) => b.rate - a.rate);
    const best = scores[0];
    const second = scores[1];
    const margin = best.rate === 0 ? 0 : (best.rate - second.rate) / best.rate;
    return { lang: best.rate === 0 ? 'unknown' : best.lang, script, confidence: margin, english: best.lang === 'en' && best.rate > 0.05, letters };
}

/** Convenience: guess from caption segments. */
export function guessSegmentsLanguage(segments: CaptionSegment[]): LanguageGuess {
    let text = '';
    for (const s of segments) {
        text += s.text + ' ';
        if (text.length > 20_000) break;
    }
    return guessLanguage(text);
}

// ─── The guard ───────────────────────────────────────────────────────────────

/**
 * Apply the English-first language rules to a successful caption fetch.
 * Failures pass through untouched. Pure — no I/O — so it is unit-tested directly.
 */
export function checkCaptionLanguage(result: CaptionFetchResult, provider: string): CaptionFetchResult {
    if (!result.success || !result.data) return result;
    const data = result.data;
    const labelled = data.language;

    // Cross-check the label against the text: catches a provider that says
    // "en" (or defaults to "en") while handing back Arabic/Hindi/… text.
    const guess = guessSegmentsLanguage(data.segments);
    const textIsOtherScript = guess.script !== 'latin' && guess.letters >= 40 && guess.confidence >= 0.5;
    const effectiveLang = isEnglishLang(labelled) && textIsOtherScript ? guess.lang : labelled;
    const labelMismatch = effectiveLang !== labelled;

    if (isEnglishLang(effectiveLang)) return result;

    const avail = data.availableLangs;
    const availStr = avail && avail.length ? avail.join(',') : 'unknown';
    const what = labelMismatch
        ? `labelled '${labelled}' but text is ${guess.script} script (~${guess.lang})`
        : `'${effectiveLang}'`;

    if (avail && avail.length > 0 && !avail.some(isEnglishLang)) {
        // Genuinely non-English video: keep it, but flag it loudly.
        return {
            ...result,
            data: {
                ...data,
                language: effectiveLang,
                nonEnglish: true,
                languageNote: `Non-English transcript ${what} from ${provider}: no English track exists (available: ${availStr}). Saved anyway — flag for review.`,
            },
        };
    }

    const why = avail && avail.length > 0
        ? `English is available (available: ${availStr})`
        : `provider gave no list of available languages, so English can't be ruled out`;
    return {
        success: false,
        retryable: true,
        failureReason: 'wrong_language',
        message: `${provider} returned a non-English transcript ${what} although ${why}. Not saved.`,
    };
}
