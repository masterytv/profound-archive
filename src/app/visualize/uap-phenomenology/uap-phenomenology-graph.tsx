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

interface PhenomNode {
  id: string;
  label: string;
  frequency: number;
  frequencyPct: number;
  category: string;
  color: string;
  val?: number;
  x?: number;
  y?: number;
  z?: number;
}

interface PhenomEdge {
  source: string | PhenomNode;
  target: string | PhenomNode;
  weight: number;
  weightPct: number;
}

interface GraphData {
  nodes: PhenomNode[];
  edges: PhenomEdge[];
  metadata: {
    totalEncounters: number;
    computedAt: string;
    minFrequency: number;
    minCooccurrence: number;
  };
}

// 4 categories — start with Entity Type + Physical Effect enabled
const CATEGORIES: Record<string, { label: string; color: string }> = {
  entity:        { label: 'Entity Type',        color: '#34d399' },
  effect:        { label: 'Physical Effect',    color: '#fb923c' },
  craft:         { label: 'Craft Shape',        color: '#60a5fa' },
  consciousness: { label: 'Consciousness State', color: '#c084fc' },
};

// Default: only entity + effect enabled to keep initial view readable (~24 nodes)
const DEFAULT_ENABLED = new Set(['entity', 'effect']);

// ─── Component ──────────────────────────────────────────────────────────────

