import Link from 'next/link';
import { ArrowLeft, Network, Globe, Cpu, Waypoints, Sparkles, Radio } from 'lucide-react';

/**
 * Visualize Hub — Landing page with cards for each available 3D visualization.
 * Server component, no client-side JS needed.
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

const VISUALIZATIONS: VizCard[] = [
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
    icon: Sparkles,
    status: 'live',
    nodeCount: '2,286 encounters',
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

export default function VisualizePage() {
  return (
    <div className="min-h-screen bg-[#030014]">
      {/* ─── Header ─── */}
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

      {/* ─── Cards Grid ─── */}
      <div className="mx-auto max-w-5xl px-4 pb-20 sm:px-6">
        <div className="grid gap-6 sm:grid-cols-2">
          {VISUALIZATIONS.map((viz) => {
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
                <h2 className="text-lg font-semibold text-white/90 mb-2 
                  group-hover:text-white transition-colors">
                  {viz.title}
                </h2>

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
                  <span className={`text-xs ${
                    viz.domain === 'nde' ? 'text-blue-400/60' :
                    viz.domain === 'uap' ? 'text-green-400/60' :
                    'text-purple-400/60'
                  }`}>
                    {viz.domain === 'nde' ? 'NDE' : viz.domain === 'uap' ? 'UAP' : 'Cross-Domain'}
                  </span>
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
      </div>
    </div>
  );
}
