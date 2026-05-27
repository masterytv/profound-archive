'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Globe from 'react-globe.gl';
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { VizPageShell } from '@/components/viz/VizPageShell';
import { VizNodeTooltip, type TooltipData } from '@/components/viz/VizNodeTooltip';
import { useIsMobile } from '@/components/viz/hooks/useIsMobile';
import { useReducedMotion } from '@/components/viz/hooks/useReducedMotion';

// ─── Types ──────────────────────────────────────────────────────────────────

interface GlobePoint {
  id: string;
  label: string;
  country: string;
  state: string | null;
  lat: number;
  lng: number;
  count: number;
  topHynek: string | null;
  topEntity: string | null;
  topCraft: string | null;
}

interface GlobeData {
  points: GlobePoint[];
  metadata: {
    totalPoints: number;
    totalEncounters: number;
    computedAt: string;
  };
}

// ─── Hynek color mapping ────────────────────────────────────────────────────

const HYNEK_COLORS: Record<string, string> = {
  CE1: '#60a5fa',   // Blue — close encounter, no contact
  CE2: '#34d399',   // Green — physical traces
  CE3: '#f59e0b',   // Amber — entity contact
  CE4: '#ef4444',   // Red — abduction
  CE5: '#c084fc',   // Purple — initiated contact
  NL:  '#94a3b8',   // Slate — nocturnal light
  DD:  '#94a3b8',   // Slate — daylight disc
  RV:  '#94a3b8',   // Slate — radar-visual
};

const HYNEK_LABELS: Record<string, string> = {
  CE1: 'Close Encounter I',
  CE2: 'Close Encounter II (Traces)',
  CE3: 'Close Encounter III (Entity)',
  CE4: 'Close Encounter IV (Abduction)',
  CE5: 'Close Encounter V (Initiated)',
  NL:  'Nocturnal Light',
  DD:  'Daylight Disc',
  RV:  'Radar-Visual',
};

const ENTITY_LABELS: Record<string, string> = {
  humanoid: 'Humanoid', grey: 'Grey', light_being: 'Light Being',
  mantis: 'Mantis', reptilian: 'Reptilian', hybrid: 'Hybrid',
  nordic: 'Nordic', robotic: 'Robotic', none: 'None reported',
  unknown: 'Unknown', not_stated: 'Not stated',
};

const CRAFT_LABELS: Record<string, string> = {
  disc: 'Disc', triangle: 'Triangle', sphere: 'Sphere', cigar: 'Cigar',
  tic_tac: 'Tic Tac', diamond: 'Diamond', boomerang: 'Boomerang',
  unknown: 'Unknown', none: 'None', not_stated: 'Not stated',
};

// ─── Component ──────────────────────────────────────────────────────────────

