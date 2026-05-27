'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { VizPageShell } from '@/components/viz/VizPageShell';
import { VizNodeTooltip, type TooltipData } from '@/components/viz/VizNodeTooltip';
import { useReducedMotion } from '@/components/viz/hooks/useReducedMotion';
import * as THREE from 'three';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Channel {
  id: string;
  name: string;
  avatar: string | null;
  subscribers: number;
  videoCount: number;
  intelligence: number;
  credibility: number;
  encounter: number;
  research: number;
  authority: number;
  impact: number;
  diversity: number;
  grade: string;
  archetype: string;
  archetypeSecondary: string | null;
}

interface ConstellationData {
  channels: Channel[];
  metadata: { totalChannels: number; computedAt: string };
}

// ─── Archetype colors (better distribution than letter grades) ──────────────

const ARCHETYPE_COLORS: Record<string, string> = {
  'Deep Intelligence': '#60a5fa',
  'Interview Hub': '#34d399',
  'Documentary': '#f59e0b',
  'News & Commentary': '#ef4444',
  'First Person Encounters': '#c084fc',
};

const ARCHETYPE_HEX: Record<string, number> = {
  'Deep Intelligence': 0x60a5fa,
  'Interview Hub': 0x34d399,
  'Documentary': 0xf59e0b,
  'News & Commentary': 0xef4444,
  'First Person Encounters': 0xc084fc,
};

// ─── Component ──────────────────────────────────────────────────────────────

