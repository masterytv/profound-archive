'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Compass, Route, Search, X, Quote as QuoteIcon, ExternalLink,
  ShieldCheck, Layers, RotateCcw, ChevronRight, Info, Waypoints,
} from 'lucide-react';
import { VizPageShell } from '@/components/viz/VizPageShell';
import { useIsMobile } from '@/components/viz/hooks/useIsMobile';
import { useReducedMotion } from '@/components/viz/hooks/useReducedMotion';
import { AfterlifeScene, CATEGORY_COLOR, type NodeHit } from './scene';
import type { AfterlifeMapData, Place, StratumKey } from './types';

const STRATA: { key: StratumKey; label: string; blurb: string }[] = [
  { key: 'all', label: 'All accounts', blurb: 'Every clear NDE in the archive' },
  { key: 'cv13', label: 'Moderate+', blurb: 'cvNDE ≥ 13 — some verified perception' },
  { key: 'cv18', label: 'High', blurb: 'cvNDE ≥ 18 — strongly evidenced' },
  { key: 'cv23', label: 'Exceptional', blurb: 'cvNDE ≥ 23 — the best-evidenced accounts' },
];

const CATEGORY_LABEL: Record<string, string> = {
  threshold: 'Passage', realm: 'Realm', structure: 'Structure', landscape: 'Landscape',
  boundary: 'Boundary', process: 'What happens', being: 'Who is there', state: 'State of being',
};

const hex = (n: number) => '#' + n.toString(16).padStart(6, '0');

