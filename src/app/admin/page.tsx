import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

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

    // Fetch some stats
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


    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard Overview</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h3 className="text-sm font-medium text-gray-500 uppercase">Total Users</h3>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{userCount ?? 0}</p>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h3 className="text-sm font-medium text-gray-500 uppercase">Banned Users</h3>
                    <p className="text-3xl font-bold text-red-600 mt-2">{bannedCount ?? 0}</p>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h3 className="text-sm font-medium text-gray-500 uppercase">Admins</h3>
                    <p className="text-3xl font-bold text-blue-600 mt-2">{adminCount ?? 0}</p>
                </div>
            </div>
        </div>
    );
}
