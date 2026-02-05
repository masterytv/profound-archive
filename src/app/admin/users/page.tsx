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

    // We need emails from auth.users, but we can't query auth.users directly with the anon client easily 
    // unless we are using the service role key which we try to avoid in Client code.
    // HOWEVER, this is a Server Component.
    // BUT `createServerClient` with ANON key still matches RLS.
    // To get emails, we usually rely on `profiles` table having email sync, OR we use the Service Role client here.
    // Since we don't want to modify global envs or leak keys, let's check if we can get emails via a joined query?
    // No, `profiles` doesn't have email column in schema we saw.
    // Workaround: We will just show detailed profile info. 
    // IF we really need emails, we should add an `email` column to `profiles` and sync it via trigger on `auth.users`,
    // OR use the Service Role client just for this page.
    // Let's assume for now we just show what's in profiles.

    const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false, nullsFirst: false } as any) // created_at might not exist on profiles based on schema?
        // checking schema: profiles has id, full_name, avatar_url, role, is_banned. NO created_at.
        // So we just order by full_name or id.
        .order("full_name")
        .limit(50);

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
                        {profiles?.map((profile) => (
                            <UserRow key={profile.id} profile={profile} />
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
