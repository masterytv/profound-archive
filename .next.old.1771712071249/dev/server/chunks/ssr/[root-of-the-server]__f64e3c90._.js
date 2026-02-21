module.exports = [
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/favicon.ico.mjs { IMAGE => \"[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/favicon.ico (static in ecmascript, tag client)\" } [app-rsc] (structured image object, ecmascript, Next.js Server Component)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/favicon.ico.mjs { IMAGE => \"[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/favicon.ico (static in ecmascript, tag client)\" } [app-rsc] (structured image object, ecmascript)"));
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/icon.png.mjs { IMAGE => \"[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/icon.png (static in ecmascript, tag client)\" } [app-rsc] (structured image object, ecmascript, Next.js Server Component)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/icon.png.mjs { IMAGE => \"[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/icon.png (static in ecmascript, tag client)\" } [app-rsc] (structured image object, ecmascript)"));
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/layout.tsx [app-rsc] (ecmascript, Next.js Server Component)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/layout.tsx [app-rsc] (ecmascript)"));
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/lib/supabase/server.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createClient",
    ()=>createClient
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/@supabase/ssr/dist/module/index.js [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$createServerClient$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/@supabase/ssr/dist/module/createServerClient.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/next/headers.js [app-rsc] (ecmascript)");
;
;
async function createClient() {
    const cookieStore = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["cookies"])();
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$createServerClient$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createServerClient"])(("TURBOPACK compile-time value", "https://vnycavclrndjwmpaugju.supabase.co"), ("TURBOPACK compile-time value", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZueWNhdmNscm5kandtcGF1Z2p1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwNTcyNzksImV4cCI6MjA2MjYzMzI3OX0.L_ExCXhKaHxK_PnOokOlgTjp-eVOlolkj0TAG9WsojI"), {
        cookies: {
            get (name) {
                return cookieStore.get(name)?.value;
            },
            set (name, value, options) {
                try {
                    cookieStore.set({
                        name,
                        value,
                        ...options
                    });
                } catch (error) {
                // The `set` method was called from a Server Component.
                // This can be ignored if you have middleware refreshing
                // user sessions.
                }
            },
            remove (name, options) {
                try {
                    cookieStore.set({
                        name,
                        value: '',
                        ...options
                    });
                } catch (error) {
                // The `delete` method was called from a Server Component.
                // This can be ignored if you have middleware refreshing
                // user sessions.
                }
            }
        }
    });
}
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/components/explore/ExplorerControls.tsx [app-rsc] (client reference proxy) <module evaluation>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ExplorerControls",
    ()=>ExplorerControls
]);
// This file is generated by next-core EcmascriptClientReferenceModule.
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const ExplorerControls = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call ExplorerControls() from the server but ExplorerControls is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/components/explore/ExplorerControls.tsx <module evaluation>", "ExplorerControls");
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/components/explore/ExplorerControls.tsx [app-rsc] (client reference proxy)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ExplorerControls",
    ()=>ExplorerControls
]);
// This file is generated by next-core EcmascriptClientReferenceModule.
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const ExplorerControls = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call ExplorerControls() from the server but ExplorerControls is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/components/explore/ExplorerControls.tsx", "ExplorerControls");
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/components/explore/ExplorerControls.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$src$2f$components$2f$explore$2f$ExplorerControls$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/components/explore/ExplorerControls.tsx [app-rsc] (client reference proxy) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$src$2f$components$2f$explore$2f$ExplorerControls$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/components/explore/ExplorerControls.tsx [app-rsc] (client reference proxy)");
;
__turbopack_context__.n(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$src$2f$components$2f$explore$2f$ExplorerControls$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__);
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/explore/transformation/page.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>TransformationExplorerPage,
    "metadata",
    ()=>metadata
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/lib/supabase/server.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$sparkles$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__Sparkles$3e$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/lucide-react/dist/esm/icons/sparkles.js [app-rsc] (ecmascript) <export default as Sparkles>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$right$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronRight$3e$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/lucide-react/dist/esm/icons/chevron-right.js [app-rsc] (ecmascript) <export default as ChevronRight>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/next/dist/client/app-dir/link.react-server.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/next/image.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$src$2f$components$2f$explore$2f$ExplorerControls$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/components/explore/ExplorerControls.tsx [app-rsc] (ecmascript)");
;
;
;
;
;
;
;
const metadata = {
    title: "Explore by Transformation Score | Project Profound",
    description: "Browse NDE accounts ranked by the NDE Transformation Index — sort by overall score, breadth, depth, or filter by classification."
};
const PAGE_SIZE = 12;
const SORT_OPTIONS = [
    {
        value: "score",
        label: "Overall Score"
    },
    {
        value: "breadth",
        label: "Breadth (domains affected)"
    },
    {
        value: "depth",
        label: "Depth (average intensity)"
    }
];
const FILTER_OPTIONS = [
    {
        value: "Comprehensive Profound Transformation",
        label: "Comprehensive Profound"
    },
    {
        value: "Major Transformation",
        label: "Major"
    },
    {
        value: "Significant Transformation",
        label: "Significant"
    },
    {
        value: "Moderate Transformation",
        label: "Moderate"
    },
    {
        value: "Minimal Transformation",
        label: "Minimal"
    }
];
// Color map for classification badges
function getClassColor(classification) {
    if (!classification) return "bg-slate-100 text-slate-600";
    if (classification.includes("Comprehensive") || classification.includes("Major")) return "bg-rose-100 text-rose-800";
    if (classification.includes("Significant")) return "bg-amber-100 text-amber-800";
    if (classification.includes("Moderate")) return "bg-blue-100 text-blue-800";
    return "bg-slate-100 text-slate-600";
}
async function TransformationExplorerPage({ searchParams }) {
    const params = await searchParams;
    const sort = params.sort || "score";
    const direction = params.dir || "desc";
    const filter = params.filter || "";
    const page = Math.max(1, parseInt(params.page || "1", 10));
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    let query = supabase.from("nde_analysis").select("video_id, transformation_score, transformation_classification, transformation_breakdown", {
        count: "exact"
    }).not("transformation_score", "is", null).gt("transformation_score", 0);
    if (filter) {
        query = query.eq("transformation_classification", filter);
    }
    query = query.order("transformation_score", {
        ascending: direction === "asc"
    });
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    query = query.range(from, to);
    const { data: analysisData, count } = await query;
    const totalResults = count || 0;
    const totalPages = Math.ceil(totalResults / PAGE_SIZE);
    // Client-side re-sort for breadth/depth
    let sortedData = analysisData || [];
    if (sort === "breadth" || sort === "depth") {
        sortedData = [
            ...sortedData
        ].sort((a, b)=>{
            const aBreakdown = a.transformation_breakdown;
            const bBreakdown = b.transformation_breakdown;
            const aVal = sort === "breadth" ? aBreakdown?.quantitative_metrics?.transformation_breadth ?? 0 : aBreakdown?.quantitative_metrics?.transformation_depth ?? 0;
            const bVal = sort === "breadth" ? bBreakdown?.quantitative_metrics?.transformation_breadth ?? 0 : bBreakdown?.quantitative_metrics?.transformation_depth ?? 0;
            return direction === "desc" ? bVal - aVal : aVal - bVal;
        });
    }
    // Fetch video metadata
    const videoIds = sortedData.map((v)=>v.video_id);
    const { data: videoMeta } = videoIds.length ? await supabase.from("nde_vids").select("videoId, title, thumbnailUrl, channelName").in("videoId", videoIds) : {
        data: []
    };
    const metaMap = new Map((videoMeta || []).map((v)=>[
            v.videoId,
            v
        ]));
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "min-h-screen",
        style: {
            background: "#F8FAFC"
        },
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "border-b border-slate-200",
                style: {
                    background: "linear-gradient(135deg, #FFF1F2 0%, #F8FAFC 100%)"
                },
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "container mx-auto px-4 py-8 max-w-7xl",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("nav", {
                            className: "flex items-center gap-1.5 text-sm text-slate-400 mb-6",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"], {
                                    href: "/",
                                    className: "hover:text-blue-600 transition-colors",
                                    children: "Home"
                                }, void 0, false, {
                                    fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/explore/transformation/page.tsx",
                                    lineNumber: 111,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$right$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronRight$3e$__["ChevronRight"], {
                                    className: "w-3.5 h-3.5"
                                }, void 0, false, {
                                    fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/explore/transformation/page.tsx",
                                    lineNumber: 114,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"], {
                                    href: "/",
                                    className: "hover:text-blue-600 transition-colors",
                                    children: "Explore"
                                }, void 0, false, {
                                    fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/explore/transformation/page.tsx",
                                    lineNumber: 115,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$right$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronRight$3e$__["ChevronRight"], {
                                    className: "w-3.5 h-3.5"
                                }, void 0, false, {
                                    fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/explore/transformation/page.tsx",
                                    lineNumber: 118,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "text-slate-700 font-medium",
                                    children: "Transformation Index"
                                }, void 0, false, {
                                    fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/explore/transformation/page.tsx",
                                    lineNumber: 119,
                                    columnNumber: 25
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/explore/transformation/page.tsx",
                            lineNumber: 110,
                            columnNumber: 21
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex items-start gap-4",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center shrink-0",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$sparkles$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__Sparkles$3e$__["Sparkles"], {
                                        className: "w-6 h-6 text-rose-600"
                                    }, void 0, false, {
                                        fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/explore/transformation/page.tsx",
                                        lineNumber: 124,
                                        columnNumber: 29
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/explore/transformation/page.tsx",
                                    lineNumber: 123,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                                            className: "text-3xl md:text-4xl font-bold text-slate-900 mb-2",
                                            style: {
                                                fontFamily: "'Crimson Pro', Georgia, serif"
                                            },
                                            children: "NDE Transformation Index"
                                        }, void 0, false, {
                                            fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/explore/transformation/page.tsx",
                                            lineNumber: 127,
                                            columnNumber: 29
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-slate-500 max-w-2xl leading-relaxed",
                                            children: "Browse experiences ranked by the depth and breadth of life transformation they describe. Sort by overall score, number of domains affected, or average depth of change."
                                        }, void 0, false, {
                                            fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/explore/transformation/page.tsx",
                                            lineNumber: 133,
                                            columnNumber: 29
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"], {
                                            href: "/scale/transformation",
                                            className: "inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 mt-3 font-medium",
                                            children: [
                                                "Learn about the Transformation Index",
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$right$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronRight$3e$__["ChevronRight"], {
                                                    className: "w-3.5 h-3.5"
                                                }, void 0, false, {
                                                    fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/explore/transformation/page.tsx",
                                                    lineNumber: 143,
                                                    columnNumber: 33
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/explore/transformation/page.tsx",
                                            lineNumber: 138,
                                            columnNumber: 29
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/explore/transformation/page.tsx",
                                    lineNumber: 126,
                                    columnNumber: 25
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/explore/transformation/page.tsx",
                            lineNumber: 122,
                            columnNumber: 21
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/explore/transformation/page.tsx",
                    lineNumber: 108,
                    columnNumber: 17
                }, this)
            }, void 0, false, {
                fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/explore/transformation/page.tsx",
                lineNumber: 104,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "container mx-auto px-4 py-8 max-w-7xl",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "bg-white rounded-2xl shadow-sm border border-slate-200/60 p-4 mb-8",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["Suspense"], {
                            fallback: null,
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$src$2f$components$2f$explore$2f$ExplorerControls$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ExplorerControls"], {
                                sortOptions: SORT_OPTIONS,
                                filterOptions: FILTER_OPTIONS,
                                filterLabel: "Classification",
                                currentSort: sort,
                                currentDirection: direction,
                                currentFilter: filter,
                                currentPage: page,
                                totalPages: totalPages,
                                totalResults: totalResults
                            }, void 0, false, {
                                fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/explore/transformation/page.tsx",
                                lineNumber: 155,
                                columnNumber: 25
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/explore/transformation/page.tsx",
                            lineNumber: 154,
                            columnNumber: 21
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/explore/transformation/page.tsx",
                        lineNumber: 153,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6",
                        children: sortedData.map((item)=>{
                            const meta = metaMap.get(item.video_id);
                            if (!meta) return null;
                            const breakdown = item.transformation_breakdown;
                            const breadth = breakdown?.quantitative_metrics?.transformation_breadth;
                            const depth = breakdown?.quantitative_metrics?.transformation_depth;
                            const sortLabel = sort !== "score" ? SORT_OPTIONS.find((o)=>o.value === sort)?.label : null;
                            const subScore = sort === "breadth" && breadth != null ? `${breadth}/10` : sort === "depth" && depth != null ? `${Number(depth).toFixed(1)}/5` : null;
                            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"], {
                                href: `/video/${item.video_id}`,
                                className: "group block bg-white rounded-2xl overflow-hidden border border-slate-200/60 hover:shadow-xl hover:border-rose-200 transition-all duration-300 cursor-pointer",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "relative aspect-video bg-slate-100 overflow-hidden",
                                        children: [
                                            meta.thumbnailUrl ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"], {
                                                src: meta.thumbnailUrl.replace("maxresdefault", "hqdefault"),
                                                alt: meta.title || "Video thumbnail",
                                                fill: true,
                                                sizes: "(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw",
                                                className: "object-cover group-hover:scale-105 transition-transform duration-500"
                                            }, void 0, false, {
                                                fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/explore/transformation/page.tsx",
                                                lineNumber: 196,
                                                columnNumber: 41
                                            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex items-center justify-center h-full text-slate-400 text-sm",
                                                children: "No Thumbnail"
                                            }, void 0, false, {
                                                fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/explore/transformation/page.tsx",
                                                lineNumber: 204,
                                                columnNumber: 41
                                            }, this),
                                            item.transformation_score !== null && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "absolute top-2.5 right-2.5",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "inline-flex items-center gap-1 bg-white/90 backdrop-blur-sm text-slate-900 text-xs font-bold px-2.5 py-1 rounded-lg shadow-sm",
                                                    children: [
                                                        item.transformation_score,
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "text-slate-400 font-normal",
                                                            children: "/50"
                                                        }, void 0, false, {
                                                            fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/explore/transformation/page.tsx",
                                                            lineNumber: 214,
                                                            columnNumber: 49
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/explore/transformation/page.tsx",
                                                    lineNumber: 212,
                                                    columnNumber: 45
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/explore/transformation/page.tsx",
                                                lineNumber: 211,
                                                columnNumber: 41
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/explore/transformation/page.tsx",
                                        lineNumber: 194,
                                        columnNumber: 33
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "p-4 space-y-2.5",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                                className: "text-sm font-semibold leading-snug line-clamp-2 text-slate-800 group-hover:text-rose-600 transition-colors",
                                                style: {
                                                    fontFamily: "'Crimson Pro', Georgia, serif",
                                                    fontSize: "15px"
                                                },
                                                children: meta.title || "Untitled"
                                            }, void 0, false, {
                                                fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/explore/transformation/page.tsx",
                                                lineNumber: 222,
                                                columnNumber: 37
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex items-center justify-between gap-2",
                                                children: [
                                                    meta.channelName && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "text-xs text-slate-400 truncate",
                                                        children: meta.channelName
                                                    }, void 0, false, {
                                                        fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/explore/transformation/page.tsx",
                                                        lineNumber: 231,
                                                        columnNumber: 45
                                                    }, this),
                                                    item.transformation_classification && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: `text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${getClassColor(item.transformation_classification)}`,
                                                        children: item.transformation_classification.replace(" Transformation", "")
                                                    }, void 0, false, {
                                                        fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/explore/transformation/page.tsx",
                                                        lineNumber: 236,
                                                        columnNumber: 45
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/explore/transformation/page.tsx",
                                                lineNumber: 229,
                                                columnNumber: 37
                                            }, this),
                                            sortLabel && subScore && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "pt-1",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "text-[11px] bg-slate-50 px-2 py-1 rounded-lg text-slate-500",
                                                    children: [
                                                        sortLabel,
                                                        ": ",
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                                            className: "text-slate-700",
                                                            children: subScore
                                                        }, void 0, false, {
                                                            fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/explore/transformation/page.tsx",
                                                            lineNumber: 246,
                                                            columnNumber: 62
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/explore/transformation/page.tsx",
                                                    lineNumber: 245,
                                                    columnNumber: 45
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/explore/transformation/page.tsx",
                                                lineNumber: 244,
                                                columnNumber: 41
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/explore/transformation/page.tsx",
                                        lineNumber: 221,
                                        columnNumber: 33
                                    }, this)
                                ]
                            }, item.video_id, true, {
                                fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/explore/transformation/page.tsx",
                                lineNumber: 188,
                                columnNumber: 29
                            }, this);
                        })
                    }, void 0, false, {
                        fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/explore/transformation/page.tsx",
                        lineNumber: 170,
                        columnNumber: 17
                    }, this),
                    sortedData.length === 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "text-center py-20",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-slate-400 text-lg",
                            children: "No results found. Try adjusting your filters."
                        }, void 0, false, {
                            fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/explore/transformation/page.tsx",
                            lineNumber: 258,
                            columnNumber: 25
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/explore/transformation/page.tsx",
                        lineNumber: 257,
                        columnNumber: 21
                    }, this),
                    totalPages > 1 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mt-10 bg-white rounded-2xl shadow-sm border border-slate-200/60 p-4",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["Suspense"], {
                            fallback: null,
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$src$2f$components$2f$explore$2f$ExplorerControls$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ExplorerControls"], {
                                sortOptions: SORT_OPTIONS,
                                filterOptions: FILTER_OPTIONS,
                                filterLabel: "Classification",
                                currentSort: sort,
                                currentDirection: direction,
                                currentFilter: filter,
                                currentPage: page,
                                totalPages: totalPages,
                                totalResults: totalResults
                            }, void 0, false, {
                                fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/explore/transformation/page.tsx",
                                lineNumber: 266,
                                columnNumber: 29
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/explore/transformation/page.tsx",
                            lineNumber: 265,
                            columnNumber: 25
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/explore/transformation/page.tsx",
                        lineNumber: 264,
                        columnNumber: 21
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/explore/transformation/page.tsx",
                lineNumber: 151,
                columnNumber: 13
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/explore/transformation/page.tsx",
        lineNumber: 102,
        columnNumber: 9
    }, this);
}
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/explore/transformation/page.tsx [app-rsc] (ecmascript, Next.js Server Component)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/explore/transformation/page.tsx [app-rsc] (ecmascript)"));
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__f64e3c90._.js.map