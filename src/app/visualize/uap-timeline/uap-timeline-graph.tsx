'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import {
  ZoomIn, ZoomOut, Maximize, Play, Pause, RotateCcw,
} from 'lucide-react';
import { VizPageShell } from '@/components/viz/VizPageShell';
import { VizNodeTooltip, type TooltipData } from '@/components/viz/VizNodeTooltip';
import { useReducedMotion } from '@/components/viz/hooks/useReducedMotion';
import * as THREE from 'three';

// ─── Types ──────────────────────────────────────────────────────────────────

interface TimelinePoint {
  id: string;
  year: number;
  date: string | null;
  hynek: string;
  evidence: number;
  contact: number;
  transform: number;
  country: string;
  city: string | null;
  entityType: string;
  entityCount: number;
  name: string | null;
  label: string | null;
}

interface TimelineData {
  points: TimelinePoint[];
  metadata: { totalPoints: number; yearRange: [number, number]; computedAt: string };
}

type LayoutMode = 'helix' | 'linear' | 'ribbon';
type ColorMode = 'hynek' | 'entity';

// ─── Hynek styling (consistent with hynek-space viz) ────────────────────────

const HYNEK_COLORS: Record<string, string> = {
  CE1: '#60a5fa', CE2: '#34d399', CE3: '#f59e0b',
  CE4: '#ef4444', CE5: '#c084fc', NL: '#94a3b8',
  unknown: '#6b7280', not_stated: '#6b7280',
};

const HYNEK_HEX: Record<string, number> = {
  CE1: 0x60a5fa, CE2: 0x34d399, CE3: 0xf59e0b,
  CE4: 0xef4444, CE5: 0xc084fc, NL: 0x94a3b8,
  unknown: 0x6b7280, not_stated: 0x6b7280,
};

const HYNEK_LABELS: Record<string, string> = {
  CE1: 'Close Encounter I (Observation)',
  CE2: 'Close Encounter II (Physical Effects)',
  CE3: 'Close Encounter III (Entities)',
  CE4: 'Close Encounter IV (Abduction)',
  CE5: 'Close Encounter V (Initiation/Communication)',
  NL: 'Nocturnal Light',
  unknown: 'Unknown',
  not_stated: 'Not Stated',
};

// ─── Entity styling ─────────────────────────────────────────────────────────

const ENTITY_COLORS: Record<string, string> = {
  grey: '#94a3b8', humanoid: '#60a5fa', light_being: '#fbbf24',
  mantis: '#34d399', reptilian: '#ef4444', nordic: '#38bdf8',
  hybrid: '#c084fc', robotic: '#6b7280', shadow_entity: '#475569',
  multi_entity: '#f472b6', unknown: '#404040', none: '#333333',
  not_stated: '#333333',
};

const ENTITY_HEX: Record<string, number> = {
  grey: 0x94a3b8, humanoid: 0x60a5fa, light_being: 0xfbbf24,
  mantis: 0x34d399, reptilian: 0xef4444, nordic: 0x38bdf8,
  hybrid: 0xc084fc, robotic: 0x6b7280, shadow_entity: 0x475569,
  multi_entity: 0xf472b6, unknown: 0x404040, none: 0x333333,
  not_stated: 0x333333,
};

const ENTITY_LABELS: Record<string, string> = {
  grey: 'Grey', humanoid: 'Humanoid', light_being: 'Light Being',
  mantis: 'Mantis', reptilian: 'Reptilian', nordic: 'Nordic',
  hybrid: 'Hybrid', robotic: 'Robotic', shadow_entity: 'Shadow Entity',
  multi_entity: 'Multi-Entity', unknown: 'Unknown', none: 'None',
  not_stated: 'Not Stated',
};

// ─── Layout helpers ─────────────────────────────────────────────────────────

