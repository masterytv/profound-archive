import Link from "next/link";
import { Settings, LogOut, Users, Shield, MessageSquare, LayoutDashboard, Upload, Radar, List } from "lucide-react";
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
        <div className="min-h-screen flex" style={{ background: "#F8FAFC" }}>
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-slate-200/60 hidden md:flex md:flex-col">
                <div className="p-5 flex-1 flex flex-col">
                    {/* Sidebar Header */}
                    <div className="flex items-center gap-3 mb-8 px-2">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                            <Shield className="w-4.5 h-4.5 text-blue-600" />
                        </div>
                        <span
                            className="text-lg font-bold text-slate-900"
                            style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                        >
                            Admin
                        </span>
                    </div>

                    {/* Nav Items */}
                    <nav className="space-y-1 flex-1">
                        <Link
                            href="/admin"
                            className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-600 rounded-xl hover:bg-slate-50 hover:text-slate-900 transition-all"
                        >
                            <LayoutDashboard className="w-4 h-4" />
                            Overview
                        </Link>
                        <Link
                            href="/admin/users"
                            className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-600 rounded-xl hover:bg-slate-50 hover:text-slate-900 transition-all"
                        >
                            <Users className="w-4 h-4" />
                            Users
                        </Link>
                        <Link
                            href="/admin/intake"
                            className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-600 rounded-xl hover:bg-slate-50 hover:text-slate-900 transition-all"
                        >
                            <Upload className="w-4 h-4" />
                            Video Intake
                        </Link>
                        <Link
                            href="/admin/scanner"
                            className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-600 rounded-xl hover:bg-slate-50 hover:text-slate-900 transition-all"
                        >
                            <Radar className="w-4 h-4" />
                            Channel Scanner
                        </Link>
                        <Link
                            href="/admin/scanner/queue"
                            className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-600 rounded-xl hover:bg-slate-50 hover:text-slate-900 transition-all"
                        >
                            <List className="w-4 h-4" />
                            Queue Inspector
                        </Link>
                        {profile?.role === "super_admin" && (
                            <Link
                                href="/admin/chatbot"
                                className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-600 rounded-xl hover:bg-slate-50 hover:text-slate-900 transition-all"
                            >
                                <MessageSquare className="w-4 h-4 text-indigo-500" />
                                Chatbot Editor
                            </Link>
                        )}
                    </nav>

                    {/* Exit Link */}
                    <div className="border-t border-slate-200/60 pt-4">
                        <Link
                            href="/"
                            className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-500 rounded-xl hover:bg-slate-50 hover:text-slate-900 transition-all"
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