export function AfterlifeMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<AfterlifeScene | null>(null);
  const isMobile = useIsMobile();
  const prefersReduced = useReducedMotion();

  const [data, setData] = useState<AfterlifeMapData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stratum, setStratum] = useState<StratumKey>('all');
  const [tradition, setTradition] = useState<string | null>(null);
  const [mode, setMode] = useState<'overview' | 'travel'>('overview');
  const [travel, setTravel] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hover, setHover] = useState<NodeHit | null>(null);
  const [labels, setLabels] = useState<{ id: string; x: number; y: number; scale: number }[]>([]);
  const [query, setQuery] = useState('');
  // Open by default and only ever changed from an event handler. Deriving this from a media
  // query raced with hydration: useIsMobile reads matchMedia in an effect, and the browser can
  // report a 0px width at that moment, which latched the index shut on desktop.
  const [indexOpen, setIndexOpen] = useState(true);
  const [webglFailed, setWebglFailed] = useState(false);
  const [threadsOn, setThreadsOn] = useState(false);
  const [methodsOpen, setMethodsOpen] = useState(false);

  const byId = useMemo(() => new Map((data?.places ?? []).map(p => [p.id, p])), [data]);
  const selected = selectedId ? byId.get(selectedId) ?? null : null;
  const hovered = hover ? byId.get(hover.id) ?? null : null;

  // ─── Data ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    let live = true;
    fetch('/api/viz/afterlife-map')
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(j => { if (live) setData(j); })
      .catch(e => { if (live) setError(e.message); });
    return () => { live = false; };
  }, []);

  // ─── Scene lifecycle ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!data || !containerRef.current || sceneRef.current) return;
    let cancelled = false;
    // Built on the next frame rather than in the effect body: laying out 181 nodes and
    // relaxing them is heavy enough to be worth keeping off the first paint, and it means a
    // WebGL failure is reported from a callback instead of synchronously mid-effect.
    const raf = requestAnimationFrame(() => {
      if (cancelled || !containerRef.current) return;
      try {
        sceneRef.current = new AfterlifeScene(
          containerRef.current,
          data.places,
          { onHover: setHover, onSelect: setSelectedId, onLabels: setLabels, onProgress: setTravel },
          { reducedMotion: prefersReduced, mobile: isMobile, threads: data.threads },
        );
      } catch (e) {
        console.error('[afterlife-map] WebGL init failed:', e);
        setWebglFailed(true);
      }
    });
    const onResize = () => sceneRef.current?.resize();
    window.addEventListener('resize', onResize);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
  }, [data, prefersReduced, isMobile]);

  useEffect(() => { sceneRef.current?.setStratum(stratum); }, [stratum]);
  useEffect(() => { sceneRef.current?.setTradition(tradition); }, [tradition]);
  useEffect(() => { sceneRef.current?.setMode(mode); }, [mode]);
  useEffect(() => { sceneRef.current?.setSelected(selectedId); }, [selectedId]);
  useEffect(() => { sceneRef.current?.setThreads(threadsOn); }, [threadsOn]);

  // Scrolling the canvas in travel mode moves you along the journey rather than zooming.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || mode !== 'travel') return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setTravel(t => {
        const next = Math.max(0, Math.min(1, t + e.deltaY * 0.00035));
        sceneRef.current?.setTravel(next);
        return next;
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [mode]);

  const pick = useCallback((id: string) => {
    setSelectedId(id);
    sceneRef.current?.setSelected(id);
    sceneRef.current?.focus(id);
    if (isMobile) setIndexOpen(false);   // on a phone the map needs the whole screen
  }, [isMobile]);

  // ─── Derived ──────────────────────────────────────────────────────────────
  const ranked = useMemo(() => {
    const list = [...(data?.places ?? [])].sort((a, b) => b.confidence[stratum] - a.confidence[stratum]);
    if (!query.trim()) return list;
    const q = query.toLowerCase();
    return list.filter(p =>
      p.name.toLowerCase().includes(q)
      || p.id.includes(q)
      || p.aliases.some(a => a.term.toLowerCase().includes(q))
      || p.description.toLowerCase().includes(q));
  }, [data, stratum, query]);

  if (error) {
    return (
      <VizPageShell title="The Map of the Afterlife" subtitle="Data unavailable">
        <div className="flex h-full items-center justify-center text-white/60 px-6 text-center">
          Could not load the map data ({error}).
        </div>
      </VizPageShell>
    );
  }

  return (
    <VizPageShell
      title="The Map of the Afterlife"
      subtitle={data ? `${data.corpusSize.toLocaleString()} experiencers · ${data.accountCount.toLocaleString()} accounts` : 'Loading…'}
      domain="nde"
      isLoading={!data}
    >
      {/* ─── Canvas ───
          Overlays are `fixed`, not `absolute`: the global site header occupies layout space
          above VizPageShell, so its 100dvh box overhangs the viewport and anything anchored
          to the shell's bottom edge would fall below the fold. */}
      <div ref={containerRef} className="fixed inset-x-0 bottom-0 top-14" style={{ touchAction: mode === 'travel' ? 'none' : 'auto' }} />

      {webglFailed && (
        <div className="fixed inset-x-0 bottom-0 top-14 overflow-auto bg-[#030014] p-6">
          <p className="mx-auto mb-6 max-w-2xl text-sm text-white/60">
            3D rendering is unavailable in this browser. Here is the same map as a ranked list.
          </p>
          <ul className="mx-auto max-w-2xl space-y-2">
            {ranked.map(p => (
              <li key={p.id}>
                <button onClick={() => setSelectedId(p.id)} className="w-full rounded-lg border border-white/10 bg-white/5 p-3 text-left hover:bg-white/10">
                  <span className="text-white">{p.name}</span>
                  <span className="ml-2 text-white/40 text-sm">c = {p.confidence[stratum].toFixed(3)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ─── 3D labels projected into the DOM for crisp type ─── */}
      {!webglFailed && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 top-14 overflow-hidden">
          {labels.map(l => {
            const p = byId.get(l.id);
            if (!p) return null;
            const isActive = l.id === selectedId || l.id === hover?.id;
            return (
              <div
                key={l.id}
                className="absolute -translate-x-1/2 whitespace-nowrap will-change-transform"
                style={{ left: l.x, top: l.y + 14 * l.scale, opacity: isActive ? 1 : 0.55 + l.scale * 0.2 }}
              >
                <span
                  className="font-body font-medium tracking-wide"
                  style={{
                    fontSize: `${10 * l.scale}px`,
                    color: isActive ? '#fff' : hex(CATEGORY_COLOR[p.category] ?? 0x94a3b8),
                    textShadow: '0 1px 8px rgba(0,0,0,0.95), 0 0 22px rgba(0,0,0,0.8)',
                  }}
                >
                  {p.name}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Hover card ─── */}
      {hovered && hover && !selected && (
        <div
          className="pointer-events-none fixed z-30 max-w-[240px] -translate-x-1/2 rounded-xl border border-white/10 bg-[#0a0620]/95 px-3 py-2 shadow-2xl backdrop-blur"
          style={{ left: hover.x, top: hover.y + 70 }}
        >
          <p className="font-heading text-sm text-white">{hovered.name}</p>
          <p className="mt-0.5 text-[11px] text-white/50">
            c = {hovered.confidence[stratum].toFixed(3)} · {hovered.n[stratum].toLocaleString()} experiencers
          </p>
        </div>
      )}

      {/* ─── Bottom control bar ─── */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/5 bg-[#030014]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:gap-6">
          {/* Mode */}
          <div className="flex shrink-0 items-center gap-1 rounded-lg bg-white/5 p-1">
            {([['overview', Compass, 'Overview'], ['travel', Route, 'Journey']] as const).map(([m, Icon, label]) => (
              <button
                key={m}
                onClick={() => { setMode(m); if (m === 'overview') sceneRef.current?.resetView(); }}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  mode === m ? 'bg-white/15 text-white' : 'text-white/50 hover:text-white/80'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>

          {/* Travel scrubber */}
          {mode === 'travel' && (
            <label className="flex min-w-0 flex-1 items-center gap-3">
              <span className="shrink-0 text-[11px] uppercase tracking-wider text-white/40">The body</span>
              <input
                type="range" min={0} max={1} step={0.001} value={travel}
                onChange={e => { const v = Number(e.target.value); setTravel(v); sceneRef.current?.setTravel(v); }}
                className="h-1 w-full cursor-pointer appearance-none rounded-full bg-white/15 accent-blue-400"
                aria-label="Position along the journey"
              />
              <span className="shrink-0 text-[11px] uppercase tracking-wider text-white/40">Return</span>
            </label>
          )}

          {/* Evidence threshold */}
          {mode !== 'travel' && (
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-emerald-400/80">
                <ShieldCheck className="h-3.5 w-3.5" /> Evidence
              </span>
              {STRATA.map(s => (
                <button
                  key={s.key}
                  onClick={() => setStratum(s.key)}
                  title={s.blurb}
                  className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                    stratum === s.key
                      ? 'bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-400/40'
                      : 'text-white/45 hover:bg-white/5 hover:text-white/75'
                  }`}
                >
                  {s.label}
                </button>
              ))}
              {data && (
                <span className="text-[11px] text-white/30">
                  n = {data.strata[stratum].toLocaleString()}
                </span>
              )}
            </div>
          )}

          {/* Tradition lens */}
          {data && data.traditions.length > 0 && (
            <div className="flex shrink-0 items-center gap-2">
              <Layers className="h-3.5 w-3.5 text-white/40" />
              <select
                value={tradition ?? ''}
                onChange={e => setTradition(e.target.value || null)}
                className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/80 outline-none focus:ring-1 focus:ring-blue-400"
                aria-label="Cultural lens"
              >
                <option value="" className="bg-[#0a0620]">All traditions</option>
                {data.traditions.map(t => (
                  <option key={t} value={t} className="bg-[#0a0620]">{t}</option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={() => setThreadsOn(v => !v)}
            title="Draw one faint line per sampled account, through the places that person reported"
            className={`flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs transition-colors ${
              threadsOn ? 'bg-sky-500/20 text-sky-200 ring-1 ring-sky-400/40' : 'text-white/45 hover:bg-white/5 hover:text-white/80'
            }`}
          >
            <Waypoints className="h-3.5 w-3.5" /> Journeys
          </button>

          <button
            onClick={() => setMethodsOpen(true)}
            className="flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-white/45 hover:bg-white/5 hover:text-white/80"
          >
            <Info className="h-3.5 w-3.5" /> Method
          </button>

          <button
            onClick={() => { sceneRef.current?.resetView(); setSelectedId(null); }}
            className="hidden shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-white/45 hover:bg-white/5 hover:text-white/80 sm:flex"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </button>
        </div>
      </div>

      {/* ─── Index (left) ─── */}
      <div className={`fixed left-0 top-14 bottom-[4.6rem] z-20 w-72 transform border-r border-white/5 bg-[#030014]/92 backdrop-blur-md transition-transform ${indexOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-full flex-col">
          <div className="border-b border-white/5 p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search places, names, details…"
                className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-8 pr-3 text-xs text-white placeholder:text-white/30 outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>
            <p className="mt-2 text-[10px] uppercase tracking-wider text-white/30">
              {ranked.length} places · sorted by how many saw it
            </p>
          </div>
          <ul className="flex-1 overflow-y-auto p-2">
            {ranked.map(p => {
              const c = p.confidence[stratum];
              return (
                <li key={p.id}>
                  <button
                    onClick={() => pick(p.id)}
                    className={`group flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors ${
                      selectedId === p.id ? 'bg-white/10' : 'hover:bg-white/5'
                    }`}
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: hex(CATEGORY_COLOR[p.category] ?? 0x94a3b8), opacity: 0.35 + c * 0.65 }}
                    />
                    <span className="min-w-0 flex-1 truncate text-xs text-white/80 group-hover:text-white">{p.name}</span>
                    <span className="shrink-0 font-mono text-[10px] text-white/35">{c.toFixed(2)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <button
        onClick={() => setIndexOpen(v => !v)}
        className={`fixed top-1/2 z-20 -translate-y-1/2 rounded-r-lg border border-l-0 border-white/10 bg-[#030014]/92 p-1.5 text-white/50 backdrop-blur transition-all hover:text-white ${indexOpen ? 'left-72' : 'left-0'}`}
        aria-label={indexOpen ? 'Hide index' : 'Show index'}
      >
        <ChevronRight className={`h-4 w-4 transition-transform ${indexOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* ─── Method note ─── */}
      {methodsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => setMethodsOpen(false)}>
          <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-[#0a0620] p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between">
              <h2 className="font-heading text-2xl text-white">How this map was made</h2>
              <button onClick={() => setMethodsOpen(false)} className="rounded-lg p-1 text-white/40 hover:bg-white/10 hover:text-white" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4 font-body text-sm leading-relaxed text-white/70">
              <p>
                Every place on this map was found by reading {data?.accountCount.toLocaleString()} recorded
                near-death accounts. Nothing here is drawn from scripture, folklore, or any single
                tradition — only from what experiencers themselves said happened to them.
              </p>
              <p>
                <strong className="text-white/90">People, not videos.</strong> Those accounts are not{' '}
                {data?.accountCount.toLocaleString()} different people. Many experiencers have been
                interviewed repeatedly — one appears thirty-five times — so counting recordings would
                let a handful of well-known voices vote over and over. Every figure here is therefore
                computed over <strong className="text-white/90">{data?.corpusSize.toLocaleString()} unique
                experiencers</strong>: a person counts once for a place if any of their tellings
                describe it.
              </p>
              <p>
                <strong className="text-white/90">What <span className="font-mono">c</span> means.</strong>{' '}
                Each place carries a confidence value: the estimated share of accounts describing it.
                It is measured, not estimated — a pattern is matched across the whole corpus, then a
                random sample of the passages it caught is read and judged, and the raw count is
                corrected by how often the pattern was actually right. The ± figure is the 95%
                interval from that audit.
              </p>
              <p>
                <strong className="text-white/90">It is a rate of mention, not of experience.</strong>{' '}
                <span className="font-mono">c</span> is an estimated share, not a statistical
                confidence. A low number does not mean a place is unreal or rare — only that few
                people said so. Someone who never mentions a garden may well have walked through one:
                interviews are finite, interviewers steer, and nobody inventories an afterlife.
              </p>
              <p>
                <strong className="text-white/90">Known one-sidedness.</strong> We measured how often
                a pattern was <em>wrong</em> and corrected each figure downward for it. We did not
                measure how often a pattern was <em>missed</em> — someone describing &ldquo;the most
                beautiful lawn&rdquo; instead of grass. So three different silences look identical
                here: it did not happen, it happened and went unmentioned, or it was described in
                words the pattern did not know. Treat every number as a floor with an unmeasured
                ceiling rather than as a settled quantity.
              </p>
              <p>
                <strong className="text-white/90">Who is counted.</strong> These are people who
                survived, chose to speak publicly, and were recorded across 59 channels — the largest
                accounts for one in ten. That is not a random sample of everyone who has come near
                death, and the map inherits whatever that selection favours. An interviewer who
                always asks about tunnels will produce a corpus that mentions tunnels.
              </p>
              <p>
                <strong className="text-white/90">The evidence filter.</strong> The cvNDE score rates
                how well an account&rsquo;s verifiable claims hold up — whether the person reported
                things they could not have perceived, and whether anyone confirmed them. Raising the
                threshold redraws the map using only the better-evidenced accounts. Watch which
                places hold their brightness and which fade.
              </p>
              <p>
                <strong className="text-white/90">The edge of the map.</strong> The boundary marked
                near the end of the journey is the point past which accounts stop. No one describes
                what lies beyond it, so nothing is drawn there.
              </p>
            </div>
            <p className="mt-5 border-t border-white/10 pt-4 text-xs text-white/35">
              Built from the Project Profound archive · {data?.generatedAt}
            </p>
          </div>
        </div>
      )}

      {/* ─── Detail panel (right) ─── */}
      {selected && (
        <aside className="fixed right-0 top-14 bottom-[4.6rem] z-40 w-full overflow-y-auto border-l border-white/5 bg-[#0a0620]/96 backdrop-blur-xl sm:w-[26rem]">
          <div className="p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-widest" style={{ color: hex(CATEGORY_COLOR[selected.category] ?? 0x94a3b8) }}>
                  {CATEGORY_LABEL[selected.category] ?? selected.category}
                </p>
                <h2 className="font-heading text-2xl leading-tight text-white">{selected.name}</h2>
                {selected.parent && byId.get(selected.parent) && (
                  <button
                    onClick={() => pick(selected.parent!)}
                    className="mt-1 text-xs text-white/40 transition-colors hover:text-white/70"
                  >
                    part of <span className="underline decoration-white/20 underline-offset-2">{byId.get(selected.parent)!.name}</span>
                    {selected.containment != null && ` · ${Math.round(selected.containment * 100)}% of those who described this also described that`}
                  </button>
                )}
              </div>
              <button onClick={() => setSelectedId(null)} className="rounded-lg p-1 text-white/40 hover:bg-white/10 hover:text-white" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Confidence block */}
            <div className="mb-5 rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="mb-1 text-[10px] uppercase tracking-widest text-white/35">Share who described it</p>
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-3xl text-white">c = {selected.confidence[stratum].toFixed(3)}</span>
                <span className="text-xs text-white/40">± {selected.ci95.toFixed(3)}</span>
              </div>
              <p className="mt-1 text-xs text-white/50">
                {(selected.confidence[stratum] * 100).toFixed(1)}% of {data?.strata[stratum].toLocaleString()} experiencers
                {' · '}{selected.n[stratum].toLocaleString()} reported it
              </p>
              {(() => {
                // Bars share one scale (the place's own maximum) so the shape of the
                // comparison is readable even for a place only 2% of people mention.
                const peak = Math.max(...STRATA.map(s => selected.confidence[s.key]), 0.001);
                return (
                  <div className="mt-3 grid grid-cols-4 gap-1.5">
                    {STRATA.map(s => (
                      <div key={s.key} className="text-center">
                        <div className="mb-1 flex h-12 w-full items-end rounded bg-white/5">
                          <div
                            className={`w-full rounded ${s.key === stratum ? 'bg-emerald-300/80' : 'bg-emerald-400/40'}`}
                            style={{ height: `${Math.max(4, (selected.confidence[s.key] / peak) * 100)}%` }}
                          />
                        </div>
                        <p className="font-mono text-[9px] text-white/45">{(selected.confidence[s.key] * 100).toFixed(0)}%</p>
                        <p className="text-[9px] leading-tight text-white/30">{s.label.replace(' accounts', '')}</p>
                      </div>
                    ))}
                  </div>
                );
              })()}
              <p className="mt-2 text-[10px] leading-relaxed text-white/30">
                Bars compare prevalence as evidential strength rises.{' '}
                {selected.method === 'ai-extraction'
                  ? 'Counted by reading every transcript in full and judging this element directly — no pattern matching, no correction applied.'
                  : `Found by text pattern, then corrected: ${(selected.precision * 100).toFixed(0)}% of ${selected.precisionN} blindly sampled passages genuinely described it.`}
              </p>
            </div>

            <p className="mb-5 font-body text-sm leading-relaxed text-white/75">{selected.description}</p>

            {selected.aliases.length > 0 && (
              <section className="mb-5">
                <h3 className="mb-2 text-[10px] uppercase tracking-widest text-white/35">Also called</h3>
                <div className="flex flex-wrap gap-1.5">
                  {[...selected.aliases]
                    // With a lens active, that tradition's names for this place come first.
                    .sort((a, b) => {
                      if (!tradition) return 0;
                      const am = a.traditionTags?.includes(tradition) ? 0 : 1;
                      const bm = b.traditionTags?.includes(tradition) ? 0 : 1;
                      return am - bm;
                    })
                    .map((a, i) => {
                      const lit = tradition && a.traditionTags?.includes(tradition);
                      return (
                        <span
                          key={i}
                          title={a.note ?? undefined}
                          className={`rounded-full border px-2.5 py-1 text-xs ${
                            lit ? 'border-blue-400/50 bg-blue-500/15 text-blue-100' : 'border-white/10 bg-white/5 text-white/70'
                          }`}
                        >
                          {a.term}
                          {a.tradition && a.tradition.toLowerCase() !== 'none' && (
                            <span className={`ml-1.5 ${lit ? 'text-blue-300/70' : 'text-white/35'}`}>{a.tradition}</span>
                          )}
                        </span>
                      );
                    })}
                </div>
              </section>
            )}

            {selected.sensory.length > 0 && (
              <section className="mb-5">
                <h3 className="mb-2 text-[10px] uppercase tracking-widest text-white/35">What it was like</h3>
                <ul className="space-y-1">
                  {selected.sensory.map((s, i) => (
                    <li key={i} className="flex gap-2 text-xs text-white/60"><span className="text-white/25">—</span>{s}</li>
                  ))}
                </ul>
              </section>
            )}

            {selected.quotes.length > 0 && (
              <section className="mb-5">
                <h3 className="mb-2 flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-white/35">
                  <QuoteIcon className="h-3 w-3" /> In their words
                </h3>
                <div className="space-y-3">
                  {selected.quotes.map((q, i) => (
                    <figure key={i} className="rounded-lg border-l-2 border-blue-400/40 bg-white/[0.03] py-2 pl-3 pr-2">
                      <blockquote className="font-heading text-sm italic leading-relaxed text-white/80">“{q.text}”</blockquote>
                      <figcaption className="mt-1.5 flex items-center gap-2 text-[10px] text-white/35">
                        {q.cvnde != null && <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-emerald-300/80">cvNDE {q.cvnde}</span>}
                        <Link href={`/video/${q.videoId}`} className="flex items-center gap-1 hover:text-white/70" target="_blank">
                          watch the account <ExternalLink className="h-2.5 w-2.5" />
                        </Link>
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </section>
            )}

            {selected.notes && (
              <section className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                <h3 className="mb-1.5 flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-white/35">
                  <Info className="h-3 w-3" /> Researcher note
                </h3>
                <p className="text-xs leading-relaxed text-white/55">{selected.notes}</p>
              </section>
            )}
          </div>
        </aside>
      )}
    </VizPageShell>
  );
}
