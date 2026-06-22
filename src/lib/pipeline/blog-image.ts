/**
 * Blog Pipeline — Hero Image Generator
 *
 * Uses fal.ai FLUX.1 [dev] to generate oil paintings in the
 * Project Profound branded style — swirling directional impasto,
 * cobalt-ultramarine dominant palette, cadmium yellow accents,
 * heavy canvas texture. Each image uses a thematic subject
 * derived from the article content.
 *
 * Cost: ~$0.025/image (1024x576 landscape)
 * Requires: FAL_API_KEY in environment
 */

import { logQuota } from '@/lib/ai/usage-tracker';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HeroImageResult {
    url: string;          // Supabase Storage public URL
    prompt: string;       // the prompt used
    width: number;
    height: number;
}

// ─── Thematic Subject Mapping ─────────────────────────────────────────────────

/**
 * Map article tags and title keywords to a concrete visual subject.
 * The subject should be evocative and painterly, not literal.
 */
const SUBJECT_KEYWORDS: Array<{ keywords: string[]; subject: string }> = [
    { keywords: ['greeting', 'reunion', 'loved ones', 'deceased', 'relatives', 'family'],
      subject: 'two luminous figures reaching toward each other across a vast twilight field, one figure dissolving into golden light' },
    { keywords: ['tunnel', 'light', 'crossing', 'threshold'],
      subject: 'a narrow winding pathway through dark cypress trees opening into an explosion of warm golden light at the far end' },
    { keywords: ['life review', 'memories', 'past'],
      subject: 'a vast spiral of layered landscapes and scenes visible through swirling clouds, like looking down through time itself' },
    { keywords: ['children', 'child', 'young', 'baby'],
      subject: 'a small figure standing in a meadow of wildflowers under an immense swirling sky, fireflies rising from the grass' },
    { keywords: ['fear', 'death', 'dying', 'grief', 'loss'],
      subject: 'a solitary figure standing at the edge of a dark cliff overlooking a vast sea, with stars beginning to break through storm clouds' },
    { keywords: ['angel', 'being of light', 'divine', 'god', 'spiritual'],
      subject: 'a towering column of luminous golden-white light rising from a darkened landscape into a swirling cobalt sky' },
    { keywords: ['blind', 'sight', 'veridical', 'see', 'perception'],
      subject: 'an eye composed of swirling starlight and deep blue sky, looking out over a moonlit landscape' },
    { keywords: ['transformation', 'changed', 'after', 'purpose', 'meaning'],
      subject: 'a bare winter tree transforming into full bloom on one side, set against a dramatic twilight sky with visible stars' },
    { keywords: ['science', 'brain', 'consciousness', 'medical', 'cardiac'],
      subject: 'a human silhouette filled with constellations and swirling nebulae, standing in a dark field under an immense rotating sky' },
    { keywords: ['heaven', 'paradise', 'garden', 'beautiful', 'peace'],
      subject: 'a luminous garden with ancient olive trees, a winding stone path, and an impossible sky filled with swirling golden-blue aurora' },
    { keywords: ['water', 'drown', 'ocean', 'river'],
      subject: 'a calm dark river reflecting a sky full of swirling stars and two moons, reeds bending in gentle wind at the banks' },
    { keywords: ['pet', 'animal', 'dog', 'cat'],
      subject: 'a large faithful dog sitting on a hilltop at twilight, looking up at a sky filled with swirling luminous clouds and emerging stars' },
];

const FALLBACK_SUBJECT = 'a solitary cypress tree on a hilltop under an immense swirling night sky filled with luminous stars and a crescent moon, rolling hills below';

function pickSubject(title: string, tags: string[]): string {
    const searchText = [title, ...tags].join(' ').toLowerCase();
    for (const mapping of SUBJECT_KEYWORDS) {
        if (mapping.keywords.some(kw => searchText.includes(kw))) {
            return mapping.subject;
        }
    }
    return FALLBACK_SUBJECT;
}

// ─── Image Style Prompt ───────────────────────────────────────────────────────

/**
 * Build a branded image prompt from the article title, category, and tags.
 *
 * STYLE DNA (no artist references — this is our proprietary look):
 * - Thick directional impasto brushstrokes, each stroke individually visible
 * - Swirling, rhythmic, flowing curves throughout sky and landscape
 * - Dominant palette: cobalt blue, ultramarine blue, prussian blue
 * - Accent palette: cadmium yellow, warm amber, pale gold for light sources
 * - Deep olive green and dark teal in landscape/foliage
 * - Heavy oil paint texture on woven canvas, visible weave grain
 * - Dark foreground silhouettes against luminous, churning skies
 * - Atmospheric, emotional, slightly abstracted — not literal
 * - No photorealism, no smooth digital gradients, no sharp lines
 */
