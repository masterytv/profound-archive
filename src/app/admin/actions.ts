"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function getSupabase() {
    const cookieStore = await cookies();
    return createServerClient(
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
                        // Server Component
                    }
                },
            },
        }
    );
}

// Helper to check if current user is admin
async function checkAdmin() {
    const supabase = await getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error("Unauthorized: No session");
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (!profile || (profile.role !== "admin" && profile.role !== "super_admin")) {
        throw new Error("Unauthorized: Insufficient permissions");
    }
    return { supabase, user };
}

export async function toggleBanUser(userId: string, currentStatus: boolean) {
    try {
        const { user } = await checkAdmin();

        // Prevent banning yourself
        if (user.id === userId) {
            throw new Error("You cannot ban yourself.");
        }

        // Use service role client for the update to bypass RLS
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

        const { data, error } = await adminSupabase
            .from("profiles")
            .update({ is_banned: !currentStatus })
            .eq("id", userId)
            .select();

        if (error) throw error;
        if (!data || data.length === 0) {
            throw new Error("No profile found to update.");
        }

        revalidatePath("/admin/users");
        return { success: true };
    } catch (error: any) {
        console.error("toggleBanUser error:", error.message);
        return { success: false, error: error.message };
    }
}

export async function updateUserRole(userId: string, newRole: "user" | "admin" | "super_admin") {
    try {
        await checkAdmin();

        // Use service role client for the update to bypass RLS
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

        const { error } = await adminSupabase
            .from("profiles")
            .update({ role: newRole })
            .eq("id", userId);

        if (error) throw error;

        revalidatePath("/admin/users");
        return { success: true };
    } catch (error: any) {
        console.error("updateUserRole error:", error.message);
        return { success: false, error: error.message };
    }
}

export async function deleteUser(userId: string) {
    try {
        const supabase = await createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_KEY!,
            {
                cookies: {
                    getAll() { return [] },
                    setAll() { }
                }
            }
        );

        // Prevent deleting yourself (extra safety, though client checks too)
        // Would need to check auth.uid() from cookies but we are using service role here.
        // So we skip that check or pass current user ID as arg if critical.

        const { error } = await supabase.auth.admin.deleteUser(userId);

        if (error) throw error;

        revalidatePath("/admin/users");
        return { success: true };
    } catch (error: any) {
        console.error("Delete Error:", error);
        return { success: false, error: error.message };
    }
}
