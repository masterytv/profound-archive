'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { VizPageShell } from '@/components/viz/VizPageShell';
import { VizNodeTooltip, type TooltipData } from '@/components/viz/VizNodeTooltip';
import { useReducedMotion } from '@/components/viz/hooks/useReducedMotion';
import * as THREE from 'three';

// ─── Types ──────────────────────────────────────────────────────────────────

interface EncounterPoint {
  id: string;
  hynek: string;
  evidence: number;
  contact: number;
  transform: number;
  entity: string | null;
  country: string | null;
}

interface HynekCluster {
  hynek: string;
  count: number;
  avgEvidence: number;
  avgContact: number;
  avgTransform: number;
}

interface HynekData {
  points: EncounterPoint[];
  clusters: HynekCluster[];
  metadata: { totalPoints: number; computedAt: string };
}

// ─── Hynek styling ──────────────────────────────────────────────────────────

const HYNEK_COLORS: Record<string, string> = {
  CE1: '#60a5fa', CE2: '#34d399', CE3: '#f59e0b',
  CE4: '#ef4444', CE5: '#c084fc', NL: '#94a3b8',
};

const HYNEK_HEX: Record<string, number> = {
  CE1: 0x60a5fa, CE2: 0x34d399, CE3: 0xf59e0b,
  CE4: 0xef4444, CE5: 0xc084fc, NL: 0x94a3b8,
};

const HYNEK_LABELS: Record<string, string> = {
  CE1: 'Close Encounter I',
  CE2: 'Close Encounter II (Traces)',
  CE3: 'Close Encounter III (Entity)',
  CE4: 'Close Encounter IV (Abduction)',
  CE5: 'Close Encounter V (Initiated)',
  NL: 'Nocturnal Light',
};

const ENTITY_LABELS: Record<string, string> = {
  humanoid: 'Humanoid', grey: 'Grey', light_being: 'Light Being',
  mantis: 'Mantis', reptilian: 'Reptilian', hybrid: 'Hybrid',
  nordic: 'Nordic', robotic: 'Robotic', shadow_entity: 'Shadow Entity',
  none: 'None', unknown: 'Unknown', not_stated: 'Not stated',
};

// ─── Component ──────────────────────────────────────────────────────────────

