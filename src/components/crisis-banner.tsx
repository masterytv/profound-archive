/**
 * CrisisBanner
 *
 * Displayed on any question page where isCrisisTopic() returns true.
 * Warm, calm tone — the site's content is compassionate, not alarming.
 * Provides the 988 Suicide & Crisis Lifeline link prominently.
 */

import { Phone } from "lucide-react";

export function CrisisBanner() {
    return (
        <div
            className="relative rounded-xl border border-rose-200 bg-rose-50 px-5 py-4 mb-7 flex gap-4 items-start"
            role="alert"
            aria-label="Crisis support resources"
        >
            {/* Icon */}
            <div className="mt-0.5 flex-shrink-0 w-9 h-9 rounded-full bg-rose-100 border border-rose-200 flex items-center justify-center">
                <Phone className="w-4 h-4 text-rose-600" aria-hidden="true" />
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-rose-800 mb-0.5">
                    If you or someone you know is in crisis, please reach out.
                </p>
                <p className="text-sm text-rose-700 leading-relaxed">
                    The{" "}
                    <a
                        href="https://988lifeline.org/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold underline underline-offset-2 hover:text-rose-900 transition-colors"
                    >
                        988 Suicide & Crisis Lifeline
                    </a>{" "}
                    is available 24/7. Call or text{" "}
                    <a
                        href="tel:988"
                        className="font-bold text-rose-800 hover:text-rose-900 transition-colors"
                    >
                        988
                    </a>{" "}
                    to speak with a counselor. You are not alone.
                </p>
            </div>
        </div>
    );
}