export function ChannelConstellationGraph() {
  const graphRef = useRef<any>();
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReduced = useReducedMotion();

  const [data, setData] = useState<ConstellationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // ─── Fetch ────────────────────────────────────────────────────────────────

  useEffect(() => {
    fetch('/api/viz/channel-constellation')
      .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { setError('Failed to load data'); setLoading(false); });
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
  }, [loading]);

  // ─── Build graph data (scatter — fixed positions, no links) ───────────────

  const graphData = useMemo(() => {
    if (!data || data.channels.length === 0) return { nodes: [], links: [] };

    const SCALE = 10;

    // Per-axis min-max so data fills the entire 3D cube
    const intels = data.channels.map(c => c.intelligence);
    const creds = data.channels.map(c => c.credibility);
    const encs = data.channels.map(c => c.encounter || 0);

    const minI = Math.min(...intels), maxI = Math.max(...intels);
    const minC = Math.min(...creds), maxC = Math.max(...creds);
    const minE = Math.min(...encs), maxE = Math.max(...encs);

    const rangeI = maxI - minI || 1;
    const rangeC = maxC - minC || 1;
    const rangeE = maxE - minE || 1;

    const nodes = data.channels.map(c => ({
      ...c,
      fx: (((c.intelligence - minI) / rangeI) * 2 - 1) * SCALE,
      fy: (((c.credibility - minC) / rangeC) * 2 - 1) * SCALE,
      fz: ((((c.encounter || 0) - minE) / rangeE) * 2 - 1) * SCALE,
    }));

    return { nodes, links: [] };
  }, [data]);

  // ─── Configure ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!graphRef.current || !data) return;
    const controls = graphRef.current.controls();
    if (controls) { controls.autoRotate = !prefersReduced; controls.autoRotateSpeed = 0.3; }
    graphRef.current.cameraPosition({ x: 18, y: 12, z: 18 });

    // ─── Inject 3D axis guides into the scene ──────────────────────────
    const scene = graphRef.current.scene();
    if (!scene) return;

    const existing = scene.getObjectByName('axisGuides');
    if (existing) scene.remove(existing);

    const axisGroup = new THREE.Group();
    axisGroup.name = 'axisGuides';

    const SCALE = 10;
    const AXIS_LEN = SCALE * 2; // full data range: -SCALE to +SCALE
    const ORIGIN = new THREE.Vector3(-SCALE, -SCALE, -SCALE);

    // Helper: create a text sprite that always faces the camera
    function makeLabel(text: string, color: string, position: THREE.Vector3) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      canvas.width = 256;
      canvas.height = 64;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = 'bold 28px Inter, system-ui, sans-serif';
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, canvas.width / 2, canvas.height / 2);

      const texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;
      const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
      const sprite = new THREE.Sprite(material);
      sprite.position.copy(position);
      sprite.scale.set(4.0, 1.0, 1);
      return sprite;
    }

    function makeAxis(dir: THREE.Vector3, color: number, label: string, colorHex: string) {
      const arrow = new THREE.ArrowHelper(
        dir.clone().normalize(), ORIGIN, AXIS_LEN, color, 0.6, 0.3,
      );
      if (arrow.line) {
        (arrow.line as any).material = new THREE.LineBasicMaterial({ color, linewidth: 2, transparent: true, opacity: 0.7 });
      }
      if (arrow.cone) {
        (arrow.cone as any).material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7 });
      }
      axisGroup.add(arrow);

      const labelPos = ORIGIN.clone().add(dir.clone().normalize().multiplyScalar(AXIS_LEN + 1.0));
      axisGroup.add(makeLabel(label, colorHex, labelPos));
    }

    // X-axis: Intelligence (red)
    makeAxis(new THREE.Vector3(1, 0, 0), 0xff6b6b, 'Intelligence →', '#ff6b6b');
    // Y-axis: Credibility (green)
    makeAxis(new THREE.Vector3(0, 1, 0), 0x51cf66, 'Credibility ↑', '#51cf66');
    // Z-axis: Encounter Depth (blue)
    makeAxis(new THREE.Vector3(0, 0, 1), 0x74c0fc, 'Encounter Depth →', '#74c0fc');

    // Floor grid
    const gridSize = SCALE * 2;
    const grid = new THREE.GridHelper(gridSize, 8, 0xffffff, 0xffffff);
    grid.position.set(0, -SCALE, 0);
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.06;
    axisGroup.add(grid);

    scene.add(axisGroup);
  }, [data, prefersReduced]);

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

  // ─── Node rendering — larger spheres with labels ──────────────────────────

  const nodeThreeObject = useCallback((node: any) => {
    const group = new THREE.Group();

    // Sphere sized by authority score
    const radius = 0.2 + (node.authority / 100) * 0.5;
    const color = ARCHETYPE_HEX[node.archetype] || 0x94a3b8;
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 16, 16),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8 }),
    );
    group.add(sphere);

    // Text label
    const canvas = document.createElement('canvas');
    const size = 256;
    canvas.width = size;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const displayName = node.name.length > 22 ? node.name.slice(0, 20) + '…' : node.name;
    ctx.fillText(displayName, size / 2, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(3, 0.75, 1);
    sprite.position.y = radius + 0.6;
    group.add(sprite);

    return group;
  }, []);

  // ─── Click ────────────────────────────────────────────────────────────────

  const handleNodeClick = useCallback((node: any, event: MouseEvent) => {
    stopRotation();
    const stats = [
      { label: 'Grade', value: node.grade },
      { label: 'Intelligence', value: `${node.intelligence}` },
      { label: 'Credibility', value: `${node.credibility}` },
      { label: 'Encounter depth', value: `${node.encounter || 0}` },
      { label: 'Authority', value: `${node.authority}` },
      { label: 'Videos', value: node.videoCount?.toLocaleString() || '—' },
      { label: 'Subscribers', value: node.subscribers?.toLocaleString() || '—' },
    ];
    if (node.archetype) {
      stats.push({ label: 'Archetype', value: node.archetype });
    }
    setTooltip({ type: 'node', title: node.name, stats, x: event.clientX, y: event.clientY, href: `/uap/channels/${node.id}` });
  }, [stopRotation]);

  // ─── Zoom ─────────────────────────────────────────────────────────────────

  const zoomIn = useCallback(() => { graphRef.current?.cameraPosition({ z: graphRef.current.camera().position.z * 0.7 }, null, 400); }, []);
  const zoomOut = useCallback(() => { graphRef.current?.cameraPosition({ z: Math.min(graphRef.current.camera().position.z * 1.4, 50) }, null, 400); }, []);
  const zoomFit = useCallback(() => { graphRef.current?.cameraPosition({ x: 18, y: 12, z: 18 }, { x: 0, y: 0, z: 0 }, 800); }, []);

  // ─── Control Panel ────────────────────────────────────────────────────────

  const controlPanel = (
    <div className="space-y-5">
      <div className="space-y-3 pb-4 border-b border-white/10">
        <p className="text-xs text-white/75 leading-relaxed">
          {data?.metadata.totalChannels || '…'} UAP channels positioned by their scores.
        </p>
        <div className="space-y-2 text-[11px] text-white/60">
          <div><strong className="text-white/80">X-axis</strong> — Intelligence Value</div>
          <div><strong className="text-white/80">Y-axis</strong> — Credibility Score</div>
          <div><strong className="text-white/80">Z-axis</strong> — Encounter Depth</div>
          <div><strong className="text-white/80">Size</strong> — Authority Score</div>
          <div><strong className="text-white/80">Color</strong> — Archetype</div>
        </div>
      </div>

      {/* Archetype legend */}
      <div className="space-y-2">
        <h3 className="text-xs font-medium text-white/70 uppercase tracking-wider">Channel Archetype</h3>
        <div className="space-y-1.5">
          {Object.entries(ARCHETYPE_COLORS).map(([archetype, color]) => (
            <div key={archetype} className="flex items-center gap-1.5 text-[11px]">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
              <span className="text-white/70">{archetype}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Top channels */}
      {data && (
        <div className="space-y-2 pt-2 border-t border-white/10">
          <h3 className="text-xs font-medium text-white/70 uppercase tracking-wider">
            Top 5 by Authority
          </h3>
          <div className="space-y-1.5">
            {data.channels.slice(0, 5).map((c, i) => (
              <div key={c.id} className="flex items-center gap-2 text-[11px]">
                <span className="text-white/50 w-3">{i + 1}.</span>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ARCHETYPE_COLORS[c.archetype] || '#94a3b8' }} />
                <span className="text-white/75 truncate flex-1">{c.name}</span>
                <span className="text-white/60 tabular-nums">{c.authority}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="text-xs text-white/50 leading-relaxed pt-2 border-t border-white/10">
        <p className="mb-1"><strong className="text-white/70">Click</strong> a channel for details</p>
        <p><strong className="text-white/70">Drag</strong> to rotate · <strong className="text-white/70">Scroll</strong> to zoom</p>
      </div>
    </div>
  );

  return (
    <VizPageShell
      title="Channel Constellation"
      subtitle={data ? `${data.metadata.totalChannels} channels in 3D space` : undefined}
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