export function UapPhenomenologyGraph() {
  const graphRef = useRef<ForceGraphMethods>();
  const containerRef = useRef<HTMLDivElement>(null);
  const hasInitialized = useRef(false);
  const isMobile = useIsMobile();
  const prefersReduced = useReducedMotion();

  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [minStrength, setMinStrength] = useState(0);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [enabledCategories, setEnabledCategories] = useState<Set<string>>(DEFAULT_ENABLED);

  // ─── Fetch Data ───────────────────────────────────────────────────────────

  useEffect(() => {
    fetch('/api/viz/uap-phenomenology')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        setGraphData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('[uap-phenomenology-graph] fetch error:', err);
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
  }, [loading]);

  // ─── Auto-fit + Auto-rotate after physics settles ─────────────────────────

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
        // Slightly larger range for ~35 nodes: 0.8–4 so smaller nodes are still visible
        val: 0.8 + (n.frequencyPct / 100) * 3.2,
      }));
    const enabledNodeIds = new Set(enabledNodes.map(n => n.id));

    const links = graphData.edges
      .filter(e => {
        const sourceId = typeof e.source === 'string' ? e.source : e.source.id;
        const targetId = typeof e.target === 'string' ? e.target : e.target.id;
        return (
          e.weightPct >= minStrength &&
          enabledNodeIds.has(sourceId) &&
          enabledNodeIds.has(targetId)
        );
      })
      .map(e => ({
        source: typeof e.source === 'string' ? e.source : e.source.id,
        target: typeof e.target === 'string' ? e.target : e.target.id,
        weight: e.weight,
        weightPct: e.weightPct,
      }));

    // Remove orphan nodes (no remaining connections) when filtering
    const connectedIds = new Set<string>();
    for (const link of links) {
      connectedIds.add(link.source);
      connectedIds.add(link.target);
    }
    const nodes = minStrength > 0
      ? enabledNodes.filter(n => connectedIds.has(n.id))
      : enabledNodes;

    return { nodes, links };
  }, [graphData, enabledCategories, minStrength]);

  // ─── Legend Items ─────────────────────────────────────────────────────────

  const legendItems = useMemo<LegendItem[]>(() => {
    if (!graphData) return [];
    return Object.entries(CATEGORIES).map(([id, meta]) => ({
      id,
      label: meta.label,
      color: meta.color,
      count: graphData.nodes.filter(n => n.category === id).length,
      enabled: enabledCategories.has(id),
    }));
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

  const handleNodeClick = useCallback((node: PhenomNode, event: MouseEvent) => {
    // Map category → video-explore filter param
    const FILTER_MAP: Record<string, (id: string) => string> = {
      entity: (id) => `/uap/video-explore?entities=${encodeURIComponent(id)}`,
      craft: (id) => `/uap/video-explore?q=${encodeURIComponent(id.replace(/_/g, ' '))}`,
      consciousness: (id) => `/uap/video-explore?q=${encodeURIComponent(id.replace(/_/g, ' '))}`,
      effect: (id) => `/uap/video-explore?q=${encodeURIComponent(id.replace(/_/g, ' '))}`,
    };
    // node.id is "entity:grey" — extract just the value part
    const rawId = node.id.includes(':') ? node.id.split(':').slice(1).join(':') : node.id;
    const buildHref = FILTER_MAP[node.category];
    const href = buildHref ? buildHref(rawId) : undefined;

    setTooltip({
      type: 'node',
      title: node.label,
      stats: [
        { label: 'Present in', value: `${node.frequencyPct}% of encounters` },
        { label: 'Occurrences', value: node.frequency.toLocaleString() },
        { label: 'Category', value: CATEGORIES[node.category]?.label || node.category },
      ],
      x: event.clientX,
      y: event.clientY,
      href,
    });
  }, []);

  const handleLinkClick = useCallback((link: any, event: MouseEvent) => {
    const sourceLabel = typeof link.source === 'object' ? link.source.label : link.source;
    const targetLabel = typeof link.target === 'object' ? link.target.label : link.target;

    setTooltip({
      type: 'edge',
      title: `${sourceLabel} + ${targetLabel}`,
      stats: [
        { label: 'Co-occur in', value: `${link.weightPct}% of encounters` },
        { label: 'Together in', value: `${link.weight.toLocaleString()} encounters` },
      ],
      description: 'These phenomena appear together in the same UAP encounter.',
      x: event.clientX,
      y: event.clientY,
    });
  }, []);

  const handleBgClick = useCallback(() => {
    setTooltip(null);
  }, []);

  // ─── Custom Node: text label above built-in sphere ────────────────────────

  const nodeThreeObject = useCallback((node: PhenomNode) => {
    const label = node.label;
    const fontSize = 32; // Slightly smaller for denser graph
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
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
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
    const spriteScale = 0.03; // Slightly smaller for denser graph
    sprite.scale.set(
      (textWidth + pad * 2) * spriteScale,
      (fontSize + pad * 2) * spriteScale,
      1
    );

    const nodeRadius = Math.cbrt(node.val || 2) * 1.5;
    sprite.position.set(0, nodeRadius + 1.5, 0);

    return sprite;
  }, []);

  // ─── Link Color ───────────────────────────────────────────────────────────

  const linkColor = useCallback((link: any) => {
    const sourceNode = typeof link.source === 'object' ? link.source : null;
    if (sourceNode?.color) {
      return sourceNode.color + '50';
    }
    return 'rgba(100, 140, 220, 0.2)';
  }, []);

  // ─── Control Panel ────────────────────────────────────────────────────────

  const controlPanel = (
    <div className="space-y-5">
      {/* ─── Description + Visual Key ─── */}
      <div className="space-y-3 pb-4 border-b border-white/10">
        <p className="text-xs text-white/75 leading-relaxed">
          Explore how UAP encounter phenomena co-occur
          across {graphData?.metadata.totalEncounters.toLocaleString() || '…'} analyzed encounters.
          Toggle categories to reveal cross-dimensional patterns.
        </p>
        <div className="space-y-2 text-[11px] text-white/60">
          <div className="flex items-center gap-2">
            <span className="flex-shrink-0 w-3.5 h-3.5 rounded-full bg-emerald-400/80" />
            <span><strong className="text-white/80">Node size</strong> — frequency of this phenomenon</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex-shrink-0 w-5 h-[2px] rounded-full bg-white/30" />
            <span><strong className="text-white/80">Line width</strong> — co-occurrence strength</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex-shrink-0 w-3.5 h-3.5 flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-white/50 animate-pulse" />
            </span>
            <span><strong className="text-white/80">Particles</strong> — direction of association</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex-shrink-0 w-3.5 h-3.5 rounded-sm" style={{ background: 'linear-gradient(135deg, #34d399, #fb923c, #60a5fa, #c084fc)' }} />
            <span><strong className="text-white/80">Color</strong> — phenomenon category</span>
          </div>
        </div>
      </div>

      {/* ─── Category Toggles ─── */}
      <VizLegend
        title="Phenomenon Categories"
        items={legendItems}
        onToggle={handleCategoryToggle}
      />

      {/* ─── Connection Strength ─── */}
      <div className="space-y-2">
        <h3 className="text-xs font-medium text-white/70 uppercase tracking-wider">
          Min Co-occurrence
        </h3>
        <div className="space-y-1.5">
          <input
            type="range"
            min={0}
            max={40}
            step={2}
            value={minStrength}
            onChange={e => setMinStrength(Number(e.target.value))}
            className="w-full accent-emerald-400"
          />
          <div className="flex justify-between text-xs text-white/60">
            <span>All</span>
            <span>{minStrength > 0 ? `≥ ${minStrength}% of encounters` : 'No filter'}</span>
          </div>
          {minStrength > 0 && (
            <p className="text-[10px] text-white/50">
              Showing {filteredData.links.length} of {graphData?.edges.length ?? 0} connections
            </p>
          )}
        </div>
      </div>

      {/* ─── Data Summary ─── */}
      {graphData && (
        <div className="space-y-2 pt-2 border-t border-white/10">
          <h3 className="text-xs font-medium text-white/70 uppercase tracking-wider">
            Data Summary
          </h3>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-white/60">
              <span>Total encounters</span>
              <span className="text-white/70 tabular-nums">
                {graphData.metadata.totalEncounters.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-white/60">
              <span>Visible nodes</span>
              <span className="text-white/70 tabular-nums">
                {filteredData.nodes.length}
              </span>
            </div>
            <div className="flex justify-between text-white/60">
              <span>Visible connections</span>
              <span className="text-white/70 tabular-nums">
                {filteredData.links.length}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ─── Interaction Tips ─── */}
      <div className="text-xs text-white/50 leading-relaxed pt-2 border-t border-white/10">
        <p className="mb-1">
          <strong className="text-white/70">Click</strong> a node or connection for details
        </p>
        <p>
          <strong className="text-white/70">Drag</strong> to rotate · <strong className="text-white/70">Scroll</strong> to zoom
        </p>
      </div>
    </div>
  );

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <VizPageShell
      title="UAP Phenomenology Network"
      subtitle={graphData ? `How ${graphData.metadata.totalEncounters.toLocaleString()} UAP encounters connect` : undefined}
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
              className="text-emerald-400 text-sm hover:text-emerald-300 transition-colors"
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
              linkWidth={(link: any) => 0.2 + (link.weightPct / 100) * 1.5}
              linkOpacity={0.35}
              linkColor={linkColor}
              linkDirectionalParticles={1}
              linkDirectionalParticleWidth={0.6}
              linkDirectionalParticleSpeed={0.004}
              onNodeClick={handleNodeClick}
              onLinkClick={handleLinkClick}
              onBackgroundClick={handleBgClick}
              onEngineStop={handleEngineStop}
              backgroundColor="#030014"
              showNavInfo={false}
              enableNodeDrag={!isMobile}
              cooldownTicks={isMobile || prefersReduced ? 200 : 400}
              d3AlphaDecay={0.025}
              d3VelocityDecay={0.35}
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
