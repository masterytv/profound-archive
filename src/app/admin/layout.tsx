import Link from "next/link";
import { Settings, LogOut, Users, Shield, MessageSquare, LayoutDashboard, Upload, Radar, List, ListVideo, Mail, BarChart3, TrendingUp, FileText, UserCheck, Radio, Scan, Tv, UserCircle } from "lucide-react";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const cookieStore = await cookies();

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        );
                    } catch {
                        // The `setAll` method was called from a Server Component.
                    }
                },
            },
        }
    );

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (!profile || (profile.role !== "admin" && profile.role !== "super_admin")) {
        console.log("Admin Access Denied. Redirecting to /");
        redirect("/");
    }

    return (
        <div className="min-h-screen flex bg-background">
            {/* Sidebar */}
            <aside className="w-64 bg-white dark:bg-white/5 border-r border-slate-200/60 dark:border-white/10 hidden md:flex md:flex-col">
                <div className="p-5 flex-1 flex flex-col">
                    {/* Sidebar Header */}
                    <div className="flex items-center gap-3 mb-8 px-2">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                            <Shield className="w-4.5 h-4.5 text-blue-600" />
                        </div>
                        <span
                            className="text-lg font-bold text-slate-900 dark:text-white"
                            style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                        >
                            Admin
                        </span>
                    </div>

                    {/* Nav Items */}
                    <nav className="flex-1 space-y-0.5">
                        {/* Overview — always first, ungrouped */}
                        <Link
                            href="/admin"
                            className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 rounded-xl hover:bg-white/10 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-all"
                        >
                            <LayoutDashboard className="w-4 h-4" />
                            Overview
                        </Link>

                        {/* ── CONTENT ── */}
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500 px-3 pt-5 pb-1.5">
                            Content
                        </p>
                        <Link
                            href="/admin/blog"
                            className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 rounded-xl hover:bg-white/10 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-all"
                        >
                            <FileText className="w-4 h-4 text-orange-500" />
                            Blog
                        </Link>
                        <Link
                            href="/experiencer"
                            className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 rounded-xl hover:bg-white/10 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-all"
                        >
                            <UserCheck className="w-4 h-4 text-violet-500" />
                            Experiencers
                        </Link>
                        {profile?.role === "super_admin" && (
                            <Link
                                href="/admin/chatbot"
                                className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 rounded-xl hover:bg-white/10 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-all"
                            >
                                <MessageSquare className="w-4 h-4 text-indigo-500" />
                                Chatbot Editor
                            </Link>
                        )}

                        {/* ── VIDEO PIPELINE ── */}
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500 px-3 pt-5 pb-1.5">
                            Video Pipeline
                        </p>
                        <Link
                            href="/admin/intake"
                            className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 rounded-xl hover:bg-white/10 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-all"
                        >
                            <Upload className="w-4 h-4" />
                            Video Intake
                        </Link>
                        <Link
                            href="/admin/scanner"
                            className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 rounded-xl hover:bg-white/10 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-all"
                        >
                            <Radar className="w-4 h-4" />
                            Channel Scanner
                        </Link>
                        <Link
                            href="/admin/scanner/queue"
                            className="flex items-center gap-3 pl-9 pr-3 py-2 text-sm font-medium text-slate-500 dark:text-slate-400 rounded-xl hover:bg-white/10 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-all"
                        >
                            Queue Inspector
                        </Link>
                        <Link
                            href="/admin/scanner/pending"
                            className="flex items-center gap-3 pl-9 pr-3 py-2 text-sm font-medium text-slate-500 dark:text-slate-400 rounded-xl hover:bg-white/10 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-all"
                        >
                            Pending Queue
                        </Link>

                        {/* ── ENGAGEMENT ── */}
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500 px-3 pt-5 pb-1.5">
                            Engagement
                        </p>
                        <Link
                            href="/admin/users"
                            className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 rounded-xl hover:bg-white/10 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-all"
                        >
                            <Users className="w-4 h-4" />
                            Users
                        </Link>
                        <Link
                            href="/admin/email"
                            className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 rounded-xl hover:bg-white/10 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-all"
                        >
                            <Mail className="w-4 h-4 text-purple-500" />
                            Email CRM
                        </Link>
                        <Link
                            href="/admin/email/templates"
                            className="flex items-center gap-3 pl-9 pr-3 py-2 text-sm font-medium text-slate-500 dark:text-slate-400 rounded-xl hover:bg-white/10 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-all"
                        >
                            Email Templates
                        </Link>
                        <Link
                            href="/admin/ces"
                            className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 rounded-xl hover:bg-white/10 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-all"
                        >
                            <BarChart3 className="w-4 h-4 text-blue-500" />
                            CES Feedback
                        </Link>

                        {/* ── INSIGHTS ── */}
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500 px-3 pt-5 pb-1.5">
                            Insights
                        </p>
                        <Link
                            href="/admin/analytics"
                            className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 rounded-xl hover:bg-white/10 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-all"
                        >
                            <TrendingUp className="w-4 h-4 text-emerald-500" />
                            Analytics
                        </Link>

                        {/* ── UAP ── */}
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500 px-3 pt-5 pb-1.5">
                            UAP
                        </p>
                        <Link
                            href="/admin/uap"
                            className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 rounded-xl hover:bg-white/10 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-all"
                        >
                            <Radio className="w-4 h-4 text-violet-500" />
                            Dashboard
                        </Link>
                        <Link
                            href="/admin/uap/classifier"
                            className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 rounded-xl hover:bg-white/10 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-all"
                        >
                            <Scan className="w-4 h-4 text-violet-500" />
                            Classifier
                        </Link>
                        <Link
                            href="/admin/uap/channels"
                            className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 rounded-xl hover:bg-white/10 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-all"
                        >
                            <Tv className="w-4 h-4 text-violet-500" />
                            Channels
                        </Link>
                        <Link
                            href="/admin/uap/contactees"
                            className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 rounded-xl hover:bg-white/10 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-all"
                        >
                            <UserCircle className="w-4 h-4 text-violet-500" />
                            Contactees
                        </Link>
                    </nav>

                    {/* Exit Link */}
                    <div className="border-t border-slate-200/60 dark:border-white/10 pt-4">
                        <Link
                            href="/"
                            className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-500 rounded-xl hover:bg-white/10 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-all"
                        >
                            <LogOut className="w-4 h-4" />
                            Exit Admin
                        </Link>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto">
                <div className="p-6 md:p-8 max-w-6xl">
                    {children}
                </div>
            </main>
        </div>
    );
}
