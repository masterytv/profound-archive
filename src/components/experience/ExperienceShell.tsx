'use client';

/**
 * ExperienceShell — Main Orchestrator
 *
 * Simplified Phase 1 approach:
 * - CSS-based phase switching (opacity + visibility)
 * - No GSAP transitions (avoids the onComplete non-firing issue)
 * - GSAP transitions can be re-enabled once assets exist and we can debug properly
 *
 * Features:
 *   1. Content warning gate → phase 0
 *   2. Correct renderer per phase type via registry
 *   3. CSS crossfade transitions between phases
 *   4. Audio crossfade + TTS (opt-in only)
 *   5. Keyboard / swipe / button navigation
 *   6. EndCard after final phase
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import type { ExperienceConfig } from './types';
import { resolveRenderer } from './registry';
import { resolveAsset } from './asset-registry';
import { useAudioCrossfade } from './hooks/useAudioCrossfade';
import { ContentWarning } from './ui/ContentWarning';
import { ProgressIndicator } from './ui/ProgressIndicator';
import { NavigationButtons } from './ui/NavigationButtons';
import { AudioToggle } from './ui/AudioToggle';
import { EndCard } from './ui/EndCard';

interface ExperienceShellProps {
  config: ExperienceConfig;
}

type ShellState = 'gate' | 'playing' | 'ended';

export function ExperienceShell({ config }: ExperienceShellProps) {
  const [shellState, setShellState] = useState<ShellState>('gate');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const audio = useAudioCrossfade();

  // ── Navigation handlers ───────────────────────────────────────────
  const goNext = useCallback(() => {
    if (isTransitioning) return;
    if (currentIndex >= config.phases.length - 1) return;

    setIsTransitioning(true);
    const nextIndex = currentIndex + 1;
    setCurrentIndex(nextIndex);

    // Auto-transition to ended state after reaching last phase
    if (nextIndex === config.phases.length - 1) {
      setTimeout(() => setShellState('ended'), 4000);
    }

    // Audio crossfade (non-blocking)
    try {
      const targetPhase = config.phases[nextIndex];
      if (targetPhase.audio_cue) {
        audio.crossfadeTo({
          src: resolveAsset(targetPhase.audio_cue.asset_key),
          volume: targetPhase.audio_cue.volume,
          loop: targetPhase.audio_cue.loop !== false,
        });
      }
      if (targetPhase.secondary_audio_cue) {
        audio.playSecondary({
          src: resolveAsset(targetPhase.secondary_audio_cue.asset_key),
          volume: targetPhase.secondary_audio_cue.volume,
          loop: targetPhase.secondary_audio_cue.loop !== false,
        });
      } else {
        audio.playSecondary(undefined);
      }
      if (targetPhase.voice_line) {
        audio.playVoiceLine({
          src: resolveAsset(targetPhase.voice_line.asset_key),
          delay_ms: targetPhase.voice_line.delay_ms,
        });
      }
    } catch {
      // Audio errors never block navigation
    }

    // Unlock after CSS transition completes (matches CSS transition duration)
    setTimeout(() => setIsTransitioning(false), 900);
  }, [currentIndex, isTransitioning, config.phases, audio]);

  const goPrev = useCallback(() => {
    if (isTransitioning) return;
    if (currentIndex <= 0) return;

    setIsTransitioning(true);
    setCurrentIndex(currentIndex - 1);

    setTimeout(() => setIsTransitioning(false), 900);
  }, [currentIndex, isTransitioning]);

  // ── Keyboard navigation ───────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        goNext();
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goNext, goPrev]);

  // ── Touch/swipe ───────────────────────────────────────────────────
  useEffect(() => {
    let touchStartY = 0;
    const SWIPE_THRESHOLD = 50;

    const onTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
    };
    const onTouchEnd = (e: TouchEvent) => {
      const delta = touchStartY - e.changedTouches[0].clientY;
      if (Math.abs(delta) > SWIPE_THRESHOLD) {
        if (delta > 0) goNext();
        else goPrev();
      }
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [goNext, goPrev]);

  // ── Begin experience ──────────────────────────────────────────────
  const handleBegin = useCallback(() => {
    setShellState('playing');
    // Audio starts when user enables via toggle, not here
  }, []);

  // ── Audio enable handler — plays current phase's audio ─────────
  const handleEnableAudio = useCallback(() => {
    audio.enable();
    try {
      const phase = config.phases[currentIndex];
      if (phase.audio_cue) {
        audio.crossfadeTo({
          src: resolveAsset(phase.audio_cue.asset_key),
          volume: phase.audio_cue.volume,
          loop: phase.audio_cue.loop !== false,
        });
      }
      if (phase.secondary_audio_cue) {
        audio.playSecondary({
          src: resolveAsset(phase.secondary_audio_cue.asset_key),
          volume: phase.secondary_audio_cue.volume,
          loop: phase.secondary_audio_cue.loop !== false,
        });
      }
      if (phase.voice_line) {
        audio.playVoiceLine({
          src: resolveAsset(phase.voice_line.asset_key),
          delay_ms: phase.voice_line.delay_ms,
        });
      }
    } catch {
      // Non-blocking
    }
  }, [config.phases, currentIndex, audio]);

  // ── Cleanup (unmount only) ─────────────────────────────────────────
  // IMPORTANT: Do NOT include `audio` in deps — it creates a new ref each render,
  // causing cleanup to fire on every re-render which kills playing audio.
  const audioRef = useRef(audio);
  audioRef.current = audio;
  useEffect(() => {
    return () => audioRef.current.cleanup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Phase labels ──────────────────────────────────────────────────
  const phaseLabels = config.phases.map((p) => p.label);

  // ── Render ────────────────────────────────────────────────────────

  if (shellState === 'gate') {
    return <ContentWarning meta={config.meta} onBegin={handleBegin} />;
  }

  if (shellState === 'ended') {
    return <EndCard meta={config.meta} />;
  }

  return (
    <div className="experience-shell">
      {/* Phase layers — all mounted, CSS controls visibility */}
      <div className="experience-phases">
        {config.phases.map((phase, i) => {
          const Renderer = resolveRenderer(phase.type);
          const isActive = i === currentIndex;

          return (
            <div
              key={i}
              className={`experience-phase-wrapper ${isActive ? 'experience-phase-active' : 'experience-phase-inactive'}`}
              aria-hidden={!isActive}
            >
              <Renderer config={phase} assetUrl={resolveAsset} />
            </div>
          );
        })}
      </div>

      {/* HUD layer */}
      <div className="experience-hud">
        <AudioToggle
          onEnable={handleEnableAudio}
          onDisable={audio.disable}
        />
        <NavigationButtons
          onPrev={goPrev}
          onNext={goNext}
          isFirst={currentIndex === 0}
          isLast={currentIndex === config.phases.length - 1}
          isLocked={isTransitioning}
        />
        <ProgressIndicator
          totalPhases={config.phases.length}
          currentIndex={currentIndex}
          labels={phaseLabels}
        />
      </div>
    </div>
  );
}
