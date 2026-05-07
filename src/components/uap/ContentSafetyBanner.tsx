"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, X, Shield } from "lucide-react";

interface ContentSafetyBannerProps {
  /** "standard" for general pages, "enhanced" for chat/AI pages */
  variant?: "standard" | "enhanced";
  /** localStorage key for dismissal persistence */
  storageKey?: string;
}

export default function ContentSafetyBanner({
  variant = "standard",
  storageKey = "uap-safety-banner-dismissed",
}: ContentSafetyBannerProps) {
  const [dismissed, setDismissed] = useState(true); // Start hidden to avoid flash

  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored !== "true") {
      setDismissed(false);
    }
  }, [storageKey]);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(storageKey, "true");
  };

  if (dismissed) return null;

  if (variant === "enhanced") {
    return (
      <div className="relative mx-auto max-w-3xl mb-6">
        <div className="rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/80 dark:bg-amber-950/30 p-4 backdrop-blur-sm">
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 p-1 rounded-lg hover:bg-amber-200/50 dark:hover:bg-amber-800/30 transition-colors"
            aria-label="Dismiss safety notice"
          >
            <X className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </button>
          <div className="flex items-start gap-3 pr-8">
            <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex-shrink-0 mt-0.5">
              <Shield className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                AI Research Assistant — Important Notice
              </h3>
              <p className="text-xs leading-relaxed text-amber-700 dark:text-amber-400/80">
                This AI assistant provides responses based on analyzed UAP testimony transcripts.
                It does not verify claims, endorse beliefs, or provide medical/psychological advice.
                UAP contact experiences are complex and personal — responses may contain
                unverified assertions from source material. Always evaluate information critically
                and consult qualified professionals for any health-related concerns.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Standard variant — compact banner for general UAP pages
  return (
    <div className="relative mx-auto max-w-5xl mb-4 px-4">
      <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/40 px-4 py-2.5 backdrop-blur-sm">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-6 p-1 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors"
          aria-label="Dismiss notice"
        >
          <X className="w-3.5 h-3.5 text-slate-400" />
        </button>
        <div className="flex items-center gap-2.5 pr-8">
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            <span className="font-medium text-slate-600 dark:text-slate-300">Research Archive.</span>{" "}
            This platform presents first-person accounts for research purposes.
            Claims have not been independently verified.
            Content may contain sensitive or extraordinary material.
          </p>
        </div>
      </div>
    </div>
  );
}
