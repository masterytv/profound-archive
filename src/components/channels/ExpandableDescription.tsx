'use client'

import { useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

// Convert raw URLs in text into clickable links
function linkify(text: string): ReactNode[] {
    const urlRegex = /(https?:\/\/[^\s]+)/g
    const parts = text.split(urlRegex)

    return parts.map((part, i) => {
        if (urlRegex.test(part)) {
            // Reset lastIndex since we reuse the regex
            urlRegex.lastIndex = 0
            return (
                <a
                    key={i}
                    href={part}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 underline underline-offset-2 break-all"
                >
                    {part}
                </a>
            )
        }
        return part
    })
}

export function ExpandableDescription({ text }: { text: string }) {
    const [expanded, setExpanded] = useState(false)

    // Only show expand button if text is long enough to be clamped
    const isLong = text.length > 200

    return (
        <div className="mt-5 pt-5 border-t border-slate-100">
            <p
                className={`text-sm text-slate-600 leading-relaxed max-w-3xl whitespace-pre-line ${!expanded && isLong ? 'line-clamp-3' : ''}`}
            >
                {linkify(text)}
            </p>
            {isLong && (
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="mt-2 inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                >
                    {expanded ? 'Show less' : 'Show more'}
                    <ChevronDown
                        className={`w-4 h-4 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
                    />
                </button>
            )}
        </div>
    )
}
