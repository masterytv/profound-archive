import { serializeJsonLd } from '@/lib/json-ld';
import Link from 'next/link';
import { ArrowLeft, Network, Globe, Cpu, Waypoints, Orbit, Radio, Clock } from 'lucide-react';

/**
 * Visualize Hub — Landing page with cards for each available 3D visualization.
 * Server component, no client-side JS needed.
 * Organized into UFO/UAP and NDE sections.
 */

interface VizCard {
  id: string;
  title: string;
  description: string;
  domain: 'nde' | 'uap' | 'cross';
  href: string;
  icon: typeof Network;
  status: 'live' | 'coming-soon';
  nodeCount?: string;
}

const UAP_VISUALIZATIONS: VizCard[] = [
  {
    id: 'uap-timeline',
    title: 'UAP Timeline Helix',
    description: 'Travel through 350+ years of UAP encounters in an interactive 3D timeline. Watch the history of contact unfold from 1670 to today.',
    domain: 'uap',
    href: '/visualize/uap-timeline',
    icon: Clock,
    status: 'live',
    nodeCount: '2,241 encounters',
  },
  {
    id: 'geography',
    title: 'Global Encounter Map',
    description: 'Where do UAP encounters happen? A 3D globe with encounter hotspots across US states and 50+ countries.',
    domain: 'uap',
    href: '/visualize/geography',
    icon: Globe,
    status: 'live',
    nodeCount: '85 locations',
  },
  {
    id: 'hynek-space',
    title: 'Hynek Classification Space',
    description: 'Every UAP encounter plotted in 3D. See how evidence quality, contact depth, and transformation correlate across Hynek types.',
    domain: 'uap',
    href: '/visualize/hynek-space',
    icon: Orbit,
    status: 'live',
    nodeCount: '2,286 encounters',
  },
  {
    id: 'uap-phenomenology',
    title: 'UAP Phenomenology Network',
    description: 'Entity types, craft shapes, physical effects, and consciousness states. See how UAP phenomena co-occur across encounters.',
    domain: 'uap',
    href: '/visualize/uap-phenomenology',
    icon: Waypoints,
    status: 'live',
    nodeCount: '35+ phenomena',
  },
  {
    id: 'uap-intelligence',
    title: 'UAP Intelligence Network',
    description: 'People, organizations, and programs connected through shared video evidence. A knowledge graph of the disclosure landscape.',
    domain: 'uap',
    href: '/visualize/uap-intelligence',
    icon: Cpu,
    status: 'live',
    nodeCount: '110 entities',
  },
  {
    id: 'channel-constellation',
    title: 'Channel Constellation',
    description: 'Every UAP channel positioned by intelligence value, credibility, and encounter depth. Sized by authority, colored by grade.',
    domain: 'uap',
    href: '/visualize/channel-constellation',
    icon: Radio,
    status: 'live',
    nodeCount: '52 channels',
  },
];

const NDE_VISUALIZATIONS: VizCard[] = [
  {
    id: 'nde-elements',
    title: 'NDE Element Network',
    description: 'See how the 15 core NDE elements connect. Which experiences appear together most often? Explore the hidden structure of near-death experiences.',
    domain: 'nde',
    href: '/visualize/nde-elements',
    icon: Network,
    status: 'live',
    nodeCount: '15 elements',
  },
];

const domainColors = {
  nde: {
    accent: 'text-blue-400',
    border: 'border-blue-500/20 hover:border-blue-500/40',
    bg: 'bg-blue-500/10',
    glow: 'shadow-blue-500/10',
  },
  uap: {
    accent: 'text-green-400',
    border: 'border-green-500/20 hover:border-green-500/40',
    bg: 'bg-green-500/10',
    glow: 'shadow-green-500/10',
  },
  cross: {
    accent: 'text-purple-400',
    border: 'border-purple-500/20 hover:border-purple-500/40',
    bg: 'bg-purple-500/10',
    glow: 'shadow-purple-500/10',
  },
};

