"use client";

/**
 * ConsciousnessStats — animated count-up counters for the unified homepage.
 *
 * Uses IntersectionObserver to trigger animation when scrolled into view.
 * Pure CSS + RAF for count-up — no Framer Motion dependency.
 */

import { useEffect, useRef, useState, useCallback } from "react";

interface StatItem {
  label: string;
  value: number;
  suffix: string;
  icon: React.ReactNode;
}

interface Props {
  stats: StatItem[];
}

function AnimatedNumber({ target, suffix }: { target: number; suffix: string }) {
  const [display, setDisplay] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  // Trigger count-up when element enters viewport
  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) {
          setStarted(true);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [started]);

  // Animate the number
  useEffect(() => {
    if (!started) return;
    const duration = 1800; // ms
    const startTime = performance.now();

    function step(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * target));
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    }

    requestAnimationFrame(step);
  }, [started, target]);

  return (
    <span ref={ref} className="tabular-nums">
      {display.toLocaleString()}{suffix}
    </span>
  );
}

export function ConsciousnessStats({ stats }: Props) {
  return (
    <section className="relative py-16 md:py-20 border-y border-slate-200/60 dark:border-white/10">
      {/* Glassmorphism background */}
      <div className="absolute inset-0 bg-slate-50/50 dark:bg-white/[0.02] backdrop-blur-sm" />

      <div className="relative container mx-auto px-4 max-w-6xl">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {stats.map((stat, i) => (
            <div key={i} className="text-center">
              <div className="flex items-center justify-center mb-3">
                <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center">
                  {stat.icon}
                </div>
              </div>
              <p className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-slate-50 animate-consciousness-glow">
                <AnimatedNumber target={stat.value} suffix={stat.suffix} />
              </p>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 font-medium">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