/** Map year to Y position using logarithmic compression for pre-1940 data */
function yearToY(year: number, minYear: number, maxYear: number): number {
  const MODERN_START = 1940;
  const TOTAL_HEIGHT = 40; // total vertical spread
  const PRE_MODERN_HEIGHT = 4; // compressed bottom section for pre-1940

  if (year <= MODERN_START) {
    // Compress 1670-1940 into bottom 4 units
    const t = (year - minYear) / Math.max(MODERN_START - minYear, 1);
    return -TOTAL_HEIGHT / 2 + t * PRE_MODERN_HEIGHT;
  }
  // 1940-2026 gets the remaining space
  const t = (year - MODERN_START) / Math.max(maxYear - MODERN_START, 1);
  return -TOTAL_HEIGHT / 2 + PRE_MODERN_HEIGHT + t * (TOTAL_HEIGHT - PRE_MODERN_HEIGHT);
}

/** Distribute points within a year into a ring/spiral pattern */
function yearPositions(
  points: TimelinePoint[],
  minYear: number,
  maxYear: number,
  layout: LayoutMode,
): { id: string; fx: number; fy: number; fz: number; point: TimelinePoint }[] {
  // Group by year
  const byYear = new Map<number, TimelinePoint[]>();
  for (const p of points) {
    if (!byYear.has(p.year)) byYear.set(p.year, []);
    byYear.get(p.year)!.push(p);
  }

  const result: { id: string; fx: number; fy: number; fz: number; point: TimelinePoint }[] = [];

  for (const [year, yearPoints] of byYear) {
    const y = yearToY(year, minYear, maxYear);
    const count = yearPoints.length;

    for (let i = 0; i < count; i++) {
      const p = yearPoints[i];
      let fx: number, fz: number;

      if (layout === 'helix') {
        // Spiral: angle based on year + index offset, radius based on count
        const baseAngle = ((year - minYear) / (maxYear - minYear)) * Math.PI * 12; // ~6 full turns
        const angle = baseAngle + (i / Math.max(count, 1)) * Math.PI * 2;
        const radius = 1.5 + Math.sqrt(count) * 0.3 + (i % 3) * 0.2;
        fx = Math.cos(angle) * radius;
        fz = Math.sin(angle) * radius;
      } else if (layout === 'linear') {
        // Simple linear: spread along X axis, no Z variation
        const spread = Math.min(count, 30);
        fx = ((i / Math.max(spread - 1, 1)) - 0.5) * 12 + (Math.random() - 0.5) * 0.3;
        fz = (Math.random() - 0.5) * 1.5;
      } else {
        // Ribbon: flatten into a wide band, use X for time sub-position
        const ribbonWidth = 10;
        const row = Math.floor(i / 20);
        const col = i % 20;
        fx = ((col / 19) - 0.5) * ribbonWidth;
        fz = row * 0.6 + (Math.random() - 0.5) * 0.2;
      }

      result.push({ id: p.id, fx, fy: y, fz, point: p });
    }
  }

  return result;
}

// ─── Decade marker helpers ──────────────────────────────────────────────────

const MODERN_ERA = 1947;

