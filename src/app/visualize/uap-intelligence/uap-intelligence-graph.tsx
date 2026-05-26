'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ForceGraph3D, { type ForceGraphMethods } from 'react-force-graph-3d';
import * as THREE from 'three';
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { VizPageShell } from '@/components/viz/VizPageShell';
import { VizLegend, type LegendItem } from '@/components/viz/VizLegend';
import { VizNodeTooltip, type TooltipData } from '@/components/viz/VizNodeTooltip';
import { useIsMobile } from '@/components/viz/hooks/useIsMobile';
import { useReducedMotion } from '@/components/viz/hooks/useReducedMotion';

// ─── Types ──────────────────────────────────────────────────────────────────

interface IntelNode {
  id: string;
  label: string;
  nodeType: string;    // 'person' | 'org' | 'program'
  subType: string;     // role / org_type / program_type
  mentions: number;
  videoCount: number;
  category: string;    // display category for color/legend
  color: string;
  val?: number;
  x?: number;
  y?: number;
  z?: number;
}

interface IntelEdge {
  source: string | IntelNode;
  target: string | IntelNode;
  sharedVideos: number;
}

interface GraphData {
  nodes: IntelNode[];
  edges: IntelEdge[];
  metadata: {
    totalNodes: number;
    totalEdges: number;
    computedAt: string;
    minMentions: number;
    minSharedVideos: number;
  };
}

// ─── Categories ─────────────────────────────────────────────────────────────

const CATEGORIES: Record<string, { label: string; color: string }> = {
  investigator:     { label: 'Investigators & Scientists', color: '#34d399' },
  whistleblower:    { label: 'Whistleblowers',             color: '#f59e0b' },
  witness_military: { label: 'Witnesses & Military',       color: '#60a5fa' },
  person_other:     { label: 'Other Persons',              color: '#94a3b8' },
  gov_military:     { label: 'Government & Military',      color: '#f472b6' },
  research_media:   { label: 'Research & Media',           color: '#a78bfa' },
  program_confirmed: { label: 'Confirmed Programs',        color: '#22d3ee' },
  program_alleged:  { label: 'Alleged Programs',           color: '#fb923c' },
  program_other:    { label: 'Other Programs',             color: '#94a3b8' },
};

// Default: show all categories
const DEFAULT_ENABLED = new Set(Object.keys(CATEGORIES));

// Human-readable sub-type labels for tooltips
const SUB_TYPE_LABELS: Record<string, string> = {
  investigator: 'Investigator',
  scientist: 'Scientist',
  whistleblower: 'Whistleblower',
  witness: 'Witness',
  military_official: 'Military Official',
  journalist: 'Journalist',
  legislator: 'Legislator',
  program_manager: 'Program Manager',
  contractor_employee: 'Contractor',
  other: 'Other',
  government_agency: 'Government Agency',
  military_branch: 'Military Branch',
  congressional_body: 'Congressional Body',
  research_institution: 'Research Institution',
  media_outlet: 'Media Outlet',
  defense_contractor: 'Defense Contractor',
  think_tank: 'Think Tank',
  ffrdc: 'FFRDC',
  confirmed: 'Confirmed',
  alleged: 'Alleged',
  disputed: 'Disputed',
  debunked: 'Debunked',
};

// ─── Component ──────────────────────────────────────────────────────────────

