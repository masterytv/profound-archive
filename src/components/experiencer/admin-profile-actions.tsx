"use client";

/**
 * Admin-only button to hide/unpublish an experiencer profile.
 * Only renders if the current user has admin/super_admin role in the profiles table.
 * Uses the PUT /api/admin/experiencer/[id] endpoint with { published_at: null }.
 */

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getSharedSession } from "@/lib/supabase/session";
import { EyeOff, Eye, Loader2, RefreshCw } from "lucide-react";

export default function AdminProfileActions({
    profileId,
    isPublished,
}: {
    profileId: number;
    isPublished: boolean;
}) {
    const [isAdmin, setIsAdmin] = useState(false);
    const [published, setPublished] = useState(isPublished);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    // DEADLOCK RULE: onAuthStateChange callbacks must stay SYNCHRONOUS —
    // auth-js awaits them while holding its navigator lock, so an awaited
    // supabase call in here deadlocks the whole client (2026-07-23).
    // The callback only records the user id; the role query runs in the
    // effect below, outside the lock.
    const [authUserId, setAuthUserId] = useState<string | null>(null);

    useEffect(() => {
        const supabase = createClient();
        let cancelled = false;

        // Shared single-flight lookup with an 8s stall guard, instead of an
        // unbounded getSession().
        getSharedSession().then((session) => {
            if (!cancelled) setAuthUserId(session?.user?.id ?? null);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event: string, session: { user: { id: string } } | null) => {
                setAuthUserId(session?.user?.id ?? null);
            }
        );

        return () => {
            cancelled = true;
            subscription.unsubscribe();
        };
    }, []);

    // Role lookup kept OUT of the auth callback (see deadlock note above).
    useEffect(() => {
        if (!authUserId) {
            setIsAdmin(false);
            return;
        }
        const supabase = createClient();
        let cancelled = false;
        supabase
            .from("profiles")
            .select("role")
            .eq("id", authUserId)
            .single()
            .then(({ data: profile }: { data: { role: string | null } | null }) => {
                if (cancelled) return;
                setIsAdmin(profile?.role === "admin" || profile?.role === "super_admin");
            });
        return () => { cancelled = true; };
    }, [authUserId]);

    if (!isAdmin) return null;

    async function togglePublish() {
        setLoading(true);
        setMessage(null);
        try {
            const res = await fetch(`/api/admin/experiencer/${profileId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    published_at: published ? null : new Date().toISOString(),
                }),
            });
            const data = await res.json();
            if (res.ok) {
                setPublished(!published);
                setMessage(published ? "Profile hidden" : "Profile published");
            } else {
                setMessage(`Error: ${data.error}`);
            }
        } catch (err: any) {
            setMessage(`Error: ${err.message}`);
        }
        setLoading(false);
    }

    async function refreshProfile() {
        setRefreshing(true);
        setMessage(null);
        try {
            const res = await fetch(`/api/admin/experiencer/generate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ profileId }),
            });
            const data = await res.json();
            if (res.ok) {
                setMessage(`Refreshed: ${data.message || "success"}`);
            } else {
                setMessage(`Error: ${data.error}`);
            }
        } catch (err: any) {
            setMessage(`Error: ${err.message}`);
        }
        setRefreshing(false);
    }

    return (
        <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl p-4 mb-6">
            <p className="text-xs font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-3">
                Admin Controls
            </p>
            <div className="flex flex-wrap items-center gap-2">
                <button
                    onClick={togglePublish}
                    disabled={loading}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        published
                            ? "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-500/30"
                            : "bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-500/30"
                    }`}
                >
                    {loading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : published ? (
                        <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                        <Eye className="w-3.5 h-3.5" />
                    )}
                    {published ? "Hide Profile" : "Publish Profile"}
                </button>
                <button
                    onClick={refreshProfile}
                    disabled={refreshing}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-500/30 transition-all"
                >
                    {refreshing ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                        <RefreshCw className="w-3.5 h-3.5" />
                    )}
                    Re-enrich
                </button>
            </div>
            {message && (
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-2">
                    {message}
                </p>
            )}
        </div>
    );
}
