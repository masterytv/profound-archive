'use client';

/**
 * useAudioCrossfade Hook — Native Audio Implementation
 *
 * Uses native HTMLAudioElement instead of Howler.js to bypass CSP issues.
 * Howler.js requires data:audio/wav blobs for audio context unlocking,
 * which conflicts with strict CSP policies.
 *
 * Features:
 *   - Switch between ambient audio tracks on phase change
 *   - Volume ducking for voice lines (ambient drops to 15%)
 *   - Opt-in only (no autoplay on page load)
 *   - Handles mobile playback restrictions
 */

import { useRef, useCallback } from 'react';

interface CueConfig {
  src: string;
  volume: number;
  loop?: boolean;
}

interface VoiceLineConfig {
  src: string;
  delay_ms?: number;
}

const DUCK_VOLUME = 0.15;
const DEFAULT_VOICE_DELAY = 1000;

export function useAudioCrossfade() {
  const currentAmbient = useRef<HTMLAudioElement | null>(null);
  const secondaryAmbient = useRef<HTMLAudioElement | null>(null);
  const currentVoiceLine = useRef<HTMLAudioElement | null>(null);
  const isEnabled = useRef(false);
  const normalVolume = useRef(0.5);
  const secondaryVolume = useRef(0.5);
  const voiceTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const enable = useCallback(() => {
    isEnabled.current = true;
    console.log('[audio] Enabled');
  }, []);

  const disable = useCallback(() => {
    isEnabled.current = false;
    if (currentAmbient.current) {
      currentAmbient.current.pause();
      currentAmbient.current = null;
    }
    if (secondaryAmbient.current) {
      secondaryAmbient.current.pause();
      secondaryAmbient.current = null;
    }
    if (currentVoiceLine.current) {
      currentVoiceLine.current.pause();
      currentVoiceLine.current = null;
    }
    if (voiceTimeout.current) {
      clearTimeout(voiceTimeout.current);
      voiceTimeout.current = null;
    }
    console.log('[audio] Disabled');
  }, []);

  /**
   * Switch to a new ambient audio track.
   */
  const crossfadeTo = useCallback((cue: CueConfig | undefined) => {
    if (!isEnabled.current) {
      console.log('[audio] crossfadeTo skipped: not enabled');
      return;
    }

    // Stop old ambient — just pause, don't touch src (causes 'empty src' errors)
    if (currentAmbient.current) {
      console.log('[audio] Stopping old ambient');
      currentAmbient.current.pause();
      currentAmbient.current.currentTime = 0;
      currentAmbient.current = null;
    }
    // Also stop secondary ambient when switching phases
    if (secondaryAmbient.current) {
      secondaryAmbient.current.pause();
      secondaryAmbient.current = null;
    }

    if (!cue) {
      console.log('[audio] No cue, going silent');
      return;
    }

    console.log('[audio] New ambient:', cue.src, 'vol:', cue.volume);
    normalVolume.current = cue.volume;

    // Create native audio element
    const audio = new Audio(cue.src);
    audio.loop = cue.loop !== false;
    audio.volume = cue.volume;
    audio.preload = 'auto';

    audio.addEventListener('error', (e) => {
      console.error('[audio] Ambient error:', audio.error?.message || e);
    });

    audio.addEventListener('playing', () => {
      console.log('[audio] ✅ Ambient playing');
    });

    currentAmbient.current = audio;

    // Play — wrapped in promise catch for autoplay policy
    const playPromise = audio.play();
    if (playPromise) {
      playPromise.catch((err) => {
        console.error('[audio] Ambient play rejected:', err.message);
      });
    }
  }, []);

  /**
   * Play a secondary ambient layer (simultaneous with primary).
   * Stopped automatically when crossfadeTo is called for the next phase.
   */
  const playSecondary = useCallback((cue: CueConfig | undefined) => {
    if (!isEnabled.current) return;

    if (secondaryAmbient.current) {
      secondaryAmbient.current.pause();
      secondaryAmbient.current = null;
    }

    if (!cue) return;

    console.log('[audio] Secondary layer:', cue.src, 'vol:', cue.volume);
    secondaryVolume.current = cue.volume;

    const audio = new Audio(cue.src);
    audio.loop = cue.loop !== false;
    audio.volume = cue.volume;
    audio.preload = 'auto';

    audio.addEventListener('error', (e) => {
      console.error('[audio] Secondary error:', audio.error?.message || e);
    });
    audio.addEventListener('playing', () => {
      console.log('[audio] ✅ Secondary playing');
    });

    secondaryAmbient.current = audio;
    const p = audio.play();
    if (p) p.catch((err) => console.error('[audio] Secondary play rejected:', err.message));
  }, []);

  /**
   * Play a voice line with volume ducking.
   */
  const playVoiceLine = useCallback((voice: VoiceLineConfig) => {
    if (!isEnabled.current) return;

    // Stop any current voice line
    if (currentVoiceLine.current) {
      currentVoiceLine.current.pause();
      currentVoiceLine.current.src = '';
      currentVoiceLine.current = null;
    }
    if (voiceTimeout.current) {
      clearTimeout(voiceTimeout.current);
    }

    const delay = voice.delay_ms ?? DEFAULT_VOICE_DELAY;

    voiceTimeout.current = setTimeout(() => {
      if (!isEnabled.current) return;

      console.log('[audio] Playing voice:', voice.src);

      // Duck ambient (both primary and secondary)
      const ambient = currentAmbient.current;
      const secondary = secondaryAmbient.current;
      if (ambient) {
        ambient.volume = DUCK_VOLUME;
      }
      if (secondary) {
        secondary.volume = DUCK_VOLUME;
      }

      const voiceAudio = new Audio(voice.src);
      voiceAudio.volume = 0.85;
      voiceAudio.preload = 'auto';

      voiceAudio.addEventListener('error', (e) => {
        console.error('[audio] Voice error:', voiceAudio.error?.message || e);
      });

      voiceAudio.addEventListener('ended', () => {
        console.log('[audio] Voice ended, restoring ambient');
        if (ambient) {
          ambient.volume = normalVolume.current;
        }
        if (secondary) {
          secondary.volume = secondaryVolume.current;
        }
        currentVoiceLine.current = null;
      });

      currentVoiceLine.current = voiceAudio;

      const playPromise = voiceAudio.play();
      if (playPromise) {
        playPromise.catch((err) => {
          console.error('[audio] Voice play rejected:', err.message);
        });
      }
    }, delay);
  }, []);

  const cleanup = useCallback(() => {
    if (currentAmbient.current) {
      currentAmbient.current.pause();
      currentAmbient.current = null;
    }
    if (secondaryAmbient.current) {
      secondaryAmbient.current.pause();
      secondaryAmbient.current = null;
    }
    if (currentVoiceLine.current) {
      currentVoiceLine.current.pause();
      currentVoiceLine.current = null;
    }
    if (voiceTimeout.current) {
      clearTimeout(voiceTimeout.current);
      voiceTimeout.current = null;
    }
  }, []);

  return {
    enable,
    disable,
    crossfadeTo,
    playSecondary,
    playVoiceLine,
    cleanup,
    isEnabled: () => isEnabled.current,
  };
}