export function UapIntelligenceGraph() {
  const graphRef = useRef<ForceGraphMethods>();
  const containerRef = useRef<HTMLDivElement>(null);
  const hasInitialized = useRef(false);
  const isMobile = useIsMobile();
  const prefersReduced = useReducedMotion();

  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [minSharedVideos, setMinSharedVideos] = useState(2);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [enabledCategories, setEnabledCategories] = useState<Set<string>>(DEFAULT_ENABLED);

  // ─── Fetch Data ───────────────────────────────────────────────────────────

  useEffect(() => {
    fetch('/api/viz/uap-intelligence')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        setGraphData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('[uap-intelligence-graph] fetch error:', err);
        setError('Failed to load visualization data');
        setLoading(false);
      });
  }, []);

  // ─── Resize Observer ──────────────────────────────────────────────────────

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // ─── Auto-fit + Auto-rotate ───────────────────────────────────────────────

  const handleEngineStop = useCallback(() => {
    if (!graphRef.current || hasInitialized.current) return;
    hasInitialized.current = true;

    graphRef.current.zoomToFit(600, 60);

    try {
      const controls = graphRef.current.controls();
      if (controls && 'autoRotate' in controls) {
        controls.autoRotate = !prefersReduced && !isMobile;
        controls.autoRotateSpeed = 0.3;
      }
    } catch { /* controls not ready */ }
  }, [isMobile, prefersReduced]);

  // ─── Zoom Controls ────────────────────────────────────────────────────────

  const handleZoomIn = useCallback(() => {
    if (!graphRef.current) return;
    const pos = graphRef.current.camera().position;
    const scale = 0.7;
    graphRef.current.cameraPosition(
      { x: pos.x * scale, y: pos.y * scale, z: pos.z * scale },
      undefined, 400
    );
  }, []);

  const handleZoomOut = useCallback(() => {
    if (!graphRef.current) return;
    const pos = graphRef.current.camera().position;
    const scale = 1.3;
    graphRef.current.cameraPosition(
      { x: pos.x * scale, y: pos.y * scale, z: pos.z * scale },
      undefined, 400
    );
  }, []);

  const handleZoomFit = useCallback(() => {
    if (!graphRef.current) return;
    graphRef.current.zoomToFit(600, 60);
  }, []);

  // ─── Filtered Graph Data ──────────────────────────────────────────────────

  const filteredData = useMemo(() => {
    if (!graphData) return { nodes: [], links: [] };

    const enabledNodes = graphData.nodes
      .filter(n => enabledCategories.has(n.category))
      .map(n => ({
        ...n,
        // Logarithmic sizing: log2(mentions) gives 3.3 for 10 mentions, 7.7 for 200
        val: Math.max(1, Math.log2(n.mentions) * 0.8),
      }));
    const enabledNodeIds = new Set(enabledNodes.map(n => n.id));

    const links = graphData.edges
      .filter(e => {
        const sourceId = typeof e.source === 'string' ? e.source : e.source.id;
        const targetId = typeof e.target === 'string' ? e.target : e.target.id;
        return (
          e.sharedVideos >= minSharedVideos &&
          enabledNodeIds.has(sourceId) &&
          enabledNodeIds.has(targetId)
        );
      })
      .map(e => ({
        source: typeof e.source === 'string' ? e.source : e.source.id,
        target: typeof e.target === 'string' ? e.target : e.target.id,
        sharedVideos: e.sharedVideos,
      }));

    // Always remove orphan nodes — they spread the view without adding insight
    const connectedIds = new Set<string>();
    for (const link of links) {
      connectedIds.add(link.source);
      connectedIds.add(link.target);
    }
    const nodes = enabledNodes.filter(n => connectedIds.has(n.id));

    return { nodes, links };
  }, [graphData, enabledCategories, minSharedVideos]);

  // ─── Max shared videos for slider ─────────────────────────────────────────

  const maxShared = useMemo(() => {
    if (!graphData) return 10;
    return Math.max(...graphData.edges.map(e => e.sharedVideos), 5);
  }, [graphData]);

  // ─── Legend Items ─────────────────────────────────────────────────────────

  const legendItems = useMemo<LegendItem[]>(() => {
    if (!graphData) return [];
    return Object.entries(CATEGORIES)
      .map(([id, meta]) => {
        const count = graphData.nodes.filter(n => n.category === id).length;
        if (count === 0) return null;
        return {
          id,
          label: meta.label,
          color: meta.color,
          count,
          enabled: enabledCategories.has(id),
        };
      })
      .filter(Boolean) as LegendItem[];
  }, [graphData, enabledCategories]);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleCategoryToggle = useCallback((id: string) => {
    setEnabledCategories(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    hasInitialized.current = false;
  }, []);

  const nodeTypeLabel = (nodeType: string) => {
    switch (nodeType) {
      case 'person': return 'Person';
      case 'org': return 'Organization';
      case 'program': return 'Program';
      default: return nodeType;
    }
  };

  const handleNodeClick = useCallback((node: IntelNode, event: MouseEvent) => {
    setTooltip({
      type: 'node',
      title: node.label,
      stats: [
        { label: 'Type', value: nodeTypeLabel(node.nodeType) },
        { label: 'Role', value: SUB_TYPE_LABELS[node.subType] || node.subType },
        { label: 'Mentions', value: node.mentions.toLocaleString() },
        { label: 'Videos', value: node.videoCount?.toLocaleString() || '—' },
      ],
      x: event.clientX,
      y: event.clientY,
    });
  }, []);

  const handleLinkClick = useCallback((link: any, event: MouseEvent) => {
    const sourceLabel = typeof link.source === 'object' ? link.source.label : link.source;
    const targetLabel = typeof link.target === 'object' ? link.target.label : link.target;

    setTooltip({
      type: 'edge',
      title: `${sourceLabel} ↔ ${targetLabel}`,
      stats: [
        { label: 'Shared videos', value: link.sharedVideos.toLocaleString() },
      ],
      description: 'These entities are discussed in the same video testimony.',
      x: event.clientX,
      y: event.clientY,
    });
  }, []);

  const handleBgClick = useCallback(() => {
    setTooltip(null);
  }, []);

  // ─── Custom Node: text label ──────────────────────────────────────────────

  const nodeThreeObject = useCallback((node: IntelNode) => {
    const label = node.label;
    const fontSize = 28; // Smaller for denser graph
    const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio, 2) : 1;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    ctx.font = `500 ${fontSize}px Inter, system-ui, sans-serif`;
    const textWidth = ctx.measureText(label).width;
    const pad = 8;

    canvas.width = (textWidth + pad * 2) * dpr;
    canvas.height = (fontSize + pad * 2) * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.font = `500 ${fontSize}px Inter, system-ui, sans-serif`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, (textWidth + pad * 2) / 2, (fontSize + pad * 2) / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    const spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      sizeAttenuation: true,
    });

    const sprite = new THREE.Sprite(spriteMaterial);
    const spriteScale = 0.025; // Smaller for dense graph
    sprite.scale.set(
      (textWidth + pad * 2) * spriteScale,
      (fontSize + pad * 2) * spriteScale,
      1
    );

    const nodeRadius = Math.cbrt(node.val || 2) * 1.5;
    sprite.position.set(0, nodeRadius + 1.2, 0);

    return sprite;
  }, []);

  // ─── Link Color ───────────────────────────────────────────────────────────

  const linkColor = useCallback((link: any) => {
    const sourceNode = typeof link.source === 'object' ? link.source : null;
    if (sourceNode?.color) {
      return sourceNode.color + '40';
    }
    return 'rgba(100, 140, 220, 0.15)';
  }, []);

  // ─── Control Panel ────────────────────────────────────────────────────────

  const controlPanel = (
    <div className="space-y-5">
      {/* ─── Description + Visual Key ─── */}
      <div className="space-y-3 pb-4 border-b border-white/10">
        <p className="text-xs text-white/60 leading-relaxed">
          Explore the UAP disclosure landscape — {graphData?.metadata.totalNodes || '…'} key
          entities connected through shared video testimony.
        </p>
        <div className="space-y-2 text-[11px] text-white/45">
          <div className="flex items-center gap-2">
            <span className="flex-shrink-0 w-3.5 h-3.5 rounded-full bg-emerald-400/80" />
            <span><strong className="text-white/65">Node size</strong> — number of mentions</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex-shrink-0 w-5 h-[2px] rounded-full bg-white/30" />
            <span><strong className="text-white/65">Line width</strong> — shared video count</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex-shrink-0 w-3.5 h-3.5 rounded-full" style={{ background: 'linear-gradient(135deg, #34d399, #f472b6)' }} />
            <span><strong className="text-white/65">Shape</strong> — ● Person · ● Org · ● Program</span>
          </div>
        </div>
      </div>

      {/* ─── Category Toggles ─── */}
      <VizLegend
        title="Entity Categories"
        items={legendItems}
        onToggle={handleCategoryToggle}
      />

      {/* ─── Shared Videos Slider ─── */}
      <div className="space-y-2">
        <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider">
          Min Shared Videos
        </h3>
        <div className="space-y-1.5">
          <input
            type="range"
            min={1}
            max={maxShared}
            step={1}
            value={minSharedVideos}
            onChange={e => setMinSharedVideos(Number(e.target.value))}
            className="w-full accent-green-400"
          />
          <div className="flex justify-between text-xs text-white/40">
            <span>1</span>
            <span>≥ {minSharedVideos} shared videos</span>
          </div>
          {graphData && (
            <p className="text-[10px] text-white/30">
              Showing {filteredData.links.length} of {graphData.edges.length} connections
            </p>
          )}
        </div>
      </div>

      {/* ─── Data Summary ─── */}
      {graphData && (
        <div className="space-y-2 pt-2 border-t border-white/10">
          <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider">
            Data Summary
          </h3>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-white/40">
              <span>Total entities</span>
              <span className="text-white/70 tabular-nums">
                {graphData.metadata.totalNodes}
              </span>
            </div>
            <div className="flex justify-between text-white/40">
              <span>Visible nodes</span>
              <span className="text-white/70 tabular-nums">
                {filteredData.nodes.length}
              </span>
            </div>
            <div className="flex justify-between text-white/40">
              <span>Visible connections</span>
              <span className="text-white/70 tabular-nums">
                {filteredData.links.length}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ─── Interaction Tips ─── */}
      <div className="text-xs text-white/30 leading-relaxed pt-2 border-t border-white/10">
        <p className="mb-1">
          <strong className="text-white/50">Click</strong> a node or connection for details
        </p>
        <p>
          <strong className="text-white/50">Drag</strong> to rotate · <strong className="text-white/50">Scroll</strong> to zoom
        </p>
      </div>
    </div>
  );

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <VizPageShell
      title="UAP Intelligence Network"
      subtitle={graphData ? `${graphData.metadata.totalNodes} people, orgs & programs connected` : undefined}
      domain="uap"
      controlPanel={controlPanel}
      isLoading={loading}
    >
      {error ? (
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <p className="text-white/50 text-sm mb-2">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="text-green-400 text-sm hover:text-green-300 transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      ) : (
        <div ref={containerRef} className="w-full h-full relative">
          {graphData && (
            <ForceGraph3D
              ref={graphRef}
              width={dimensions.width}
              height={dimensions.height}
              graphData={filteredData}
              nodeId="id"
              nodeLabel=""
              nodeVal="val"
              nodeColor="color"
              nodeOpacity={0.85}
              nodeResolution={12}
              nodeThreeObject={nodeThreeObject}
              nodeThreeObjectExtend={true}
              linkSource="source"
              linkTarget="target"
              linkWidth={(link: any) => 0.15 + (link.sharedVideos / maxShared) * 2}
              linkOpacity={0.3}
              linkColor={linkColor}
              linkDirectionalParticles={1}
              linkDirectionalParticleWidth={0.5}
              linkDirectionalParticleSpeed={0.003}
              onNodeClick={handleNodeClick}
              onLinkClick={handleLinkClick}
              onBackgroundClick={handleBgClick}
              onEngineStop={handleEngineStop}
              backgroundColor="#030014"
              showNavInfo={false}
              enableNodeDrag={!isMobile}
              cooldownTicks={isMobile || prefersReduced ? 150 : 350}
              d3AlphaDecay={0.02}
              d3VelocityDecay={0.3}
              d3AlphaMin={0.005}
            />
          )}

          {/* ─── Zoom Controls ─── */}
          <div className="absolute bottom-6 left-6 z-50 flex flex-col gap-1.5">
            <button
              onClick={handleZoomIn}
              className="w-9 h-9 flex items-center justify-center rounded-lg
                bg-black/50 backdrop-blur-md border border-white/10
                text-white/60 hover:text-white hover:bg-white/10
                transition-all duration-200 cursor-pointer"
              aria-label="Zoom in"
              title="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleZoomOut}
              className="w-9 h-9 flex items-center justify-center rounded-lg
                bg-black/50 backdrop-blur-md border border-white/10
                text-white/60 hover:text-white hover:bg-white/10
                transition-all duration-200 cursor-pointer"
              aria-label="Zoom out"
              title="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={handleZoomFit}
              className="w-9 h-9 flex items-center justify-center rounded-lg
                bg-black/50 backdrop-blur-md border border-white/10
                text-white/60 hover:text-white hover:bg-white/10
                transition-all duration-200 cursor-pointer"
              aria-label="Fit to view"
              title="Fit all nodes"
            >
              <Maximize className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <VizNodeTooltip data={tooltip} onClose={() => setTooltip(null)} />
    </VizPageShell>
  );
}
