/**
 * GET /api/og/experiencer?slug=...
 * 
 * Dynamic Open Graph image for experiencer profiles.
 * Renders a beautiful 1200×630 card for social sharing.
 */

import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

function buildClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
}

export async function GET(request: NextRequest) {
    const slug = request.nextUrl.searchParams.get('slug');
    if (!slug) {
        return new Response('Missing slug', { status: 400 });
    }

    const supabase = buildClient();
    const { data: profile } = await supabase
        .from('experiencer_profiles')
        .select('full_name, highlight_quote, contribution_label, highlight_elements, photo_url')
        .eq('slug', slug)
        .not('published_at', 'is', null)
        .single();

    if (!profile) {
        return new Response('Profile not found', { status: 404 });
    }

    const elementCount = Array.isArray(profile.highlight_elements) ? profile.highlight_elements.length : 0;
    const quote = profile.highlight_quote?.slice(0, 120) || '';

    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0F172A 100%)',
                    fontFamily: 'Georgia, serif',
                    padding: '60px',
                }}
            >
                {/* Top badge */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '24px',
                        padding: '8px 20px',
                        background: 'rgba(245, 158, 11, 0.15)',
                        borderRadius: '999px',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                    }}
                >
                    <span style={{ fontSize: '14px' }}>❤</span>
                    <span style={{ fontSize: '14px', color: '#FCD34D', fontWeight: 700, letterSpacing: '0.05em' }}>
                        {(profile.contribution_label || 'Courageous Storyteller').toUpperCase()}
                    </span>
                </div>

                {/* Name */}
                <h1
                    style={{
                        fontSize: '56px',
                        fontWeight: 700,
                        color: '#F8FAFC',
                        margin: '0 0 20px 0',
                        textAlign: 'center',
                        lineHeight: 1.1,
                    }}
                >
                    {profile.full_name}
                </h1>

                {/* Quote */}
                {quote && (
                    <p
                        style={{
                            fontSize: '22px',
                            color: '#94A3B8',
                            fontStyle: 'italic',
                            textAlign: 'center',
                            maxWidth: '800px',
                            lineHeight: 1.4,
                            margin: '0 0 30px 0',
                        }}
                    >
                        &ldquo;{quote}{quote.length >= 120 ? '…' : ''}&rdquo;
                    </p>
                )}

                {/* Elements count */}
                {elementCount > 0 && (
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            color: '#64748B',
                            fontSize: '16px',
                        }}
                    >
                        <span>✦</span>
                        <span>{elementCount} of 15 NDE elements described</span>
                    </div>
                )}

                {/* Branding */}
                <div
                    style={{
                        position: 'absolute',
                        bottom: '30px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        color: '#475569',
                        fontSize: '16px',
                    }}
                >
                    <span style={{ fontWeight: 700 }}>Project Profound</span>
                    <span>·</span>
                    <span>projectprofound.org</span>
                </div>
            </div>
        ),
        {
            width: 1200,
            height: 630,
        },
    );
}
