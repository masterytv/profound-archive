/**
 * Generic OG image generator for any page.
 *
 * Usage: /api/og/page?path=/visualize/uap-timeline
 *
 * Firebase App Hosting does NOT support the file-convention `opengraph-image.tsx`.
 * This API route is the reliable alternative. Each page's metadata references
 * this route with its path, and we look up the config from a registry.
 */
import { ImageResponse } from 'next/og';
import { BrandedOgTemplate } from '@/lib/og/branded-template';
import { getNdeStats, getUapStats, formatCount } from '@/lib/og/stats';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';

type PageConfig = {
  title: string;
  subtitle: string;
  theme: 'nde' | 'uap' | 'viz';
  /** If provided, a function that returns dynamic stats. Otherwise uses static stats. */
  getStats?: () => Promise<{ value: string; label: string }[]>;
  staticStats?: { value: string; label: string }[];
  footerUrl: string;
};

/**
 * Registry of all page OG configs. Add new pages here.
 */
async function getPageConfig(path: string): Promise<PageConfig | null> {
  // Normalize path
  const p = path.replace(/\/$/, '') || '/';

  const registry: Record<string, PageConfig> = {
    '/': {
      title: 'Explore the Unexplained',
      subtitle: 'AI-Analyzed Near-Death Experiences & UAP Encounters',
      theme: 'nde',
      getStats: async () => {
        const [nde, uap] = await Promise.all([getNdeStats(), getUapStats()]);
        return [
          { value: formatCount(nde.videos), label: 'NDE Videos' },
          { value: formatCount(uap.encounters), label: 'UAP Encounters' },
          { value: formatCount(nde.questions), label: 'Questions' },
        ];
      },
      footerUrl: 'projectprofound.org',
    },

    // ── NDE Pages ───────────────────────────────────────────
    '/nde': {
      title: 'Archive of the Extraordinary',
      subtitle: 'AI-Analyzed Near-Death Experience Accounts',
      theme: 'nde',
      getStats: async () => {
        const s = await getNdeStats();
        return [
          { value: formatCount(s.videos), label: 'NDE Accounts' },
          { value: formatCount(s.channels), label: 'Channels' },
          { value: '3', label: 'Research Scales' },
        ];
      },
      footerUrl: 'projectprofound.org/nde',
    },
    '/experience': {
      title: 'NDE Accounts',
      subtitle: 'Browse Thousands of First-Person Accounts',
      theme: 'nde',
      getStats: async () => {
        const s = await getNdeStats();
        return [
          { value: formatCount(s.videos), label: 'Accounts' },
          { value: formatCount(s.channels), label: 'Channels' },
        ];
      },
      footerUrl: 'projectprofound.org/experience',
    },
    '/experiencers': {
      title: 'NDE Experiencers',
      subtitle: 'Profiled with Research-Backed Scores',
      theme: 'nde',
      staticStats: [
        { value: '3', label: 'Research Scales' },
        { value: 'AI', label: 'Analyzed' },
      ],
      footerUrl: 'projectprofound.org/experiencers',
    },
    '/channels': {
      title: 'NDE Channels',
      subtitle: 'YouTube Channels Sharing Near-Death Experiences',
      theme: 'nde',
      getStats: async () => {
        const s = await getNdeStats();
        return [
          { value: formatCount(s.channels), label: 'Channels' },
          { value: formatCount(s.videos), label: 'NDE Accounts' },
        ];
      },
      footerUrl: 'projectprofound.org/channels',
    },
    '/compass': {
      title: 'NDE Compass',
      subtitle: 'Discover Your Connection to the Research',
      theme: 'nde',
      staticStats: [
        { value: 'AI', label: 'Guided' },
        { value: '3', label: 'Research Scales' },
      ],
      footerUrl: 'projectprofound.org/compass',
    },
    '/questions': {
      title: 'Questions About NDEs',
      subtitle: 'AI-Synthesized Answers from Real Accounts',
      theme: 'nde',
      getStats: async () => {
        const s = await getNdeStats();
        return [
          { value: formatCount(s.questions), label: 'Questions' },
          { value: formatCount(s.videos), label: 'NDE Accounts' },
        ];
      },
      footerUrl: 'projectprofound.org/questions',
    },
    '/search3': {
      title: 'Search NDE Accounts',
      subtitle: 'Semantic Search Across Thousands of Testimonies',
      theme: 'nde',
      getStats: async () => {
        const s = await getNdeStats();
        return [
          { value: formatCount(s.videos), label: 'Accounts' },
          { value: 'AI', label: 'Powered' },
        ];
      },
      footerUrl: 'projectprofound.org/search3',
    },
    '/explore': {
      title: 'Explore NDEs',
      subtitle: 'Browse and Discover Near-Death Experiences',
      theme: 'nde',
      getStats: async () => {
        const s = await getNdeStats();
        return [
          { value: formatCount(s.videos), label: 'Accounts' },
          { value: formatCount(s.channels), label: 'Channels' },
        ];
      },
      footerUrl: 'projectprofound.org/explore',
    },
    '/blog': {
      title: 'NDE Research Blog',
      subtitle: 'Articles and Analysis on Near-Death Experiences',
      theme: 'nde',
      staticStats: [
        { value: 'Research', label: 'Articles' },
        { value: 'AI', label: 'Analyzed' },
      ],
      footerUrl: 'projectprofound.org/blog',
    },

    // ── UAP Pages ───────────────────────────────────────────
    '/uap': {
      title: 'UAP Research Hub',
      subtitle: 'AI-Analyzed UFO & UAP Contact Encounters',
      theme: 'uap',
      getStats: async () => {
        const s = await getUapStats();
        return [
          { value: formatCount(s.encounters), label: 'Encounters' },
          { value: formatCount(s.channels), label: 'Channels' },
          { value: '7', label: 'Visualizations' },
        ];
      },
      footerUrl: 'projectprofound.org/uap',
    },
    '/uap/video-explore': {
      title: 'Explore UAP Encounters',
      subtitle: 'AI-Analyzed from YouTube Channels',
      theme: 'uap',
      getStats: async () => {
        const s = await getUapStats();
        return [
          { value: formatCount(s.encounters), label: 'Encounters' },
          { value: formatCount(s.channels), label: 'Channels' },
          { value: '7', label: 'Visualizations' },
        ];
      },
      footerUrl: 'projectprofound.org/uap/video-explore',
    },
    '/uap/channels': {
      title: 'UAP Channels',
      subtitle: 'YouTube Channels Covering UFO & UAP',
      theme: 'uap',
      getStats: async () => {
        const s = await getUapStats();
        return [
          { value: formatCount(s.channels), label: 'Channels' },
          { value: formatCount(s.videos), label: 'Videos' },
        ];
      },
      footerUrl: 'projectprofound.org/uap/channels',
    },
    '/uap/blog': { title: 'UAP Research Blog', subtitle: 'Articles on UFO & UAP Phenomena', theme: 'uap', staticStats: [{ value: 'Research', label: 'Articles' }], footerUrl: 'projectprofound.org/uap/blog' },
    '/uap/search': { title: 'Search UAP Videos', subtitle: 'Semantic Search Across UAP Testimonies', theme: 'uap', staticStats: [{ value: 'AI', label: 'Powered' }], footerUrl: 'projectprofound.org/uap/search' },
    '/uap/events': { title: 'UAP Events', subtitle: 'Notable UFO & UAP Events', theme: 'uap', staticStats: [{ value: 'Timeline', label: 'Events' }], footerUrl: 'projectprofound.org/uap/events' },
    '/uap/experiencer': { title: 'UAP Experiencers', subtitle: 'Contactee Profiles with Evidence Scores', theme: 'uap', staticStats: [{ value: 'AI', label: 'Scored' }], footerUrl: 'projectprofound.org/uap/experiencer' },
    '/uap/persons': { title: 'Persons of Interest', subtitle: 'Key Figures in UAP Research', theme: 'uap', staticStats: [{ value: 'Profiles', label: 'Indexed' }], footerUrl: 'projectprofound.org/uap/persons' },
    '/uap/organizations': { title: 'UAP Organizations', subtitle: 'Groups Involved in UFO Research & Disclosure', theme: 'uap', staticStats: [{ value: 'Orgs', label: 'Tracked' }], footerUrl: 'projectprofound.org/uap/organizations' },
    '/uap/programs': { title: 'UAP Programs', subtitle: 'Government & Military UAP Programs', theme: 'uap', staticStats: [{ value: 'Programs', label: 'Documented' }], footerUrl: 'projectprofound.org/uap/programs' },
    '/uap/intelligence': { title: 'Intelligence Dashboard', subtitle: 'Live Analytics & Pattern Detection', theme: 'uap', staticStats: [{ value: 'Live', label: 'Analytics' }], footerUrl: 'projectprofound.org/uap/intelligence' },
    '/uap/methodology': { title: 'UAP Methodology', subtitle: 'How We Analyze & Score Encounters', theme: 'uap', staticStats: [{ value: '4', label: 'Scoring Systems' }], footerUrl: 'projectprofound.org/uap/methodology' },
    '/uap/chat': { title: 'UAP Research Assistant', subtitle: 'AI-Powered Conversational Search', theme: 'uap', staticStats: [{ value: 'AI', label: 'Assistant' }], footerUrl: 'projectprofound.org/uap/chat' },

    // ── Visualization Pages ──────────────────────────────────
    '/visualize': {
      title: 'Data Visualizations',
      subtitle: 'Interactive 3D Exploration of NDE & UAP Data',
      theme: 'viz',
      staticStats: [
        { value: '7', label: 'Visualizations' },
        { value: '3D', label: 'Interactive' },
      ],
      footerUrl: 'projectprofound.org/visualize',
    },
    '/visualize/uap-timeline': {
      title: 'Timeline Helix',
      subtitle: '350 Years of UFO Encounters in 3D',
      theme: 'viz',
      getStats: async () => {
        const s = await getUapStats();
        return [
          { value: formatCount(s.encounters), label: 'Encounters' },
          { value: '1670–2026', label: 'Time Span' },
          { value: '3D', label: 'Interactive' },
        ];
      },
      footerUrl: 'projectprofound.org/visualize/uap-timeline',
    },
    '/visualize/channel-constellation': {
      title: 'Channel Constellation',
      subtitle: '3D Star Map of UAP YouTube Channels',
      theme: 'viz',
      getStats: async () => {
        const s = await getUapStats();
        return [{ value: formatCount(s.channels), label: 'Channels' }, { value: '3D', label: 'Interactive' }];
      },
      footerUrl: 'projectprofound.org/visualize/channel-constellation',
    },
    '/visualize/geography': {
      title: 'UAP Geography',
      subtitle: '3D Globe of Encounter Locations Worldwide',
      theme: 'viz',
      getStats: async () => {
        const s = await getUapStats();
        return [{ value: formatCount(s.encounters), label: 'Encounters' }, { value: '3D', label: 'Globe' }];
      },
      footerUrl: 'projectprofound.org/visualize/geography',
    },
    '/visualize/hynek-space': {
      title: 'Hynek Classification Space',
      subtitle: '3D Map of UAP Encounter Types',
      theme: 'viz',
      getStats: async () => {
        const s = await getUapStats();
        return [{ value: formatCount(s.encounters), label: 'Encounters' }, { value: '6', label: 'Hynek Types' }, { value: '3D', label: 'Interactive' }];
      },
      footerUrl: 'projectprofound.org/visualize/hynek-space',
    },
    '/visualize/nde-elements': {
      title: 'NDE Core Elements',
      subtitle: 'Visualize Common Patterns Across Accounts',
      theme: 'viz',
      getStats: async () => {
        const s = await getNdeStats();
        return [{ value: formatCount(s.videos), label: 'Accounts' }, { value: '3D', label: 'Interactive' }];
      },
      footerUrl: 'projectprofound.org/visualize/nde-elements',
    },
    '/visualize/uap-intelligence': {
      title: 'UAP Intelligence Network',
      subtitle: '3D Map of Entity Relationships & Connections',
      theme: 'viz',
      getStats: async () => {
        const s = await getUapStats();
        return [{ value: formatCount(s.encounters), label: 'Encounters' }, { value: '3D', label: 'Network' }];
      },
      footerUrl: 'projectprofound.org/visualize/uap-intelligence',
    },
    '/visualize/uap-phenomenology': {
      title: 'UAP Phenomenology',
      subtitle: '3D Visualization of Encounter Characteristics',
      theme: 'viz',
      getStats: async () => {
        const s = await getUapStats();
        return [{ value: formatCount(s.encounters), label: 'Encounters' }, { value: '3D', label: 'Interactive' }];
      },
      footerUrl: 'projectprofound.org/visualize/uap-phenomenology',
    },

    // ── Cross-Domain ─────────────────────────────────────────
    '/research/cross-domain': {
      title: 'Cross-Domain Research',
      subtitle: 'Where NDE & UAP Phenomena Overlap',
      theme: 'viz',
      getStats: async () => {
        const [nde, uap] = await Promise.all([getNdeStats(), getUapStats()]);
        return [
          { value: formatCount(nde.videos), label: 'NDE Accounts' },
          { value: formatCount(uap.encounters), label: 'UAP Encounters' },
        ];
      },
      footerUrl: 'projectprofound.org/research/cross-domain',
    },
  };

  return registry[p] ?? null;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const pathParam = searchParams.get('path') || '/';

  const config = await getPageConfig(pathParam);
  if (!config) {
    return new Response('Unknown page', { status: 404 });
  }

  const stats = config.getStats
    ? await config.getStats()
    : config.staticStats ?? [];

  // Convert local logo to base64 data URL so Satori doesn't need to fetch it over HTTP
  let logoBase64: string | undefined = undefined;
  try {
    const logoPath = path.join(process.cwd(), 'public', 'logo-new-light.png');
    const logoBuffer = fs.readFileSync(logoPath);
    logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
  } catch (err) {
    console.error('[OG Page Route] Failed to read logo file:', err);
  }

  return new ImageResponse(
    (
      <BrandedOgTemplate
        title={config.title}
        subtitle={config.subtitle}
        theme={config.theme}
        stats={stats}
        footerUrl={config.footerUrl}
        logoSrc={logoBase64}
      />
    ),
    { width: 1200, height: 630 },
  );
}
