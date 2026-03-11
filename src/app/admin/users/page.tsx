import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { UserRow } from "./user-row";
import { Users } from "lucide-react";

export default async function AdminUsersPage() {
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

    const adminSupabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_KEY!,
        {
            cookies: {
                getAll() { return [] },
                setAll() { },
            },
        }
    );

    const [
        { data: { users: authUsers }, error: authError },
        { data: profiles, error: profilesError }
    ] = await Promise.all([
        adminSupabase.auth.admin.listUsers(),
        supabase.from("profiles").select("*").order("full_name", { ascending: true }).limit(50)
    ]);

    if (authError || profilesError) {
        console.error("Error fetching users:", authError || profilesError);
    }

    const usersWithEmails = profiles?.map((profile: any) => {
        const authUser = authUsers?.find((u: any) => u.id === profile.id);
        return {
            ...profile,
            email: authUser?.email
        };
    }) || [];

    return (
        <div>
            <div className="flex items-center gap-3 mb-6">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                    <Users className="w-4.5 h-4.5 text-blue-600" />
                </div>
                <h1
                    className="text-2xl font-bold text-slate-900 dark:text-slate-100"
                    style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                >
                    Users
                </h1>
                <span className="text-xs text-slate-400 ml-auto">{usersWithEmails.length} users</span>
            </div>

            <div className="bg-white dark:bg-white/5 rounded-2xl border border-slate-200/60 dark:border-white/10 overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200/60">
                    <thead>
                        <tr className="bg-slate-50/80 dark:bg-white/5">
                            <th
                                scope="col"
                                className="px-6 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider"
                            >
                                User
                            </th>
                            <th
                                scope="col"
                                className="px-6 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider"
                            >
                                Role
                            </th>
                            <th
                                scope="col"
                                className="px-6 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider"
                            >
                                Status
                            </th>
                            <th
                                scope="col"
                                className="px-6 py-3 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider"
                            >
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                        {usersWithEmails.map((user: any) => (
                            <UserRow key={user.id} profile={user} email={user.email} />
                        ))}
                        {(!profiles || profiles.length === 0) && (
                            <tr>
                                <td colSpan={4} className="px-6 py-8 text-center text-slate-400 text-sm">
                                    No users found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