export function GlobeGraph() {
  const globeRef = useRef<any>();
  const containerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const prefersReduced = useReducedMotion();

  const [globeData, setGlobeData] = useState<GlobeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [minEncounters, setMinEncounters] = useState(1);

  // ─── Fetch Data ───────────────────────────────────────────────────────────

  useEffect(() => {
    fetch('/api/viz/uap-globe')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        setGlobeData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('[globe-graph] fetch error:', err);
        setError('Failed to load visualization data');
        setLoading(false);
      });
  }, []);

  // ─── Countries GeoJSON for polygon borders ─────────────────────────────────

  const [countries, setCountries] = useState<any>({ features: [] });

  useEffect(() => {
    // Fetch from our own API proxy to avoid CSP issues with external CDNs
    fetch('/api/viz/countries')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(geoJson => setCountries(geoJson))
      .catch(() => {
        console.warn('[globe] Could not load countries GeoJSON');
      });
  }, []);

  // ─── Stop auto-rotate on user interaction ──────────────────────────────────

  const stopAutoRotate = useCallback(() => {
    if (!globeRef.current) return;
    try {
      const controls = globeRef.current.controls();
      if (controls) controls.autoRotate = false;
    } catch { /* controls not ready */ }
  }, []);

  // Listen for any mouse/touch interaction on the globe canvas
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('mousedown', stopAutoRotate);
    container.addEventListener('touchstart', stopAutoRotate);
    return () => {
      container.removeEventListener('mousedown', stopAutoRotate);
      container.removeEventListener('touchstart', stopAutoRotate);
    };
  }, [stopAutoRotate]);

  // ─── Configure Globe after mount ──────────────────────────────────────────

  useEffect(() => {
    if (!globeRef.current || !globeData) return;

    // Auto-rotate on first load only
    const controls = globeRef.current.controls();
    if (controls) {
      controls.autoRotate = !prefersReduced;
      controls.autoRotateSpeed = 0.4;
    }

    // Start with view of US
    globeRef.current.pointOfView({ lat: 35, lng: -95, altitude: 2.2 }, 1000);
  }, [globeData, prefersReduced]);

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

  // ─── Filtered Points ─────────────────────────────────────────────────────

  const filteredPoints = useMemo(() => {
    if (!globeData) return [];
    return globeData.points.filter(p => p.count >= minEncounters);
  }, [globeData, minEncounters]);

  // ─── Max encounter count for scaling ──────────────────────────────────────

  const maxCount = useMemo(() => {
    if (!globeData) return 100;
    return Math.max(...globeData.points.map(p => p.count));
  }, [globeData]);

  // ─── Zoom Controls ────────────────────────────────────────────────────────

  const handleZoomIn = useCallback(() => {
    if (!globeRef.current) return;
    const pov = globeRef.current.pointOfView();
    globeRef.current.pointOfView({ altitude: pov.altitude * 0.7 }, 400);
  }, []);

  const handleZoomOut = useCallback(() => {
    if (!globeRef.current) return;
    const pov = globeRef.current.pointOfView();
    globeRef.current.pointOfView({ altitude: Math.min(pov.altitude * 1.4, 4) }, 400);
  }, []);

  const handleZoomFit = useCallback(() => {
    if (!globeRef.current) return;
    globeRef.current.pointOfView({ lat: 20, lng: 0, altitude: 2.5 }, 800);
  }, []);

  // ─── Click Handler ────────────────────────────────────────────────────────

  const handlePointClick = useCallback((point: any, event: MouseEvent) => {
    const p = point as GlobePoint;

    // Stop rotation so user can examine the clicked location
    stopAutoRotate();
    if (globeRef.current) {
      globeRef.current.pointOfView(
        { lat: p.lat, lng: p.lng, altitude: p.state ? 1.5 : 2.0 },
        800
      );
    }

    const stats = [
      { label: 'Encounters', value: p.count.toLocaleString() },
    ];

    if (p.state) {
      stats.push({ label: 'State', value: p.state });
    }
    stats.push({ label: 'Country', value: p.country });

    if (p.topHynek && p.topHynek !== 'null') {
      stats.push({
        label: 'Top classification',
        value: HYNEK_LABELS[p.topHynek] || p.topHynek,
      });
    }
    if (p.topEntity && !['none', 'unknown', 'not_stated', 'null'].includes(p.topEntity)) {
      stats.push({
        label: 'Top entity',
        value: ENTITY_LABELS[p.topEntity] || p.topEntity.replace(/_/g, ' '),
      });
    }
    if (p.topCraft && !['none', 'unknown', 'not_stated', 'null'].includes(p.topCraft)) {
      stats.push({
        label: 'Top craft',
        value: CRAFT_LABELS[p.topCraft] || p.topCraft.replace(/_/g, ' '),
      });
    }

    // Build link to video-explore filtered by location
    const locationQuery = p.state || p.country.replace(/_/g, ' ');
    const href = `/uap/video-explore?q=${encodeURIComponent(locationQuery)}`;

    setTooltip({
      type: 'node',
      title: p.label,
      stats,
      x: event.clientX,
      y: event.clientY,
      href,
    });
  }, []);

  const handleBgClick = useCallback(() => {
    setTooltip(null);
  }, []);

  // ─── Point visual callbacks ───────────────────────────────────────────────

  const pointAltitude = useCallback((p: any) => {
    // Height above globe: 0.01 (tiny) to 0.15 (prominent)
    return 0.01 + (Math.log2(p.count + 1) / Math.log2(maxCount + 1)) * 0.14;
  }, [maxCount]);

  const pointRadius = useCallback((p: any) => {
    // Radius: 0.15 (small) to 0.8 (large)
    return 0.15 + (Math.sqrt(p.count) / Math.sqrt(maxCount)) * 0.65;
  }, [maxCount]);

  const pointColor = useCallback((p: any) => {
    const hynek = p.topHynek;
    return HYNEK_COLORS[hynek] || '#94a3b8';
  }, []);

  // ─── Control Panel ────────────────────────────────────────────────────────

  const controlPanel = (
    <div className="space-y-5">
      {/* ─── Description ─── */}
      <div className="space-y-3 pb-4 border-b border-white/10">
        <p className="text-xs text-white/75 leading-relaxed">
          {globeData?.metadata.totalEncounters.toLocaleString() || '…'} encounters
          mapped across {globeData?.metadata.totalPoints || '…'} locations worldwide.
        </p>
        <div className="space-y-2 text-[11px] text-white/60">
          <div className="flex items-center gap-2">
            <span className="flex-shrink-0 w-3.5 h-3.5 rounded-full bg-blue-400/80" />
            <span><strong className="text-white/80">Dot size</strong> — number of encounters</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex-shrink-0 w-3.5 h-3.5 rounded-full" style={{ background: 'linear-gradient(135deg, #60a5fa, #f59e0b, #ef4444)' }} />
            <span><strong className="text-white/80">Color</strong> — Hynek classification</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex-shrink-0 w-3.5 h-3.5 rounded-full bg-white/20" />
            <span><strong className="text-white/80">Height</strong> — encounter density</span>
          </div>
        </div>
      </div>

      {/* ─── Hynek Legend ─── */}
      <div className="space-y-2">
        <h3 className="text-xs font-medium text-white/70 uppercase tracking-wider">
          Hynek Classification
        </h3>
        <div className="space-y-1.5">
          {Object.entries(HYNEK_COLORS).slice(0, 5).map(([key, color]) => (
            <div key={key} className="flex items-center gap-2 text-[11px]">
              <span
                className="flex-shrink-0 w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-white/70">{HYNEK_LABELS[key]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Min Encounters Slider ─── */}
      <div className="space-y-2">
        <h3 className="text-xs font-medium text-white/70 uppercase tracking-wider">
          Min Encounters
        </h3>
        <div className="space-y-1.5">
          <input
            type="range"
            min={1}
            max={50}
            step={1}
            value={minEncounters}
            onChange={e => setMinEncounters(Number(e.target.value))}
            className="w-full accent-green-400"
          />
          <div className="flex justify-between text-xs text-white/60">
            <span>All</span>
            <span>{minEncounters > 1 ? `≥ ${minEncounters} encounters` : 'No filter'}</span>
          </div>
          {globeData && (
            <p className="text-[10px] text-white/50">
              Showing {filteredPoints.length} of {globeData.points.length} locations
            </p>
          )}
        </div>
      </div>

      {/* ─── Data Summary ─── */}
      {globeData && (
        <div className="space-y-2 pt-2 border-t border-white/10">
          <h3 className="text-xs font-medium text-white/70 uppercase tracking-wider">
            Data Summary
          </h3>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-white/60">
              <span>Total encounters</span>
              <span className="text-white/70 tabular-nums">
                {globeData.metadata.totalEncounters.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-white/60">
              <span>Visible locations</span>
              <span className="text-white/70 tabular-nums">
                {filteredPoints.length}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ─── Interaction Tips ─── */}
      <div className="text-xs text-white/50 leading-relaxed pt-2 border-t border-white/10">
        <p className="mb-1">
          <strong className="text-white/70">Click</strong> a location for details
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
      title="Global Encounter Map"
      subtitle={globeData ? `${globeData.metadata.totalEncounters.toLocaleString()} encounters across ${globeData.metadata.totalPoints} locations` : undefined}
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
          {globeData && (
            <Globe
              ref={globeRef}
              width={dimensions.width}
              height={dimensions.height}
              backgroundColor="#030014"
              showGlobe={true}
              showAtmosphere={true}
              atmosphereColor="#1e40af"
              atmosphereAltitude={0.15}
              globeImageUrl=""
              polygonsData={countries.features}
              polygonCapColor={() => 'rgba(20, 40, 80, 0.7)'}
              polygonSideColor={() => 'rgba(20, 40, 80, 0.3)'}
              polygonStrokeColor={() => 'rgba(100, 160, 255, 0.15)'}
              polygonAltitude={0.005}
              pointsData={filteredPoints}
              pointLat="lat"
              pointLng="lng"
              pointAltitude={pointAltitude}
              pointRadius={pointRadius}
              pointColor={pointColor}
              pointLabel=""
              onPointClick={handlePointClick}
              onGlobeClick={handleBgClick}
              animateIn={true}
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
              aria-label="Reset view"
              title="Reset view"
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