function VizCardGrid({ cards }: { cards: VizCard[] }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {cards.map((viz) => {
        const colors = domainColors[viz.domain];
        const Icon = viz.icon;
        const isLive = viz.status === 'live';

        const content = (
          <div
            className={`group relative rounded-2xl border p-6
              bg-white/[0.02] backdrop-blur-sm
              transition-all duration-300
              ${colors.border}
              ${isLive ? 'cursor-pointer hover:bg-white/[0.04] hover:shadow-xl' : 'opacity-60'}
              ${isLive ? colors.glow : ''}`}
          >
            {/* Icon + Status */}
            <div className="flex items-start justify-between mb-4">
              <div className={`w-11 h-11 rounded-xl ${colors.bg} flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${colors.accent}`} />
              </div>
              {!isLive && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full
                  bg-white/5 text-white/30 border border-white/10">
                  Coming Soon
                </span>
              )}
            </div>

            {/* Title */}
            <h3 className="text-lg font-semibold text-white/90 mb-2 
              group-hover:text-white transition-colors">
              {viz.title}
            </h3>

            {/* Description */}
            <p className="text-sm text-white/40 leading-relaxed mb-4">
              {viz.description}
            </p>

            {/* Meta */}
            <div className="flex items-center gap-3">
              {viz.nodeCount && (
                <span className="text-xs text-white/30">
                  {viz.nodeCount}
                </span>
              )}
            </div>
          </div>
        );

        if (isLive) {
          return (
            <Link key={viz.id} href={viz.href} className="block">
              {content}
            </Link>
          );
        }

        return <div key={viz.id}>{content}</div>;
      })}
    </div>
  );
}

export default function VisualizePage() {
  return (
    <div className="min-h-screen bg-[#030014]">
      {/* JSON-LD: Dataset for Google Dataset Search + AI discoverability */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd({
            "@context": "https://schema.org",
            "@type": "Dataset",
            name: "Project Profound Consciousness Research Visualizations",
            description: "Interactive 3D data visualizations of near-death experience (NDE) and UAP encounter research data, including phenomenology networks, geographic distributions, Hynek classification space, and intelligence knowledge graphs. Derived from AI analysis of 7,000+ first-person video accounts.",
            url: "https://projectprofound.org/visualize",
            license: "https://projectprofound.org/about",
            creator: {
              "@type": "ResearchOrganization",
              name: "Project Profound",
              url: "https://projectprofound.org",
            },
            keywords: [
              "near-death experiences", "NDE data", "UAP encounters",
              "UFO research data", "consciousness research",
              "Hynek classification", "phenomenology", "UAP timeline",
            ],
            distribution: [
              {
                "@type": "DataDownload",
                encodingFormat: "text/html",
                contentUrl: "https://projectprofound.org/visualize",
              },
            ],
          }),
        }}
      />
      <div className="mx-auto max-w-5xl px-4 pt-12 pb-8 sm:px-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Project Profound
        </Link>

        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-white/95 mb-3">
          3D Visualizations
        </h1>
        <p className="text-white/50 text-lg max-w-2xl leading-relaxed">
          Explore consciousness research data through interactive 3D maps. 
          Rotate, zoom, and click to discover hidden patterns and connections.
        </p>
      </div>

      {/* ─── Sections ─── */}
      <div className="mx-auto max-w-5xl px-4 pb-20 sm:px-6 space-y-14">
        {/* UFO/UAP Section */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Globe className="w-4 h-4 text-green-400" />
            </div>
            <h2 className="text-xl font-semibold text-white/90">UFO / UAP Visualizations</h2>
            <span className="text-xs text-green-400/50 bg-green-500/10 px-2 py-0.5 rounded-full">
              {UAP_VISUALIZATIONS.length} maps
            </span>
          </div>
          <VizCardGrid cards={UAP_VISUALIZATIONS} />
        </section>

        {/* NDE Section */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Network className="w-4 h-4 text-blue-400" />
            </div>
            <h2 className="text-xl font-semibold text-white/90">NDE Visualizations</h2>
            <span className="text-xs text-blue-400/50 bg-blue-500/10 px-2 py-0.5 rounded-full">
              {NDE_VISUALIZATIONS.length} map
            </span>
          </div>
          <VizCardGrid cards={NDE_VISUALIZATIONS} />
        </section>
      </div>
    </div>
  );
}