function getDecadeMarkers(minYear: number, maxYear: number) {
  const decades: { year: number; label: string; y: number }[] = [];

  // Single marker for all pre-1947 encounters
  decades.push({ year: MODERN_ERA, label: 'Pre-1947', y: yearToY(MODERN_ERA, minYear, maxYear) });

  // Decade markers from 1950 onward
  for (let d = 1950; d <= maxYear; d += 10) {
    decades.push({ year: d, label: `${d}`, y: yearToY(d, minYear, maxYear) });
  }
  return decades;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function UapTimelineGraph() {
  const graphRef = useRef<any>();
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReduced = useReducedMotion();
  const animFrameRef = useRef<number>();

  const [data, setData] = useState<TimelineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Controls
  const [layout, setLayout] = useState<LayoutMode>('helix');
  const [colorMode, setColorMode] = useState<ColorMode>('hynek');
  const [activeHynek, setActiveHynek] = useState<Set<string>>(new Set(Object.keys(HYNEK_COLORS)));
  const [yearRange, setYearRange] = useState<[number, number]>([1670, 2026]);
  const [scrubberValue, setScrubberValue] = useState(2026);
  const [isPlaying, setIsPlaying] = useState(false);

  // Scrubber operates from 1947 onward; pre-1947 encounters are always visible
  const SCRUBBER_MIN = MODERN_ERA;

  // ─── Fetch ──────────────────────────────────────────────────────────────

  useEffect(() => {
    fetch('/api/viz/uap-timeline')
      .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
      .then(d => {
        setData(d);
        if (d.metadata?.yearRange) {
          setYearRange(d.metadata.yearRange);
          setScrubberValue(d.metadata.yearRange[1]);
        }
        setLoading(false);
      })
      .catch(() => { setError('Failed to load timeline data'); setLoading(false); });
  }, []);

  // ─── Resize ─────────────────────────────────────────────────────────────

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(entries => {
      for (const e of entries) {
        setDimensions({ width: e.contentRect.width, height: e.contentRect.height });
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [loading]);

  // ─── Time scrubber animation ────────────────────────────────────────────

  useEffect(() => {
    if (!isPlaying || !data) return;
    const maxY = data.metadata.yearRange[1];
    // Start animation from 1947, not 1670
    let current = scrubberValue < maxY ? scrubberValue : SCRUBBER_MIN;
    const speed = 3; // years per second
    let lastTime = performance.now();

    const animate = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      current += speed * dt;
      if (current >= maxY) {
        current = maxY;
        setIsPlaying(false);
      }
      setScrubberValue(Math.round(current));
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  }, [isPlaying, data]);

  // ─── Build graph data ───────────────────────────────────────────────────

  const graphData = useMemo(() => {
    if (!data) return { nodes: [], links: [] };

    const [minYear, maxYear] = data.metadata.yearRange;

    // Filter by active Hynek types and year scrubber
    // Pre-1947 encounters are always visible; scrubber only controls 1947+
    const filtered = data.points.filter(p =>
      activeHynek.has(p.hynek) && (p.year < MODERN_ERA || p.year <= scrubberValue)
    );

    const positions = yearPositions(filtered, minYear, maxYear, layout);

    const nodes = positions.map(({ id, fx, fy, fz, point }) => ({
      id,
      fx, fy, fz,
      // Carry data for rendering and tooltip
      _year: point.year,
      _hynek: point.hynek,
      _entity: point.entityType,
      _evidence: point.evidence,
      _contact: point.contact,
      _transform: point.transform,
      _country: point.country,
      _city: point.city,
      _name: point.name,
      _label: point.label,
      _entityCount: point.entityCount,
      _date: point.date,
      _type: 'encounter' as const,
    }));

    return { nodes, links: [] };
  }, [data, activeHynek, scrubberValue, layout]);

  // ─── Decade markers (rendered as custom scene objects) ──────────────────

  const decadeMarkers = useMemo(() => {
    if (!data) return [];
    return getDecadeMarkers(data.metadata.yearRange[0], data.metadata.yearRange[1]);
  }, [data]);

  // Inject decade rings into the scene after graph mounts
  const decadeGroupRef = useRef<THREE.Group>();
  useEffect(() => {
    if (!graphRef.current || !data) return;
    const scene = graphRef.current.scene();
    if (!scene) return;

    // Remove old decade markers
    if (decadeGroupRef.current) {
      scene.remove(decadeGroupRef.current);
      decadeGroupRef.current.traverse((child: any) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
    }

    const group = new THREE.Group();
    group.name = 'decade-markers';

    for (const { year, label, y } of decadeMarkers) {
      // Only show decade markers up to scrubber position
      if (year > scrubberValue) continue;

      // Ring — only for post-1947 decades (skip Pre-1947 ring to avoid blob)
      if (year >= 1950) {
        const ringGeo = new THREE.RingGeometry(0.8, 6, 64);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0x60a5fa,
          transparent: true,
          opacity: 0.06,
          side: THREE.DoubleSide,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.set(0, y, 0);
        ring.rotation.x = -Math.PI / 2;
        group.add(ring);
      }

      // Label as a sprite
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = label === 'Pre-1947' ? 'rgba(255,255,255,0.50)' : 'rgba(255,255,255,0.70)';
        ctx.font = label === 'Pre-1947' ? 'italic 38px sans-serif' : 'bold 42px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(label, 256, 48);
      }
      const texture = new THREE.CanvasTexture(canvas);
      const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.position.set(8.5, y, 0);
      sprite.scale.set(6, 0.9, 1);
      group.add(sprite);
    }

    // Central spine line
    const [minY, maxY] = data.metadata.yearRange;
    const spineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, yearToY(minY, minY, maxY) - 1, 0),
      new THREE.Vector3(0, yearToY(Math.min(scrubberValue, maxY), minY, maxY) + 1, 0),
    ]);
    const spineMat = new THREE.LineBasicMaterial({ color: 0x60a5fa, transparent: true, opacity: 0.15 });
    const spine = new THREE.Line(spineGeo, spineMat);
    group.add(spine);

    scene.add(group);
    decadeGroupRef.current = group;
  }, [decadeMarkers, data, scrubberValue]);

  // ─── Configure after mount ──────────────────────────────────────────────

  useEffect(() => {
    if (!graphRef.current || !data) return;
    const controls = graphRef.current.controls();
    if (controls) {
      controls.autoRotate = !prefersReduced;
      controls.autoRotateSpeed = 0.4;
    }
    // Camera: slightly above, looking at center
    graphRef.current.cameraPosition({ x: 15, y: 5, z: 15 }, { x: 0, y: 0, z: 0 }, 1500);
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

  // ─── Node rendering ────────────────────────────────────────────────────

  const nodeThreeObject = useCallback((node: any) => {
    const colorHex = colorMode === 'hynek'
      ? (HYNEK_HEX[node._hynek] || 0x6b7280)
      : (ENTITY_HEX[node._entity] || 0x404040);

    // Base sphere
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 8, 8),
      new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.85 }),
    );

    // Glow sphere (additive blend for subtle aura)
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 8, 8),
      new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.15,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    sphere.add(glow);

    return sphere;
  }, [colorMode]);

  // ─── Click handler ──────────────────────────────────────────────────────

  const handleNodeClick = useCallback((node: any, event: MouseEvent) => {
    stopRotation();
    const stats: { label: string; value: string }[] = [
      { label: 'Year', value: node._date || String(node._year) },
      { label: 'Hynek type', value: HYNEK_LABELS[node._hynek] || node._hynek },
    ];
    if (node._entity && !['none', 'unknown', 'not_stated'].includes(node._entity)) {
      stats.push({
        label: 'Entity',
        value: node._entity === 'multi_entity'
          ? `Multi-Entity (${node._entityCount} types)`
          : (ENTITY_LABELS[node._entity] || node._entity.replace(/_/g, ' ')),
      });
    }
    if (node._evidence) stats.push({ label: 'Evidence', value: `${node._evidence}` });
    if (node._contact) stats.push({ label: 'Contact depth', value: `${node._contact}` });
    if (node._transform) stats.push({ label: 'Transformation', value: `${node._transform}` });
    if (node._country && node._country !== 'unknown') {
      stats.push({ label: 'Location', value: [node._city, node._country.replace(/_/g, ' ')].filter(Boolean).join(', ') });
    }

    const title = node._name || node._label || `Encounter ${node._year}`;
    // Build experiencer page link from name
    const slug = node._name
      ? node._name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      : null;
    const href = slug ? `/uap/persons/${slug}` : undefined;
    setTooltip({ type: 'node', title, stats, x: event.clientX, y: event.clientY, href });
  }, [stopRotation]);

  // ─── Toggle helpers ─────────────────────────────────────────────────────

  const toggleHynek = useCallback((key: string) => {
    setActiveHynek(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  // Combined toggle for unknown + not_stated (shown as a single legend entry)
  const toggleUnknown = useCallback(() => {
    setActiveHynek(prev => {
      const next = new Set(prev);
      const isActive = next.has('unknown') || next.has('not_stated');
      if (isActive) { next.delete('unknown'); next.delete('not_stated'); }
      else { next.add('unknown'); next.add('not_stated'); }
      return next;
    });
  }, []);

  // ─── Decade stats for sidebar ───────────────────────────────────────────
  // Groups all pre-1947 encounters into one bucket

  const decadeStats = useMemo(() => {
    if (!data) return [];
    const buckets = new Map<string, number>();
    for (const p of data.points) {
      if (p.year > scrubberValue) continue;
      const key = p.year < MODERN_ERA ? 'Pre-1947' : `${Math.floor(p.year / 10) * 10}s`;
      buckets.set(key, (buckets.get(key) || 0) + 1);
    }
    // Sort: Pre-1947 first, then by decade
    return Array.from(buckets.entries()).sort((a, b) => {
      if (a[0] === 'Pre-1947') return -1;
      if (b[0] === 'Pre-1947') return 1;
      return parseInt(a[0]) - parseInt(b[0]);
    });
  }, [data, scrubberValue]);

  // ─── Zoom Controls ──────────────────────────────────────────────────────

  const zoomIn = useCallback(() => {
    graphRef.current?.cameraPosition({ z: graphRef.current.camera().position.z * 0.7 }, null, 400);
  }, []);
  const zoomOut = useCallback(() => {
    graphRef.current?.cameraPosition({ z: Math.min(graphRef.current.camera().position.z * 1.4, 60) }, null, 400);
  }, []);
  const zoomFit = useCallback(() => {
    graphRef.current?.cameraPosition({ x: 15, y: 5, z: 15 }, { x: 0, y: 0, z: 0 }, 800);
  }, []);

  // ─── Count visible ─────────────────────────────────────────────────────

  const visibleCount = graphData.nodes.length;

  // ─── Control Panel ──────────────────────────────────────────────────────

  const controlPanel = (
    <div className="space-y-5">
      {/* Description and axis explanation */}
      <div className="space-y-3 pb-4 border-b border-white/10">
        <p className="text-xs text-white/75 leading-relaxed">
          {visibleCount.toLocaleString()} of{' '}
          {data?.metadata.totalPoints.toLocaleString() || '…'} encounters plotted across time.
          Each dot is one reported encounter.
        </p>
        <div className="space-y-2 text-[11px] text-white/60">
          <div><strong className="text-white/80">Vertical axis</strong> — Time (years). Bottom = earliest, top = most recent.</div>
          <div><strong className="text-white/80">Horizontal spread</strong> — Distributes encounters within each year for visibility. Dense years (e.g., 1977 with 88 reports) form wider rings.</div>
          <div><strong className="text-white/80">Color</strong> — Hynek Classification (or Entity Type when toggled)</div>
        </div>
      </div>

      {/* Time scrubber */}
      {data && (
        <div className="space-y-2 pb-4 border-b border-white/10">
          <h3 className="text-xs font-medium text-white/70 uppercase tracking-wider">
            Time Range
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg
                bg-green-500/20 hover:bg-green-500/30 border border-green-500/30
                text-green-300 transition-all duration-200 cursor-pointer"
              aria-label={isPlaying ? 'Pause' : 'Play timeline'}
            >
              {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            </button>
            <div className="flex-1 flex flex-col gap-1">
              <input
                type="range"
                min={SCRUBBER_MIN}
                max={data.metadata.yearRange[1]}
                value={scrubberValue}
                onChange={e => { setScrubberValue(Number(e.target.value)); setIsPlaying(false); }}
                className="w-full h-1.5 rounded-full appearance-none bg-white/10 cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3
                  [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:bg-green-400 [&::-webkit-slider-thumb]:shadow-lg
                  [&::-webkit-slider-thumb]:shadow-green-500/30"
              />
              <div className="flex justify-between text-[10px] text-white/50 tabular-nums">
                <span>{SCRUBBER_MIN}</span>
                <span className="text-green-300/70 font-medium text-xs">{scrubberValue}</span>
                <span>{data.metadata.yearRange[1]}</span>
              </div>
            </div>
            <button
              onClick={() => { setScrubberValue(data.metadata.yearRange[1]); setIsPlaying(false); }}
              className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg
                bg-white/5 hover:bg-white/10 border border-white/10
                text-white/50 hover:text-white/70 transition-all duration-200 cursor-pointer"
              aria-label="Reset to show all years"
              title="Show all"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Layout mode selector */}
      <div className="space-y-2">
        <h3 className="text-xs font-medium text-white/70 uppercase tracking-wider">
          Layout
        </h3>
        <div className="flex gap-1.5">
          {([['helix', 'Helix'], ['linear', 'Linear'], ['ribbon', 'Ribbon']] as const).map(([mode, label]) => (
            <button
              key={mode}
              onClick={() => setLayout(mode)}
              className={`flex-1 text-[11px] py-1.5 rounded-lg border transition-all duration-200 cursor-pointer ${
                layout === mode
                  ? 'bg-green-500/20 border-green-500/40 text-green-300'
                  : 'bg-white/5 border-white/10 text-white/55 hover:text-white/75'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Color mode */}
      <div className="space-y-2">
        <h3 className="text-xs font-medium text-white/70 uppercase tracking-wider">
          Color By
        </h3>
        <div className="flex gap-1.5">
          {([['hynek', 'Hynek Type'], ['entity', 'Entity Type']] as const).map(([mode, label]) => (
            <button
              key={mode}
              onClick={() => setColorMode(mode)}
              className={`flex-1 text-[11px] py-1.5 rounded-lg border transition-all duration-200 cursor-pointer ${
                colorMode === mode
                  ? 'bg-green-500/20 border-green-500/40 text-green-300'
                  : 'bg-white/5 border-white/10 text-white/55 hover:text-white/75'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Hynek / Entity type toggles */}
      {colorMode === 'hynek' ? (
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-white/70 uppercase tracking-wider">
            Hynek Type
          </h3>
          <div className="space-y-1.5">
            {Object.entries(HYNEK_COLORS).filter(([k]) => !['unknown', 'not_stated'].includes(k)).map(([key, color]) => (
              <button
                key={key}
                onClick={() => toggleHynek(key)}
                className={`flex items-center gap-2 text-[11px] w-full text-left transition-opacity cursor-pointer ${
                  activeHynek.has(key) ? 'opacity-100' : 'opacity-30'
                }`}
              >
                <span className="flex-shrink-0 w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-white/75">{HYNEK_LABELS[key]}</span>
              </button>
            ))}
            {/* Combined unknown + not_stated toggle */}
            <button
              onClick={toggleUnknown}
              className={`flex items-center gap-2 text-[11px] w-full text-left transition-opacity cursor-pointer ${
                activeHynek.has('unknown') || activeHynek.has('not_stated') ? 'opacity-100' : 'opacity-30'
              }`}
            >
              <span className="flex-shrink-0 w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#6b7280' }} />
              <span className="text-white/75">Unknown / Not Stated</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-white/70 uppercase tracking-wider">
            Entity Types
          </h3>
          <div className="space-y-1 max-h-44 overflow-y-auto">
            {Object.entries(ENTITY_COLORS)
              .filter(([k]) => !['unknown', 'none', 'not_stated'].includes(k))
              .map(([key, color]) => (
                <div key={key} className="flex items-center gap-2 text-[11px]">
                  <span className="flex-shrink-0 w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-white/70">{ENTITY_LABELS[key] || key}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Top decades */}
      {decadeStats.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-white/10">
          <h3 className="text-xs font-medium text-white/70 uppercase tracking-wider">
            Encounters by Decade
          </h3>
          <div className="space-y-1 max-h-44 overflow-y-auto">
            {decadeStats
              .filter(([, cnt]) => cnt > 0)
              .map(([label, cnt]) => (
                <div key={label} className="flex items-center justify-between text-[10px] text-white/60">
                  <span>{label}</span>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-1.5 rounded-full bg-green-500/40"
                      style={{ width: `${Math.max(4, (cnt / Math.max(...decadeStats.map(d => d[1]))) * 60)}px` }}
                    />
                    <span className="tabular-nums w-6 text-right">{cnt}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      <div className="text-xs text-white/50 leading-relaxed pt-2 border-t border-white/10">
        <p className="mb-1"><strong className="text-white/70">Click</strong> a point for details</p>
        <p><strong className="text-white/70">Drag</strong> to rotate · <strong className="text-white/70">Scroll</strong> to zoom</p>
      </div>
    </div>
  );

  return (
    <VizPageShell
      title="UAP Timeline Helix"
      subtitle={data ? `${visibleCount.toLocaleString()} encounters · ${data.metadata.yearRange[0]}–${scrubberValue}` : undefined}
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


          {/* ─── Zoom Controls ─── */}
          <div className="absolute bottom-6 left-4 sm:left-6 z-50 flex flex-col gap-1.5">
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
