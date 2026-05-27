/**
 * Shared branded OG image template for Project Profound.
 *
 * Renders a 1200×630 PNG via Satori (next/og ImageResponse).
 * All styles must be inline objects — Satori doesn't support
 * Tailwind, CSS classes, or external stylesheets.
 *
 * Design priorities (per BRAND.md):
 * - Dark slate background (#0f172a) — stands out in light feeds
 * - Domain-aware accent (green=UAP, blue=NDE, indigo=Viz)
 * - Large serif headline (Crimson Pro) — readable at 280px width
 * - Stats badges with glassmorphism
 * - Branded footer with logo + URL
 */

import React from 'react';

// ─── Theme Definitions ──────────────────────────────────────────────────────

export type OgTheme = 'nde' | 'uap' | 'viz';

const themes: Record<OgTheme, {
  accent: string;
  accentGradient: string;
  accentLight: string;
  pillText: string;
  pillLabel: string;
}> = {
  nde: {
    accent: '#2563EB',
    accentGradient: 'linear-gradient(135deg, #2563EB, #3B82F6)',
    accentLight: 'rgba(37, 99, 235, 0.15)',
    pillText: '#93C5FD',
    pillLabel: 'Near-Death Experiences',
  },
  uap: {
    accent: '#16a34a',
    accentGradient: 'linear-gradient(135deg, #16a34a, #22c55e)',
    accentLight: 'rgba(22, 163, 74, 0.15)',
    pillText: '#86EFAC',
    pillLabel: 'UFO & UAP',
  },
  viz: {
    accent: '#6366f1',
    accentGradient: 'linear-gradient(135deg, #6366f1, #818cf8)',
    accentLight: 'rgba(99, 102, 241, 0.15)',
    pillText: '#A5B4FC',
    pillLabel: '3D Visualization',
  },
};

// ─── Types ──────────────────────────────────────────────────────────────────

export interface OgTemplateProps {
  /** Main headline — 1-2 lines, kept short for readability at thumbnail size */
  title: string;
  /** Supporting text below headline */
  subtitle?: string;
  /** Optional stat badges (max 4 for space) */
  stats?: Array<{ value: string; label: string }>;
  /** Domain theme — controls accent color and pill label */
  theme?: OgTheme;
  /** Override the footer URL text */
  footerUrl?: string;
  /**
   * Absolute URL to the white wordmark logo PNG.
   * In production: https://projectprofound.org/logo-new-light.png
   * Must be absolute because Satori fetches images at render time.
   */
  logoSrc?: string;
}

// ─── Template Component ─────────────────────────────────────────────────────

/**
 * Branded OG image JSX — meant to be wrapped in ImageResponse.
 * All text sized for readability at WhatsApp thumbnail (~280px display width).
 */
/**
 * Resolve the base URL for asset fetching in OG images.
 * Satori needs absolute URLs — this mirrors the pattern in fetchQuestionData.
 */
function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3001';
}

export function BrandedOgTemplate({
  title,
  subtitle,
  stats,
  theme = 'nde',
  footerUrl = 'projectprofound.org',
  logoSrc,
}: OgTemplateProps) {
  const resolvedLogoSrc = logoSrc ?? `${getBaseUrl()}/logo-new-light.png`;
  const t = themes[theme];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        backgroundColor: '#0f172a',
        fontFamily: 'Inter, system-ui, sans-serif',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* ── Accent gradient bar (top) ── */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 8,
          background: t.accentGradient,
        }}
      />

      {/* ── Decorative background glow ── */}
      <div
        style={{
          position: 'absolute',
          top: -100,
          right: -100,
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${t.accent}15 0%, transparent 70%)`,
        }}
      />

      {/* ── Content area ── */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          padding: '44px 56px 0',
          flex: 1,
        }}
      >
        {/* ── Brand Wordmark Logo ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '28px',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={resolvedLogoSrc}
            alt="Project Profound"
            width={250}
            height={59}
            style={{
              objectFit: 'contain',
            }}
          />
        </div>

        {/* ── Headline ── */}
        <div
          style={{
            fontSize: 56,
            fontWeight: 700,
            color: '#f8fafc',
            lineHeight: 1.1,
            fontFamily: 'Crimson Pro, Georgia, serif',
            maxWidth: '90%',
            marginBottom: subtitle ? '12px' : '24px',
          }}
        >
          {title}
        </div>

        {/* ── Subtitle ── */}
        {subtitle && (
          <div
            style={{
              fontSize: 26,
              color: t.pillText,
              lineHeight: 1.35,
              maxWidth: '85%',
              marginBottom: '28px',
            }}
          >
            {subtitle}
          </div>
        )}

        {/* ── Stat Badges ── */}
        {stats && stats.length > 0 && (
          <div
            style={{
              display: 'flex',
              gap: '14px',
              marginTop: '8px',
            }}
          >
            {stats.slice(0, 4).map((stat) => (
              <div
                key={stat.label}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '14px 20px',
                  borderRadius: 14,
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  minWidth: 120,
                }}
              >
                <div
                  style={{
                    fontSize: 26,
                    fontWeight: 700,
                    color: '#f8fafc',
                    lineHeight: 1,
                  }}
                >
                  {stat.value}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: '#64748b',
                    marginTop: 6,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}
                >
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 56px 32px',
          marginTop: 'auto',
        }}
      >
        <div
          style={{
            fontSize: 16,
            color: '#475569',
          }}
        >
          {footerUrl}
        </div>

        {/* Domain pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '6px 16px',
            borderRadius: 20,
            background: t.accentLight,
            border: `1px solid ${t.accent}40`,
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: t.pillText,
            }}
          >
            {t.pillLabel}
          </div>
        </div>
      </div>
    </div>
  );
}
