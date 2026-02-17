import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { Users, ShieldAlert, Shield } from "lucide-react";

export default async function AdminDashboard() {
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
                    } catch { }
                },
            },
        }
    );

    const { count: userCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

    const { count: bannedCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("is_banned", true);

    const { count: adminCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .in("role", ["admin", "super_admin"]);

    const stats = [
        {
            label: "Total Users",
            value: userCount ?? 0,
            icon: <Users className="w-5 h-5 text-blue-600" />,
            iconBg: "bg-blue-50",
            valueColor: "text-slate-900",
        },
        {
            label: "Banned Users",
            value: bannedCount ?? 0,
            icon: <ShieldAlert className="w-5 h-5 text-red-500" />,
            iconBg: "bg-red-50",
            valueColor: "text-red-600",
        },
        {
            label: "Admins",
            value: adminCount ?? 0,
            icon: <Shield className="w-5 h-5 text-emerald-600" />,
            iconBg: "bg-emerald-50",
            valueColor: "text-emerald-600",
        },
    ];

    return (
        <div>
            <h1
                className="text-2xl md:text-3xl font-bold text-slate-900 mb-6"
                style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
            >
                Dashboard Overview
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {stats.map((stat) => (
                    <div
                        key={stat.label}
                        className="bg-white rounded-2xl border border-slate-200/60 p-6 hover:shadow-md transition-shadow"
                    >
                        <div className="flex items-center gap-3 mb-3">
                            <div className={`w-9 h-9 rounded-xl ${stat.iconBg} flex items-center justify-center`}>
                                {stat.icon}
                            </div>
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                {stat.label}
                            </h3>
                        </div>
                        <p className={`text-3xl font-bold ${stat.valueColor}`}>{stat.value}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