export function buildImagePrompt(title: string, category: string, tags: string[] = []): string {
    const subject = pickSubject(title, tags);

    return [
        // Technique and medium
        `Oil painting on heavy woven canvas. Thick directional impasto brushstrokes, each individual stroke clearly visible with raised paint texture.`,
        `Swirling, rhythmic, flowing curves throughout the composition. Expressive, bold, gestural brushwork.`,
        // Subject
        `Subject: ${subject}.`,
        // Color palette
        `Dominant color palette: cobalt blue, ultramarine blue, and prussian blue.`,
        `Light sources rendered in cadmium yellow, warm amber, and pale gold.`,
        `Deep olive green and dark teal in landscape and foliage elements.`,
        // Composition and mood
        `Dark foreground silhouettes contrasting against a luminous, churning sky.`,
        `Wide landscape format. Atmospheric depth. Emotional and slightly abstracted.`,
        // Negative constraints
        `No visible faces. No text, letters, words, or watermarks.`,
        `No photorealism. No smooth gradients. No sharp digital edges. No flat colors.`,
        `Pure oil painting with visible canvas weave and heavy paint buildup. Museum quality fine art.`,
    ].join(' ');
}

// ─── fal.ai API ───────────────────────────────────────────────────────────────

interface FalResponse {
    images?: Array<{ url: string; width: number; height: number }>;
    error?: string;
}

async function generateWithFal(prompt: string): Promise<{ url: string; width: number; height: number }> {
    const apiKey = process.env.FAL_API_KEY;
    if (!apiKey) throw new Error('Missing FAL_API_KEY environment variable');

    // Submit the request
    const submitRes = await fetch('https://queue.fal.run/fal-ai/flux/dev', {
        method: 'POST',
        headers: {
            'Authorization': `Key ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            prompt,
            image_size: 'landscape_16_9',  // 1024x576
            num_inference_steps: 28,
            guidance_scale: 3.5,
            num_images: 1,
            enable_safety_checker: true,
        }),
    });

    void logQuota({ provider: 'fal', operation: 'blog-image.fal', quantity: 1, status: submitRes.ok ? 'success' : 'error' });
    if (!submitRes.ok) {
        throw new Error(`fal.ai submit error ${submitRes.status}: ${await submitRes.text()}`);
    }

    const { request_id, status_url } = await submitRes.json() as { request_id: string; status_url: string };

    // Poll for completion (max 3 minutes)
    const maxAttempts = 36;
    for (let i = 0; i < maxAttempts; i++) {
        await new Promise(r => setTimeout(r, 5000)); // 5s between polls

        const pollRes = await fetch(status_url ?? `https://queue.fal.run/fal-ai/flux/dev/requests/${request_id}`, {
            headers: { 'Authorization': `Key ${apiKey}` },
        });

        if (!pollRes.ok) continue;

        const pollData = await pollRes.json() as { status: string; response_url?: string };

        if (pollData.status === 'COMPLETED' && pollData.response_url) {
            const resultRes = await fetch(pollData.response_url, {
                headers: { 'Authorization': `Key ${apiKey}` },
            });
            const result = await resultRes.json() as FalResponse;
            const img = result.images?.[0];
            if (!img) throw new Error('fal.ai returned no images');
            return img;
        }

        if (pollData.status === 'FAILED') {
            throw new Error('fal.ai generation failed');
        }
    }

    throw new Error('fal.ai timed out after 3 minutes');
}

// ─── Upload to Supabase Storage ───────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js';

async function uploadToStorage(imageUrl: string, slug: string): Promise<string> {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch the image from fal.ai's CDN
    const imageRes = await fetch(imageUrl);
    if (!imageRes.ok) throw new Error(`Failed to fetch generated image: ${imageRes.status}`);

    const imageBuffer = await imageRes.arrayBuffer();
    const fileName = `blog/${slug}-hero.webp`;

    const { error } = await supabase.storage
        .from('media')
        .upload(fileName, imageBuffer, {
            contentType: 'image/webp',
            upsert: true,                    // overwrite if regenerating
        });

    if (error) throw new Error(`Supabase Storage upload failed: ${error.message}`);

    const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(fileName);
    return publicUrl;
}

// ─── Main Function ────────────────────────────────────────────────────────────

/**
 * Generate a branded oil painting hero image for a blog article.
 * Uploads to Supabase Storage, returns the public URL.
 *
 * @param title     - The article title (used for thematic subject selection)
 * @param slug      - Article slug (used as filename in storage)
 * @param category  - Article category
 * @param tags      - Article tags (used for thematic subject selection)
 */
export async function generateHeroImage(
    title: string,
    slug: string,
    category: string,
    tags: string[] = []
): Promise<HeroImageResult> {
    const prompt = buildImagePrompt(title, category, tags);

    // Generate via fal.ai
    const generated = await generateWithFal(prompt);

    // Upload to Supabase Storage (serves from our CDN, not fal.ai's temp URL)
    const publicUrl = await uploadToStorage(generated.url, slug);

    return {
        url: publicUrl,
        prompt,
        width: generated.width,
        height: generated.height,
    };
}
