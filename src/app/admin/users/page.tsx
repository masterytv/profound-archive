import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { UserRow } from "./user-row";

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

    // Use service role client to fetch emails from auth.users
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

    // Fetch both auth users and profiles
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

    // Merge profile data with email from auth users
    const usersWithEmails = profiles?.map((profile: any) => {
        const authUser = authUsers?.find((u: any) => u.id === profile.id);
        return {
            ...profile,
            email: authUser?.email
        };
    }) || [];

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Users</h1>
            </div>

            <div className="bg-white shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                                User
                            </th>
                            <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                                Role
                            </th>
                            <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                                Status
                            </th>
                            <th
                                scope="col"
                                className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {usersWithEmails.map((user: any) => (
                            <UserRow key={user.id} profile={user} email={user.email} />
                        ))}
                        {(!profiles || profiles.length === 0) && (
                            <tr>
                                <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
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
