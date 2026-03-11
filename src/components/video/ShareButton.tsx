"use client";

import { useState, useRef, useEffect } from "react";
import {
    Share2,
    Link2,
    Check,
    X,
    Facebook,
    Twitter,
    Linkedin,
    MessageCircle,
} from "lucide-react";

interface SocialShareProps {
    url: string;
    title: string;
    description?: string;
}

// Platform share URLs — same mechanism react-share uses under the hood
const platforms = [
    {
        name: "Copy Link",
        icon: Link2,
        color: "bg-slate-100 hover:bg-slate-200 text-slate-700",
        action: "copy",
        href: null,
    },
    {
        name: "Facebook",
        icon: Facebook,
        color: "bg-[#1877F2]/10 hover:bg-[#1877F2]/20 text-[#1877F2]",
        action: "open",
        href: (url: string) =>
            `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    },
    {
        name: "X / Twitter",
        icon: Twitter,
        color: "bg-black/5 hover:bg-black/10 text-black",
        action: "open",
        href: (url: string, title: string) =>
            `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
    },
    {
        name: "LinkedIn",
        icon: Linkedin,
        color: "bg-[#0A66C2]/10 hover:bg-[#0A66C2]/20 text-[#0A66C2]",
        action: "open",
        href: (url: string) =>
            `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    },
    {
        name: "WhatsApp",
        // WhatsApp uses a speech bubble — lucide doesn't have the WA logo, use their green
        icon: MessageCircle,
        color: "bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366]",
        action: "open",
        href: (url: string, title: string) =>
            `https://wa.me/?text=${encodeURIComponent(`${title}\n${url}`)}`,
    },
    {
        name: "Reddit",
        // Reddit icon workaround: use a styled span
        icon: null,
        color: "bg-[#FF4500]/10 hover:bg-[#FF4500]/20 text-[#FF4500]",
        action: "open",
        href: (url: string, title: string) =>
            `https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`,
    },
    {
        name: "Threads",
        icon: null,
        color: "bg-black/5 hover:bg-black/10 text-black",
        action: "open",
        href: (url: string, title: string) =>
            `https://www.threads.net/intent/post?text=${encodeURIComponent(`${title}\n${url}`)}`,
    },
] as const;

export function SocialShareButton({ url, title, description }: SocialShareProps) {
    const [open, setOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);

    // Close panel when clicking outside
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        if (open) document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [open]);

    const handleShare = async () => {
        // Only use native Web Share API on real mobile devices (touch screens).
        // Desktop Chrome on macOS also supports navigator.share but shows the
        // ugly macOS system sheet — so we gate on coarse pointer (touch) only.
        const isMobile =
            typeof window !== "undefined" &&
            window.matchMedia("(pointer: coarse)").matches;

        if (isMobile && typeof navigator !== "undefined" && navigator.share) {
            try {
                await navigator.share({ title, url, text: description });
                return; // Native sheet handled it — don't open panel
            } catch {
                // User cancelled — fall through to panel
            }
        }
        setOpen((v) => !v);
    };

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => {
                setCopied(false);
                setOpen(false);
            }, 2000);
        } catch {
            // Fallback: select/copy for older browsers
        }
    };

    const openPlatform = (href: string) => {
        window.open(href, "_blank", "noopener,noreferrer,width=600,height=500");
        setOpen(false);
    };

    return (
        <div className="relative" ref={panelRef}>
            {/* Trigger button */}
            <button
                onClick={handleShare}
                className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                title="Share this story"
                aria-label="Share this story"
            >
                <Share2 className="w-3.5 h-3.5" />
                Share
            </button>

            {/* Share panel dropdown */}
            {open && (
                <div className="absolute left-0 top-8 z-50 w-64 bg-white rounded-2xl border border-slate-200 shadow-xl p-3 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="flex items-center justify-between mb-2 px-1">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Share this story</span>
                        <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600 p-0.5 rounded">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                        {platforms.map((platform) => {
                            const href =
                                platform.href
                                    ? (platform.href as (url: string, title: string) => string)(url, title)
                                    : null;

                            const isCopy = platform.action === "copy";

                            return (
                                <button
                                    key={platform.name}
                                    onClick={() => {
                                        if (isCopy) {
                                            copyLink();
                                        } else if (href) {
                                            openPlatform(href);
                                        }
                                    }}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${platform.color}`}
                                >
                                    {isCopy && copied ? (
                                        <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                                    ) : platform.icon ? (
                                        <platform.icon className="w-4 h-4 shrink-0" />
                                    ) : (
                                        // Reddit / Threads: text abbreviation as icon
                                        <span className="w-4 h-4 shrink-0 text-[10px] font-black flex items-center justify-center">
                                            {platform.name === "Reddit" ? "R" : "T"}
                                        </span>
                                    )}
                                    <span className="truncate">
                                        {isCopy && copied ? "Copied!" : platform.name}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
