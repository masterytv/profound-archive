/**
 * GET /api/og/experiencer?slug=...
 *
 * The preview card for an experiencer's profile (1200 × 630 PNG), drawn by src/lib/og/experiencer-card.tsx. It runs on
 * Node so it can read the logo from public/ and fetch the fonts and the video still once each; the answer is cached by
 * the CDN, since Facebook gives up on a preview image that is slow to come back.
 */

import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { cardQuote, ExperiencerCard, OG_SIZE, youtubeStills } from '@/lib/og/experiencer-card';

export const runtime = 'nodejs';

const CACHE = 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400';

function buildClient() {
    return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}

type Font = { name: string; data: ArrayBuffer; weight: 500 | 600 | 700; style: 'normal' };

/** The site's fonts (Crimson Pro and Inter) from Google Fonts as TTF; asked without a browser's name, Google sends TTF. */
let fonts: Promise<Font[]> | null = null;
function loadFonts(): Promise<Font[]> {
    const one = async (family: string, weight: Font['weight']): Promise<Font> => {
        const css = await fetch(`https://fonts.googleapis.com/css2?family=${family.replace(/ /g, '+')}:wght@${weight}`, { signal: AbortSignal.timeout(8000) }).then((r) => r.text());
        const url = /src:\s*url\(([^)]+)\)\s*format\('(?:truetype|opentype)'\)/.exec(css)?.[1];
        if (!url) throw new Error(`No TTF for ${family}`);
        const data = await fetch(url, { signal: AbortSignal.timeout(8000) }).then((r) => r.arrayBuffer());
        return { name: family, data, weight, style: 'normal' };
    };
    fonts ??= Promise.all([one('Crimson Pro', 600), one('Inter', 500), one('Inter', 700)]).catch((e) => {
        console.warn('[og/experiencer] fonts not loaded, using the default:', e instanceof Error ? e.message : e);
        fonts = null;
        return [];
    });
    return fonts;
}

let logo: string | null | undefined;
function logoSrc(): string | null {
    if (logo !== undefined) return logo;
    try {
        logo = `data:image/png;base64,${fs.readFileSync(path.join(process.cwd(), 'public', 'logo-new-light.png')).toString('base64')}`;
    } catch (e) {
        console.error('[og/experiencer] logo not read:', e);
        logo = null;
    }
    return logo;
}

/** The video still, embedded: the largest YouTube keeps, else the one on the profile. */
async function photo(url: string | null): Promise<{ src: string; letterboxed: boolean } | null> {
    for (const candidate of youtubeStills(url)) {
        try {
            const res = await fetch(candidate, { signal: AbortSignal.timeout(6000) });
            const type = res.headers.get('content-type') ?? '';
            if (!res.ok || !/^image\/(jpeg|png)/.test(type)) continue;
            const bytes = Buffer.from(await res.arrayBuffer());
            return { src: `data:${type.split(';')[0]};base64,${bytes.toString('base64')}`, letterboxed: /\/(hq|mq|sd)default\.jpg/.test(candidate) };
        } catch {
            // the next, smaller still
        }
    }
    return null;
}

export async function GET(request: NextRequest) {
    const slug = request.nextUrl.searchParams.get('slug');
    if (!slug) {
        return new Response('Missing slug', { status: 400 });
    }

    const supabase = buildClient();
    const { data: profile } = await supabase
        .from('experiencer_profiles')
        .select('full_name, highlight_quote, photo_url')
        .eq('slug', slug)
        .not('published_at', 'is', null)
        .single();

    if (!profile) {
        return new Response('Profile not found', { status: 404 });
    }

    const [loaded, still] = await Promise.all([loadFonts(), photo(profile.photo_url)]);
    return new ImageResponse(
        <ExperiencerCard name={profile.full_name} quote={cardQuote(profile.highlight_quote)} logoSrc={logoSrc()} photo={still} />,
        { ...OG_SIZE, ...(loaded.length ? { fonts: loaded } : {}), headers: { 'Cache-Control': CACHE } },
    );
}
