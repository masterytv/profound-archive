module.exports = [
"[project]/src/app/admin/chatbot/actions.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/* __next_internal_action_entry_do_not_use__ [{"407c6c10390b6d31135ca0b44d5065495ea6cad012":"getChatbotConfig","40f2c0207fbae9d42bede744f174d151de66e5d5fd":"publishPrompt","60a0942a12dd664aecb5333f1affe061250ee2b078":"saveStagingPrompt"},"",""] */ __turbopack_context__.s([
    "getChatbotConfig",
    ()=>getChatbotConfig,
    "publishPrompt",
    ()=>publishPrompt,
    "saveStagingPrompt",
    ()=>saveStagingPrompt
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/server-reference.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@supabase/ssr/dist/module/index.js [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$createServerClient$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@supabase/ssr/dist/module/createServerClient.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/headers.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/cache.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-validate.js [app-rsc] (ecmascript)");
;
;
;
;
async function getAdminSupabase() {
    const cookieStore = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["cookies"])();
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$createServerClient$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createServerClient"])(("TURBOPACK compile-time value", "https://vnycavclrndjwmpaugju.supabase.co"), process.env.SUPABASE_SERVICE_KEY, {
        cookies: {
            getAll () {
                return cookieStore.getAll();
            },
            setAll (cookiesToSet) {
                try {
                    cookiesToSet.forEach(({ name, value, options })=>cookieStore.set(name, value, options));
                } catch  {
                // Server Component
                }
            }
        }
    });
}
// Helper to check if current user is super_admin
async function checkSuperAdmin() {
    const cookieStore = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["cookies"])();
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$createServerClient$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createServerClient"])(("TURBOPACK compile-time value", "https://vnycavclrndjwmpaugju.supabase.co"), ("TURBOPACK compile-time value", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZueWNhdmNscm5kandtcGF1Z2p1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwNTcyNzksImV4cCI6MjA2MjYzMzI3OX0.L_ExCXhKaHxK_PnOokOlgTjp-eVOlolkj0TAG9WsojI"), {
        cookies: {
            getAll () {
                return cookieStore.getAll();
            },
            setAll () {}
        }
    });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (!profile || profile.role !== "super_admin") {
        throw new Error("Unauthorized: Super Admin access required");
    }
    return {
        user
    };
}
async function getChatbotConfig(id) {
    try {
        await checkSuperAdmin();
        const supabase = await getAdminSupabase();
        const { data, error } = await supabase.from("chatbot_configs").select("*").eq("id", id).single();
        if (error && error.code !== "PGRST116") throw error; // PGRST116 is 'not found'
        return {
            success: true,
            data
        };
    } catch (error) {
        console.error("getChatbotConfig error:", error);
        return {
            success: false,
            error: error.message
        };
    }
}
async function saveStagingPrompt(id, content) {
    try {
        const { user } = await checkSuperAdmin();
        const supabase = await getAdminSupabase();
        // Check if config exists
        const { data: existing } = await supabase.from("chatbot_configs").select("id").eq("id", id).single();
        if (existing) {
            const { error } = await supabase.from("chatbot_configs").update({
                staging_prompt: content,
                updated_at: new Date().toISOString(),
                updated_by: user.id
            }).eq("id", id);
            if (error) throw error;
        } else {
            const { error } = await supabase.from("chatbot_configs").insert({
                id,
                live_prompt: content,
                staging_prompt: content,
                updated_at: new Date().toISOString(),
                updated_by: user.id
            });
            if (error) throw error;
        }
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])("/admin/chatbot");
        return {
            success: true
        };
    } catch (error) {
        console.error("saveStagingPrompt error:", error);
        return {
            success: false,
            error: error.message
        };
    }
}
async function publishPrompt(id) {
    try {
        const { user } = await checkSuperAdmin();
        const supabase = await getAdminSupabase();
        // Fetch staging prompt
        const { data: config, error: fetchError } = await supabase.from("chatbot_configs").select("staging_prompt").eq("id", id).single();
        if (fetchError) throw fetchError;
        if (!config?.staging_prompt) throw new Error("No staging prompt available to publish.");
        const { error } = await supabase.from("chatbot_configs").update({
            live_prompt: config.staging_prompt,
            updated_at: new Date().toISOString(),
            updated_by: user.id
        }).eq("id", id);
        if (error) throw error;
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])("/admin/chatbot");
        return {
            success: true
        };
    } catch (error) {
        console.error("publishPrompt error:", error);
        return {
            success: false,
            error: error.message
        };
    }
}
;
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ensureServerEntryExports"])([
    getChatbotConfig,
    saveStagingPrompt,
    publishPrompt
]);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(getChatbotConfig, "407c6c10390b6d31135ca0b44d5065495ea6cad012", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(saveStagingPrompt, "60a0942a12dd664aecb5333f1affe061250ee2b078", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(publishPrompt, "40f2c0207fbae9d42bede744f174d151de66e5d5fd", null);
}),
"[project]/.next-internal/server/app/admin/chatbot/page/actions.js { ACTIONS_MODULE0 => \"[project]/src/app/admin/chatbot/actions.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$admin$2f$chatbot$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/app/admin/chatbot/actions.ts [app-rsc] (ecmascript)");
;
;
;
}),
"[project]/.next-internal/server/app/admin/chatbot/page/actions.js { ACTIONS_MODULE0 => \"[project]/src/app/admin/chatbot/actions.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "407c6c10390b6d31135ca0b44d5065495ea6cad012",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$admin$2f$chatbot$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getChatbotConfig"],
    "40f2c0207fbae9d42bede744f174d151de66e5d5fd",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$admin$2f$chatbot$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["publishPrompt"],
    "60a0942a12dd664aecb5333f1affe061250ee2b078",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$admin$2f$chatbot$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["saveStagingPrompt"]
]);
var __TURBOPACK__imported__module__$5b$project$5d2f2e$next$2d$internal$2f$server$2f$app$2f$admin$2f$chatbot$2f$page$2f$actions$2e$js__$7b$__ACTIONS_MODULE0__$3d3e$__$225b$project$5d2f$src$2f$app$2f$admin$2f$chatbot$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$2922$__$7d$__$5b$app$2d$rsc$5d$__$28$server__actions__loader$2c$__ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i('[project]/.next-internal/server/app/admin/chatbot/page/actions.js { ACTIONS_MODULE0 => "[project]/src/app/admin/chatbot/actions.ts [app-rsc] (ecmascript)" } [app-rsc] (server actions loader, ecmascript) <locals>');
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$admin$2f$chatbot$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/app/admin/chatbot/actions.ts [app-rsc] (ecmascript)");
}),
];

//# sourceMappingURL=_c39af3ac._.js.map