export function HynekSpaceGraph() {
  const graphRef = useRef<any>();
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReduced = useReducedMotion();

  const [data, setData] = useState<HynekData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [activeHynek, setActiveHynek] = useState<Set<string>>(new Set(Object.keys(HYNEK_COLORS)));

  // ─── Fetch ────────────────────────────────────────────────────────────────

  useEffect(() => {
    fetch('/api/viz/hynek-space')
      .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
      .then(d => { setData(d); setLoading(false); })
      .catch(err => { setError('Failed to load data'); setLoading(false); });
  }, []);

  // ─── Resize ───────────────────────────────────────────────────────────────

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(entries => {
      for (const e of entries) setDimensions({ width: e.contentRect.width, height: e.contentRect.height });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // ─── Build graph data (nodes only, no links — pure scatter) ───────────────

  const graphData = useMemo(() => {
    if (!data) return { nodes: [], links: [] };

    // Scale encounters into 3D space: evidence (x), contact (y), transform (z)
    const SCALE = 8; // spread factor
    const nodes = data.points
      .filter(p => activeHynek.has(p.hynek))
      .map(p => ({
        id: p.id,
        hynek: p.hynek,
        evidence: p.evidence,
        contact: p.contact,
        transform: p.transform,
        entity: p.entity,
        country: p.country,
        // Position: center at 0, spread by score (0-100 → -SCALE to +SCALE)
        fx: ((p.evidence / 100) * 2 - 1) * SCALE + (Math.random() - 0.5) * 0.3,
        fy: ((p.contact / 100) * 2 - 1) * SCALE + (Math.random() - 0.5) * 0.3,
        fz: ((p.transform / 100) * 2 - 1) * SCALE + (Math.random() - 0.5) * 0.3,
      }));

    return { nodes, links: [] };
  }, [data, activeHynek]);

  // ─── Configure after mount ────────────────────────────────────────────────

  useEffect(() => {
    if (!graphRef.current || !data) return;
    const controls = graphRef.current.controls();
    if (controls) {
      controls.autoRotate = !prefersReduced;
      controls.autoRotateSpeed = 0.3;
    }
    graphRef.current.cameraPosition({ x: 8, y: 5, z: 8 });
  }, [data, prefersReduced]);

  // Stop rotation on interaction
  const stopRotation = useCallback(() => {
    try { const c = graphRef.current?.controls(); if (c) c.autoRotate = false; } catch {}
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('mousedown', stopRotation);
    el.addEventListener('touchstart', stopRotation);
    return () => { el.removeEventListener('mousedown', stopRotation); el.removeEventListener('touchstart', stopRotation); };
  }, [stopRotation]);

  // ─── Node rendering ──────────────────────────────────────────────────────

  const nodeThreeObject = useCallback((node: any) => {
    const color = HYNEK_HEX[node.hynek] || 0x94a3b8;
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 8, 8),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.75 }),
    );
    return mesh;
  }, []);

  // ─── Click handler ────────────────────────────────────────────────────────

  const handleNodeClick = useCallback((node: any, event: MouseEvent) => {
    stopRotation();
    const stats = [
      { label: 'Hynek type', value: HYNEK_LABELS[node.hynek] || node.hynek },
      { label: 'Evidence score', value: `${node.evidence}/100` },
      { label: 'Contact depth', value: `${node.contact}/100` },
      { label: 'Transformation', value: `${node.transform}/100` },
    ];
    if (node.entity && !['none', 'unknown', 'not_stated', 'null'].includes(node.entity)) {
      stats.push({ label: 'Entity type', value: ENTITY_LABELS[node.entity] || node.entity.replace(/_/g, ' ') });
    }
    if (node.country && node.country !== 'not_stated') {
      stats.push({ label: 'Country', value: node.country.replace(/_/g, ' ') });
    }
    setTooltip({ type: 'node', title: `Encounter #${node.id.slice(-6)}`, stats, x: event.clientX, y: event.clientY });
  }, [stopRotation]);

  // ─── Toggle Hynek filter ──────────────────────────────────────────────────

  const toggleHynek = useCallback((key: string) => {
    setActiveHynek(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  // ─── Zoom Controls ────────────────────────────────────────────────────────

  const zoomIn = useCallback(() => { graphRef.current?.cameraPosition({ z: graphRef.current.camera().position.z * 0.7 }, null, 400); }, []);
  const zoomOut = useCallback(() => { graphRef.current?.cameraPosition({ z: Math.min(graphRef.current.camera().position.z * 1.4, 50) }, null, 400); }, []);
  const zoomFit = useCallback(() => { graphRef.current?.cameraPosition({ x: 8, y: 5, z: 8 }, { x: 0, y: 0, z: 0 }, 800); }, []);

  // ─── Control Panel ────────────────────────────────────────────────────────

  const controlPanel = (
    <div className="space-y-5">
      <div className="space-y-3 pb-4 border-b border-white/10">
        <p className="text-xs text-white/60 leading-relaxed">
          {data?.metadata.totalPoints.toLocaleString() || '…'} encounters plotted in 3D space.
          Each dot is one encounter.
        </p>
        <div className="space-y-2 text-[11px] text-white/45">
          <div><strong className="text-white/65">X-axis</strong> — Evidence Score (0–100)</div>
          <div><strong className="text-white/65">Y-axis</strong> — Contact Depth (0–100)</div>
          <div><strong className="text-white/65">Z-axis</strong> — Transformation (0–100)</div>
          <div><strong className="text-white/65">Color</strong> — Hynek Classification</div>
        </div>
      </div>

      {/* Hynek toggles */}
      <div className="space-y-2">
        <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider">
          Filter by Hynek Type
        </h3>
        <div className="space-y-1.5">
          {Object.entries(HYNEK_COLORS).map(([key, color]) => (
            <button
              key={key}
              onClick={() => toggleHynek(key)}
              className={`flex items-center gap-2 text-[11px] w-full text-left transition-opacity cursor-pointer ${
                activeHynek.has(key) ? 'opacity-100' : 'opacity-30'
              }`}
            >
              <span className="flex-shrink-0 w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-white/60">{HYNEK_LABELS[key]}</span>
              {data && (
                <span className="ml-auto text-white/30 tabular-nums">
                  {data.clusters.find(c => c.hynek === key)?.count || 0}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Cluster averages */}
      {data && (
        <div className="space-y-2 pt-2 border-t border-white/10">
          <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider">
            Cluster Averages
          </h3>
          <div className="space-y-2">
            {data.clusters.filter(c => HYNEK_LABELS[c.hynek]).map(c => (
              <div key={c.hynek} className="text-[10px] text-white/40">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: HYNEK_COLORS[c.hynek] }} />
                  <span className="text-white/60 font-medium">{c.hynek}</span>
                </div>
                <div className="ml-3.5 grid grid-cols-3 gap-1">
                  <span>Ev: {c.avgEvidence}</span>
                  <span>Co: {c.avgContact}</span>
                  <span>Tr: {c.avgTransform}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="text-xs text-white/30 leading-relaxed pt-2 border-t border-white/10">
        <p className="mb-1"><strong className="text-white/50">Click</strong> a dot for details</p>
        <p><strong className="text-white/50">Drag</strong> to rotate · <strong className="text-white/50">Scroll</strong> to zoom</p>
      </div>
    </div>
  );

  return (
    <VizPageShell
      title="Hynek Classification Space"
      subtitle={data ? `${data.metadata.totalPoints.toLocaleString()} encounters in 3D` : undefined}
      domain="uap"
      controlPanel={controlPanel}
      isLoading={loading}
    >
      {error ? (
        <div className="flex h-full items-center justify-center">
          <p className="text-white/50 text-sm">{error}</p>
        </div>
      ) : (
        <div ref={containerRef} className="w-full h-full relative">
          {graphData.nodes.length > 0 && (
            <ForceGraph3D
              ref={graphRef}
              width={dimensions.width}
              height={dimensions.height}
              graphData={graphData}
              nodeThreeObject={nodeThreeObject}
              nodeLabel=""
              onNodeClick={handleNodeClick}
              onBackgroundClick={() => setTooltip(null)}
              backgroundColor="#030014"
              showNavInfo={false}
              enableNodeDrag={false}
              cooldownTicks={0}
              d3AlphaDecay={1}
              d3VelocityDecay={1}
            />
          )}

          <div className="absolute bottom-6 left-6 z-50 flex flex-col gap-1.5">
            {[
              { icon: ZoomIn, fn: zoomIn, label: 'Zoom in' },
              { icon: ZoomOut, fn: zoomOut, label: 'Zoom out' },
              { icon: Maximize, fn: zoomFit, label: 'Reset view' },
            ].map(({ icon: Icon, fn, label }) => (
              <button key={label} onClick={fn} aria-label={label} title={label}
                className="w-9 h-9 flex items-center justify-center rounded-lg bg-black/50 backdrop-blur-md border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all duration-200 cursor-pointer">
                <Icon className="w-4 h-4" />
              </button>
            ))}
          </div>
        </div>
      )}
      <VizNodeTooltip data={tooltip} onClose={() => setTooltip(null)} />
    </VizPageShell>
  );
}
