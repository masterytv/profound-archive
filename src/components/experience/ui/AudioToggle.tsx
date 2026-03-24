'use client';

/**
 * AudioToggle — Opt-in Audio Control
 *
 * Floating button (top-right) for audio on/off.
 * Tapping while off enables audio + resumes AudioContext for iOS.
 * Audio is ALWAYS off by default.
 */

import { useState } from 'react';

interface AudioToggleProps {
  onEnable: () => void;
  onDisable: () => void;
}

export function AudioToggle({ onEnable, onDisable }: AudioToggleProps) {
  const [isOn, setIsOn] = useState(false);

  const toggle = () => {
    if (isOn) {
      onDisable();
      setIsOn(false);
    } else {
      onEnable();
      setIsOn(true);
    }
  };

  return (
    <button
      onClick={toggle}
      className={`experience-audio-toggle ${isOn ? 'experience-audio-toggle--on' : ''}`}
      aria-label={isOn ? 'Disable audio' : 'Enable audio'}
      type="button"
    >
      {isOn ? (
        // Speaker with waves
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
        </svg>
      ) : (
        // Speaker muted
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <line x1="23" y1="9" x2="17" y2="15" />
          <line x1="17" y1="9" x2="23" y2="15" />
        </svg>
      )}
    </button>
  );
}
