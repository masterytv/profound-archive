/**
 * Demo Experience: Penny's NDE (Anaphylaxis)
 *
 * Based on video XLJ4V7O6KhI: "What God Told Her About Your Thoughts Will Shock You!"
 *
 * Penny, a critical care nurse, suffered anaphylaxis from a shellfish allergy.
 * She stopped breathing and was intubated. During the NDE:
 *   1. OBE — watched the team intubate her
 *   2. Appeared in sister's car during a rainstorm (veridical)
 *   3. Dark void — felt trapped, reflected on self-isolation
 *   4. Grandmother appeared — comforted her about transition
 *   5. Met God — life review showing ripple effects of kindness
 *   6. Healing light — chose to return
 *
 * Color progression:
 *   Phases 1-2: MUTED (earthly, pre-tunnel)
 *   Phase 3: DARK → WARM (tunnel breakthrough)
 *   Phases 4-5: VIBRANT ("more real than real")
 *   Phase 6: MUTED (return to earthly)
 */

import type { ExperienceConfig } from '@/components/experience/types';

export const pennyAnaphylaxis: ExperienceConfig = {
  meta: {
    slug: 'penny-anaphylaxis',
    title: "Through the Void",
    experiencer_name: 'Penny',
    source_video_id: 'XLJ4V7O6KhI',
    nde_type: 'anaphylaxis',
    duration_estimate: '3–5 min',
    content_warning:
      'This experience depicts a medical emergency and themes of death and transition. Viewer discretion is advised.',
    status: 'draft',
  },

  audio: {
    ambient_key: 'audio-hospital-ambient',
    volume: 0.8,
  },

  phases: [
    // ──────────────────────────────────────────────────────────────────
    // Phase 1: Origin — Hospital hallway (MUTED)
    // ──────────────────────────────────────────────────────────────────
    {
      type: 'scene',
      label: 'The Crisis',
      narrative: {
        text: '"I injected the EpiPen and went to the hospital, but my condition worsened in the hallway. I stopped breathing."',
        attribution: '— Penny',
        position: 'bottom-center',
      },
      background: {
        asset_key: 'bg-hospital-hallway',
        color_overlay: 'rgba(30, 40, 60, 0.5)',
        blend_mode: 'multiply',
      },
      transition: 'fade',
      audio_cue: {
        asset_key: 'audio-hospital-ambient',
        volume: 0.8,
      },
    },

    // ──────────────────────────────────────────────────────────────────
    // Phase 2: Separation — OBE (MUTED)
    // ──────────────────────────────────────────────────────────────────
    {
      type: 'scene',
      label: 'Leaving the Body',
      narrative: {
        text: '"I left my body and watched the team intubate me. I could see everything from above."',
        attribution: '— Penny',
        position: 'center',
      },
      background: {
        asset_key: 'bg-obe-operating-room',
        color_overlay: 'rgba(40, 50, 70, 0.4)',
        blend_mode: 'multiply',
      },
      transition: 'elevate',
      audio_cue: {
        asset_key: 'audio-obe-flatline',
        volume: 0.5,
        loop: false,
      },
      secondary_audio_cue: {
        asset_key: 'audio-obe-doctors-talking',
        volume: 0.3,
      },
    },

    // ──────────────────────────────────────────────────────────────────
    // Phase 3: Tunnel — Dark Void (DARK → WARM)
    // ──────────────────────────────────────────────────────────────────
    {
      type: 'canvas',
      label: 'The Void',
      narrative: {
        text: '"I entered a dark void. I felt trapped. I reflected on how I had isolated myself after my divorce."',
        attribution: '— Penny',
        position: 'bottom-center',
      },
      background: {
        asset_key: 'bg-tunnel-void',
      },
      transition: 'push_through',
      audio_cue: {
        asset_key: 'audio-void-tunnel',
        volume: 0.6,
      },
    },

    // ──────────────────────────────────────────────────────────────────
    // Phase 4: The Other Side — Grandmother + God (VIBRANT)
    // ──────────────────────────────────────────────────────────────────
    {
      type: 'scene',
      label: 'The Other Side',
      narrative: {
        text: '"My grandmother appeared. She comforted me and explained I was in transition between life and death."',
        attribution: '— Penny',
        position: 'bottom-center',
      },
      background: {
        asset_key: 'bg-realm-grandmother',
        color_overlay: 'rgba(255, 200, 100, 0.15)',
        blend_mode: 'screen',
      },
      transition: 'dissolve',
      audio_cue: {
        asset_key: 'audio-realm-ethereal',
        volume: 0.6,
      },
      voice_line: {
        text: 'You are in transition between life and death. You are safe. You are loved.',
        voice_id: 'charlotte', // Placeholder — will use actual ElevenLabs voice ID
        asset_key: 'voice-grandmother',
        delay_ms: 2000,
      },
    },

    // ──────────────────────────────────────────────────────────────────
    // Phase 5: Life Review — Ripple Effects (VIBRANT)
    // ──────────────────────────────────────────────────────────────────
    {
      type: 'memory',
      label: 'The Life Review',
      narrative: {
        text: '"God showed me the ripple effects of kindness. Helping a stranger in a store had changed her life."',
        attribution: '— Penny',
        position: 'top-left',
      },
      background: {
        asset_key: 'bg-life-review',
        color_overlay: 'rgba(255, 215, 100, 0.1)',
        blend_mode: 'screen',
      },
      transition: 'fade',
      audio_cue: {
        asset_key: 'audio-realm-ethereal',
        volume: 0.6,
      },
      voice_line: {
        text: 'Every act of kindness ripples outward. Your thoughts have power. Forgive, and free the energy trapped within you.',
        voice_id: 'daniel', // Placeholder — will use actual ElevenLabs voice ID
        asset_key: 'voice-being-of-light',
        delay_ms: 1500,
      },
      memory_cards: [
        {
          text: '"She showed me helping a woman in a store. That small act had changed the woman\'s entire day, and then her week, and then her life."',
          subtext: 'The ripple effect of a single act of kindness',
        },
        {
          text: '"I needed to control my negative thoughts. They weren\'t just thoughts. They were energy."',
          subtext: 'Thoughts as energy',
        },
        {
          text: '"I saw my sons overcoming their feelings of abandonment. I knew they would be okay."',
          subtext: 'A vision of the future',
        },
        {
          text: '"Forgive to free the energy. That\'s what I was told. Holding onto pain only traps you."',
          subtext: 'The lesson of forgiveness',
        },
      ],
    },

    // ──────────────────────────────────────────────────────────────────
    // Phase 6: Return — Healing Light (MUTED AGAIN)
    // ──────────────────────────────────────────────────────────────────
    {
      type: 'scene',
      label: 'The Return',
      narrative: {
        text: '"A healing light filled my body. I chose to return, despite the heartbreak. I remembered everything."',
        attribution: '— Penny',
        position: 'center',
      },
      background: {
        asset_key: 'bg-return-light',
        color_overlay: 'rgba(200, 180, 140, 0.2)',
        blend_mode: 'soft-light',
      },
      transition: 'fade',
      audio_cue: {
        asset_key: 'audio-return-heartbeat',
        volume: 0.8,
      },
    },
  ],
};
