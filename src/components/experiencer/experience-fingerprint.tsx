'use client';

/**
 * ExperienceFingerprint — A radial visualization of the 15 NDE elements.
 * Each element is a "petal" that glows when present in the experiencer's account.
 * Clicking a lit element reveals the verbatim quote with video link.
 */

import { useState } from 'react';
import { X, Play } from 'lucide-react';
import Link from 'next/link';

export interface FingerprintElement {
  name: string;
  element_label: string;
  quote: string;
  confidence: number;
  video_id: string;
  channel_name?: string;
  channel_id?: string;
  timestamp_seconds?: number;
}

interface Props {
  elements: FingerprintElement[];
  experiencerName: string;
}

const ALL_ELEMENTS = [
  { name: 'feelings_of_peace', label: 'Peace', icon: '☮', color: '#60A5FA' },
  { name: 'out_of_body', label: 'Out of Body', icon: '↑', color: '#818CF8' },
  { name: 'tunnel', label: 'Tunnel', icon: '◎', color: '#A78BFA' },
  { name: 'bright_light', label: 'Light', icon: '✦', color: '#FCD34D' },
  { name: 'being_of_light', label: 'Being of Light', icon: '◇', color: '#FBBF24' },
  { name: 'deceased_relatives', label: 'Loved Ones', icon: '♡', color: '#C084FC' },
  { name: 'life_review', label: 'Life Review', icon: '⊞', color: '#34D399' },
  { name: 'border_boundary', label: 'Boundary', icon: '▯', color: '#F472B6' },
  { name: 'cosmic_unity', label: 'Oneness', icon: '∞', color: '#2DD4BF' },
  { name: 'time_distortion', label: 'Time Shift', icon: '⧗', color: '#FB923C' },
  { name: 'enhanced_senses', label: 'Senses', icon: '✦', color: '#A3E635' },
  { name: 'telepathy', label: 'Telepathy', icon: '◈', color: '#67E8F9' },
  { name: 'otherworldly_realm', label: 'Other Realm', icon: '⬡', color: '#E879F9' },
  { name: 'knowledge_download', label: 'Knowledge', icon: '⚙', color: '#FDE68A' },
  { name: 'choice_to_return', label: 'Return', icon: '↩', color: '#86EFAC' },
];

export default function ExperienceFingerprint({ elements, experiencerName }: Props) {
  const [activeElement, setActiveElement] = useState<FingerprintElement | null>(null);

  const elementMap = new Map(elements.map(e => [e.name, e]));
  const presentCount = elements.length;
  const totalElements = ALL_ELEMENTS.length;

  return (
    <div className="relative">
      {/* Radial visualization */}
      <div className="relative w-full max-w-md mx-auto aspect-square">
        {/* Center label */}
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="text-center">
            <div className="text-3xl font-bold text-slate-900 dark:text-slate-50">
              {presentCount}
            </div>
            <div className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold">
              of {totalElements} elements
            </div>
          </div>
        </div>

        {/* Element petals arranged in a circle */}
        {ALL_ELEMENTS.map((el, index) => {
          const element = elementMap.get(el.name);
          const isPresent = !!element;
          const angle = (index / totalElements) * 360 - 90;
          const radius = 42;
          const x = 50 + radius * Math.cos((angle * Math.PI) / 180);
          const y = 50 + radius * Math.sin((angle * Math.PI) / 180);

          return (
            <button
              key={el.name}
              onClick={() => isPresent && element ? setActiveElement(element) : null}
              className={`absolute w-12 h-12 -ml-6 -mt-6 rounded-full flex items-center justify-center transition-all duration-300 ${
                isPresent
                  ? 'cursor-pointer scale-100 hover:scale-110 shadow-lg'
                  : 'cursor-default scale-75 opacity-20'
              }`}
              style={{
                left: `${x}%`,
                top: `${y}%`,
                backgroundColor: isPresent ? el.color + '30' : 'transparent',
                borderWidth: 2,
                borderColor: isPresent ? el.color : 'currentColor',
                borderStyle: 'solid',
              }}
              title={`${el.label}${isPresent ? ' — click to see quote' : ' — not described'}`}
              aria-label={`${el.label}: ${isPresent ? 'present in their experience' : 'not described'}`}
            >
              <span className="text-lg leading-none" role="img" aria-hidden>
                {el.icon}
              </span>
            </button>
          );
        })}

        {/* Connecting lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100">
          {ALL_ELEMENTS.map((el, index) => {
            const isPresent = elementMap.has(el.name);
            if (!isPresent) return null;
            const angle = (index / totalElements) * 360 - 90;
            const radius = 42;
            const x = 50 + radius * Math.cos((angle * Math.PI) / 180);
            const y = 50 + radius * Math.sin((angle * Math.PI) / 180);
            return (
              <line key={el.name} x1="50" y1="50" x2={x} y2={y}
                stroke={el.color} strokeWidth="0.5" opacity="0.3" />
            );
          })}
        </svg>
      </div>

      {/* Element labels below */}
      <div className="flex flex-wrap justify-center gap-2 mt-4">
        {ALL_ELEMENTS.map((el) => {
          const isPresent = elementMap.has(el.name);
          return (
            <span
              key={el.name}
              className={`text-[10px] font-medium px-2 py-0.5 rounded-full transition-opacity ${
                isPresent ? 'opacity-100' : 'opacity-20'
              }`}
              style={{
                backgroundColor: isPresent ? el.color + '20' : 'transparent',
                color: isPresent ? el.color : undefined,
                borderWidth: 1,
                borderColor: isPresent ? el.color + '40' : 'currentColor',
              }}
            >
              {el.label}
            </span>
          );
        })}
      </div>

      {/* Quote overlay with video link and channel attribution */}
      {activeElement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setActiveElement(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 dark:border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">
                {activeElement.element_label}
              </span>
              <button
                onClick={() => setActiveElement(null)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <blockquote className="text-lg text-slate-700 dark:text-slate-300 leading-relaxed italic border-l-4 border-blue-500/40 pl-4">
              &ldquo;{activeElement.quote}&rdquo;
            </blockquote>
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {activeElement.channel_name ? (
                  <>
                    — From{' '}
                    {activeElement.channel_id ? (
                      <Link
                        href={`/channel/${activeElement.channel_id}`}
                        className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {activeElement.channel_name}
                      </Link>
                    ) : (
                      <span className="font-medium">{activeElement.channel_name}</span>
                    )}
                  </>
                ) : (
                  `— ${experiencerName}`
                )}
              </p>
              <Link
                href={activeElement.timestamp_seconds != null
                  ? `/video/${activeElement.video_id}?t=${activeElement.timestamp_seconds}`
                  : `/video/${activeElement.video_id}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-medium hover:bg-blue-100 dark:hover:bg-blue-500/30 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <Play className="w-3 h-3" /> Watch Video
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
