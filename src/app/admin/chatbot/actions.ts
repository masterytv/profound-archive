"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

async function getAdminSupabase() {
    const cookieStore = await cookies();
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_KEY!,
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

// Helper to check if current user is super_admin
async function checkSuperAdmin() {
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll(); },
                setAll() { }
            },
        }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (!profile || profile.role !== "super_admin") {
        throw new Error("Unauthorized: Super Admin access required");
    }
    return { user };
}

export async function getChatbotConfig(id: string) {
    try {
        await checkSuperAdmin();
        const supabase = await getAdminSupabase();

        const { data, error } = await supabase
            .from("chatbot_configs")
            .select("*")
            .eq("id", id)
            .single();

        if (error && error.code !== "PGRST116") throw error; // PGRST116 is 'not found'

        return { success: true, data };
    } catch (error: any) {
        console.error("getChatbotConfig error:", error);
        return { success: false, error: error.message };
    }
}

export async function saveStagingPrompt(id: string, content: string) {
    try {
        const { user } = await checkSuperAdmin();
        const supabase = await getAdminSupabase();

        // Check if config exists
        const { data: existing } = await supabase
            .from("chatbot_configs")
            .select("id")
            .eq("id", id)
            .single();

        if (existing) {
            const { error } = await supabase
                .from("chatbot_configs")
                .update({
                    staging_prompt: content,
                    updated_at: new Date().toISOString(),
                    updated_by: user.id
                })
                .eq("id", id);
            if (error) throw error;
        } else {
            const { error } = await supabase
                .from("chatbot_configs")
                .insert({
                    id,
                    live_prompt: content, // Initial setup: live = staging
                    staging_prompt: content,
                    updated_at: new Date().toISOString(),
                    updated_by: user.id
                });
            if (error) throw error;
        }

        revalidatePath("/admin/chatbot");
        return { success: true };
    } catch (error: any) {
        console.error("saveStagingPrompt error:", error);
        return { success: false, error: error.message };
    }
}

export async function publishPrompt(id: string) {
    try {
        const { user } = await checkSuperAdmin();
        const supabase = await getAdminSupabase();

        // Fetch staging prompt
        const { data: config, error: fetchError } = await supabase
            .from("chatbot_configs")
            .select("staging_prompt")
            .eq("id", id)
            .single();

        if (fetchError) throw fetchError;
        if (!config?.staging_prompt) throw new Error("No staging prompt available to publish.");

        const { error } = await supabase
            .from("chatbot_configs")
            .update({
                live_prompt: config.staging_prompt,
                updated_at: new Date().toISOString(),
                updated_by: user.id
            })
            .eq("id", id);

        if (error) throw error;

        revalidatePath("/admin/chatbot");
        return { success: true };
    } catch (error: any) {
        console.error("publishPrompt error:", error);
        return { success: false, error: error.message };
    }
}
