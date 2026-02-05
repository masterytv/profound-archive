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
    if (!user) throw new Error("Unauthorized");

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (!profile || (profile.role !== "admin" && profile.role !== "super_admin")) {
        throw new Error("Unauthorized");
    }
    return { supabase, user };
}

export async function toggleBanUser(userId: string, currentStatus: boolean) {
    try {
        const { supabase } = await checkAdmin();

        // Prevent banning yourself
        const { data: { user } } = await supabase.auth.getUser();
        if (user!.id === userId) {
            throw new Error("You cannot ban yourself.");
        }

        const { error } = await supabase
            .from("profiles")
            .update({ is_banned: !currentStatus })
            .eq("id", userId);

        if (error) throw error;

        revalidatePath("/admin/users");
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateUserRole(userId: string, newRole: "user" | "admin" | "super_admin") {
    try {
        const { supabase } = await checkAdmin();

        // Prevent changing your own role (optional, but good safety)
        const { data: { user } } = await supabase.auth.getUser();
        if (user!.id === userId) {
            // throw new Error("You cannot change your own role."); 
            // Allowing it for now but be careful
        }

        const { error } = await supabase
            .from("profiles")
            .update({ role: newRole })
            .eq("id", userId);

        if (error) throw error;

        revalidatePath("/admin/users");
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
