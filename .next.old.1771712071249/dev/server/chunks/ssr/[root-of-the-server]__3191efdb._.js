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
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/components/ui/collapsible.tsx [app-rsc] (client reference proxy) <module evaluation>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Collapsible",
    ()=>Collapsible,
    "CollapsibleContent",
    ()=>CollapsibleContent,
    "CollapsibleTrigger",
    ()=>CollapsibleTrigger
]);
// This file is generated by next-core EcmascriptClientReferenceModule.
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const Collapsible = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call Collapsible() from the server but Collapsible is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/components/ui/collapsible.tsx <module evaluation>", "Collapsible");
const CollapsibleContent = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call CollapsibleContent() from the server but CollapsibleContent is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/components/ui/collapsible.tsx <module evaluation>", "CollapsibleContent");
const CollapsibleTrigger = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call CollapsibleTrigger() from the server but CollapsibleTrigger is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/components/ui/collapsible.tsx <module evaluation>", "CollapsibleTrigger");
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/components/ui/collapsible.tsx [app-rsc] (client reference proxy)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Collapsible",
    ()=>Collapsible,
    "CollapsibleContent",
    ()=>CollapsibleContent,
    "CollapsibleTrigger",
    ()=>CollapsibleTrigger
]);
// This file is generated by next-core EcmascriptClientReferenceModule.
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const Collapsible = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call Collapsible() from the server but Collapsible is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/components/ui/collapsible.tsx", "Collapsible");
const CollapsibleContent = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call CollapsibleContent() from the server but CollapsibleContent is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/components/ui/collapsible.tsx", "CollapsibleContent");
const CollapsibleTrigger = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call CollapsibleTrigger() from the server but CollapsibleTrigger is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/components/ui/collapsible.tsx", "CollapsibleTrigger");
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/components/ui/collapsible.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$src$2f$components$2f$ui$2f$collapsible$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/components/ui/collapsible.tsx [app-rsc] (client reference proxy) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$src$2f$components$2f$ui$2f$collapsible$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/components/ui/collapsible.tsx [app-rsc] (client reference proxy)");
;
__turbopack_context__.n(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$src$2f$components$2f$ui$2f$collapsible$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__);
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/lib/utils.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "cn",
    ()=>cn
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/clsx/dist/clsx.mjs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$tailwind$2d$merge$2f$dist$2f$bundle$2d$mjs$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/tailwind-merge/dist/bundle-mjs.mjs [app-rsc] (ecmascript)");
;
;
function cn(...inputs) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$tailwind$2d$merge$2f$dist$2f$bundle$2d$mjs$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["twMerge"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["clsx"])(inputs));
}
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/components/ui/button.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Button",
    ()=>Button,
    "buttonVariants",
    ()=>buttonVariants
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f40$radix$2d$ui$2f$react$2d$slot$2f$dist$2f$index$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/@radix-ui/react-slot/dist/index.mjs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$class$2d$variance$2d$authority$2f$dist$2f$index$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/class-variance-authority/dist/index.mjs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/lib/utils.ts [app-rsc] (ecmascript)");
;
;
;
;
;
const buttonVariants = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$class$2d$variance$2d$authority$2f$dist$2f$index$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["cva"])("inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0", {
    variants: {
        variant: {
            default: "bg-primary text-primary-foreground hover:bg-primary/90",
            destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
            outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
            secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
            ghost: "hover:bg-accent hover:text-accent-foreground",
            link: "text-primary underline-offset-4 hover:underline"
        },
        size: {
            default: "h-10 px-4 py-2",
            sm: "h-9 rounded-md px-3",
            lg: "h-11 rounded-md px-8",
            icon: "h-10 w-10"
        }
    },
    defaultVariants: {
        variant: "default",
        size: "default"
    }
});
const Button = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["forwardRef"](({ className, variant, size, asChild = false, ...props }, ref)=>{
    const Comp = asChild ? __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f40$radix$2d$ui$2f$react$2d$slot$2f$dist$2f$index$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["Slot"] : "button";
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(Comp, {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["cn"])(buttonVariants({
            variant,
            size,
            className
        })),
        ref: ref,
        ...props
    }, void 0, false, {
        fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/components/ui/button.tsx",
        lineNumber: 46,
        columnNumber: 7
    }, ("TURBOPACK compile-time value", void 0));
});
Button.displayName = "Button";
;
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/components/video/GreysonScoreCard.tsx [app-rsc] (client reference proxy) <module evaluation>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GreysonScoreCard",
    ()=>GreysonScoreCard
]);
// This file is generated by next-core EcmascriptClientReferenceModule.
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const GreysonScoreCard = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call GreysonScoreCard() from the server but GreysonScoreCard is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/components/video/GreysonScoreCard.tsx <module evaluation>", "GreysonScoreCard");
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/components/video/GreysonScoreCard.tsx [app-rsc] (client reference proxy)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GreysonScoreCard",
    ()=>GreysonScoreCard
]);
// This file is generated by next-core EcmascriptClientReferenceModule.
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const GreysonScoreCard = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call GreysonScoreCard() from the server but GreysonScoreCard is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/components/video/GreysonScoreCard.tsx", "GreysonScoreCard");
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/components/video/GreysonScoreCard.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$src$2f$components$2f$video$2f$GreysonScoreCard$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/components/video/GreysonScoreCard.tsx [app-rsc] (client reference proxy) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$src$2f$components$2f$video$2f$GreysonScoreCard$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/components/video/GreysonScoreCard.tsx [app-rsc] (client reference proxy)");
;
__turbopack_context__.n(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$src$2f$components$2f$video$2f$GreysonScoreCard$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__);
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/components/video/TransformationScoreCard.tsx [app-rsc] (client reference proxy) <module evaluation>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "TransformationScoreCard",
    ()=>TransformationScoreCard
]);
// This file is generated by next-core EcmascriptClientReferenceModule.
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const TransformationScoreCard = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call TransformationScoreCard() from the server but TransformationScoreCard is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/components/video/TransformationScoreCard.tsx <module evaluation>", "TransformationScoreCard");
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/components/video/TransformationScoreCard.tsx [app-rsc] (client reference proxy)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "TransformationScoreCard",
    ()=>TransformationScoreCard
]);
// This file is generated by next-core EcmascriptClientReferenceModule.
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const TransformationScoreCard = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call TransformationScoreCard() from the server but TransformationScoreCard is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/components/video/TransformationScoreCard.tsx", "TransformationScoreCard");
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/components/video/TransformationScoreCard.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$src$2f$components$2f$video$2f$TransformationScoreCard$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/components/video/TransformationScoreCard.tsx [app-rsc] (client reference proxy) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$src$2f$components$2f$video$2f$TransformationScoreCard$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/components/video/TransformationScoreCard.tsx [app-rsc] (client reference proxy)");
;
__turbopack_context__.n(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$src$2f$components$2f$video$2f$TransformationScoreCard$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__);
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/components/video/YouTubePlayer.tsx [app-rsc] (client reference proxy) <module evaluation>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "YouTubePlayer",
    ()=>YouTubePlayer
]);
// This file is generated by next-core EcmascriptClientReferenceModule.
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const YouTubePlayer = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call YouTubePlayer() from the server but YouTubePlayer is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/components/video/YouTubePlayer.tsx <module evaluation>", "YouTubePlayer");
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/components/video/YouTubePlayer.tsx [app-rsc] (client reference proxy)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "YouTubePlayer",
    ()=>YouTubePlayer
]);
// This file is generated by next-core EcmascriptClientReferenceModule.
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const YouTubePlayer = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call YouTubePlayer() from the server but YouTubePlayer is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/components/video/YouTubePlayer.tsx", "YouTubePlayer");
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/components/video/YouTubePlayer.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$src$2f$components$2f$video$2f$YouTubePlayer$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/components/video/YouTubePlayer.tsx [app-rsc] (client reference proxy) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$src$2f$components$2f$video$2f$YouTubePlayer$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/components/video/YouTubePlayer.tsx [app-rsc] (client reference proxy)");
;
__turbopack_context__.n(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$src$2f$components$2f$video$2f$YouTubePlayer$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__);
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/components/analysis/NderfAnalysisSection.tsx [app-rsc] (client reference proxy) <module evaluation>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "NderfAnalysisSection",
    ()=>NderfAnalysisSection
]);
// This file is generated by next-core EcmascriptClientReferenceModule.
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const NderfAnalysisSection = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call NderfAnalysisSection() from the server but NderfAnalysisSection is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/components/analysis/NderfAnalysisSection.tsx <module evaluation>", "NderfAnalysisSection");
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/components/analysis/NderfAnalysisSection.tsx [app-rsc] (client reference proxy)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "NderfAnalysisSection",
    ()=>NderfAnalysisSection
]);
// This file is generated by next-core EcmascriptClientReferenceModule.
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const NderfAnalysisSection = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call NderfAnalysisSection() from the server but NderfAnalysisSection is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/components/analysis/NderfAnalysisSection.tsx", "NderfAnalysisSection");
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/components/analysis/NderfAnalysisSection.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$src$2f$components$2f$analysis$2f$NderfAnalysisSection$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/components/analysis/NderfAnalysisSection.tsx [app-rsc] (client reference proxy) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$src$2f$components$2f$analysis$2f$NderfAnalysisSection$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/components/analysis/NderfAnalysisSection.tsx [app-rsc] (client reference proxy)");
;
__turbopack_context__.n(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$src$2f$components$2f$analysis$2f$NderfAnalysisSection$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__);
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/components/analysis/SimilarExperiences.tsx [app-rsc] (client reference proxy) <module evaluation>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "SimilarExperiences",
    ()=>SimilarExperiences
]);
// This file is generated by next-core EcmascriptClientReferenceModule.
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const SimilarExperiences = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call SimilarExperiences() from the server but SimilarExperiences is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/components/analysis/SimilarExperiences.tsx <module evaluation>", "SimilarExperiences");
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/components/analysis/SimilarExperiences.tsx [app-rsc] (client reference proxy)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "SimilarExperiences",
    ()=>SimilarExperiences
]);
// This file is generated by next-core EcmascriptClientReferenceModule.
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const SimilarExperiences = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call SimilarExperiences() from the server but SimilarExperiences is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/components/analysis/SimilarExperiences.tsx", "SimilarExperiences");
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/components/analysis/SimilarExperiences.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$src$2f$components$2f$analysis$2f$SimilarExperiences$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/components/analysis/SimilarExperiences.tsx [app-rsc] (client reference proxy) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$src$2f$components$2f$analysis$2f$SimilarExperiences$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/components/analysis/SimilarExperiences.tsx [app-rsc] (client reference proxy)");
;
__turbopack_context__.n(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$src$2f$components$2f$analysis$2f$SimilarExperiences$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__);
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>VideoPageAlt1
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/lib/supabase/server.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$api$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/next/dist/api/navigation.react-server.js [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/next/dist/client/components/navigation.react-server.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/next/dist/client/app-dir/link.react-server.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$eye$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__Eye$3e$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/lucide-react/dist/esm/icons/eye.js [app-rsc] (ecmascript) <export default as Eye>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$calendar$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__Calendar$3e$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/lucide-react/dist/esm/icons/calendar.js [app-rsc] (ecmascript) <export default as Calendar>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$user$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__User$3e$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/lucide-react/dist/esm/icons/user.js [app-rsc] (ecmascript) <export default as User>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$sparkles$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__Sparkles$3e$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/lucide-react/dist/esm/icons/sparkles.js [app-rsc] (ecmascript) <export default as Sparkles>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$down$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronDown$3e$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/lucide-react/dist/esm/icons/chevron-down.js [app-rsc] (ecmascript) <export default as ChevronDown>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$right$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronRight$3e$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/lucide-react/dist/esm/icons/chevron-right.js [app-rsc] (ecmascript) <export default as ChevronRight>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$external$2d$link$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__ExternalLink$3e$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/lucide-react/dist/esm/icons/external-link.js [app-rsc] (ecmascript) <export default as ExternalLink>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trending$2d$up$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__TrendingUp$3e$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/lucide-react/dist/esm/icons/trending-up.js [app-rsc] (ecmascript) <export default as TrendingUp>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$brain$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__Brain$3e$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/lucide-react/dist/esm/icons/brain.js [app-rsc] (ecmascript) <export default as Brain>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$book$2d$open$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__BookOpen$3e$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/lucide-react/dist/esm/icons/book-open.js [app-rsc] (ecmascript) <export default as BookOpen>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$src$2f$components$2f$ui$2f$collapsible$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/components/ui/collapsible.tsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/components/ui/button.tsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$src$2f$components$2f$video$2f$GreysonScoreCard$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/components/video/GreysonScoreCard.tsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$src$2f$components$2f$video$2f$TransformationScoreCard$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/components/video/TransformationScoreCard.tsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$src$2f$components$2f$video$2f$YouTubePlayer$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/components/video/YouTubePlayer.tsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$src$2f$components$2f$analysis$2f$NderfAnalysisSection$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/components/analysis/NderfAnalysisSection.tsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$src$2f$components$2f$analysis$2f$SimilarExperiences$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/components/analysis/SimilarExperiences.tsx [app-rsc] (ecmascript)");
;
;
;
;
;
;
;
;
;
;
;
;
// --- Helpers ---
function formatViewCount(count) {
    if (!count) return "0";
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toLocaleString();
}
function formatDate(dateString) {
    if (!dateString) return "Unknown date";
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return "Unknown date";
        return date.toLocaleDateString(undefined, {
            year: "numeric",
            month: "long",
            day: "numeric"
        });
    } catch  {
        return "Unknown date";
    }
}
function getLevelColor(level) {
    if (!level) return {
        bg: "bg-slate-50",
        text: "text-slate-600",
        border: "border-slate-200",
        dot: "bg-slate-400"
    };
    const l = level.toLowerCase();
    if (l.includes("exceptional")) return {
        bg: "bg-emerald-50",
        text: "text-emerald-800",
        border: "border-emerald-200",
        dot: "bg-emerald-500"
    };
    if (l.includes("high") || l.includes("strong")) return {
        bg: "bg-amber-50",
        text: "text-amber-800",
        border: "border-amber-200",
        dot: "bg-amber-500"
    };
    return {
        bg: "bg-blue-50",
        text: "text-blue-800",
        border: "border-blue-200",
        dot: "bg-blue-500"
    };
}
function RvndeDetailsSection({ details }) {
    if (!details || typeof details !== "object") return null;
    const entries = Object.entries(details);
    if (entries.length === 0) return null;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "grid grid-cols-1 sm:grid-cols-2 gap-3",
        children: entries.map(([key, value])=>{
            const label = key.replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/\b\w/g, (c)=>c.toUpperCase());
            if (typeof value !== "object" || value === null) return null;
            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "bg-slate-50 rounded-xl p-3 border border-slate-100",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center justify-between mb-1.5",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-xs font-semibold text-slate-700",
                                children: label
                            }, void 0, false, {
                                fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                lineNumber: 102,
                                columnNumber: 29
                            }, this),
                            value.score !== undefined && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-xs font-bold bg-white px-2 py-0.5 rounded-lg border border-slate-200 text-slate-800",
                                children: [
                                    value.score,
                                    "/4"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                lineNumber: 104,
                                columnNumber: 33
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                        lineNumber: 101,
                        columnNumber: 25
                    }, this),
                    value.quote && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-[11px] text-slate-500 italic leading-snug mb-1",
                        children: [
                            "“",
                            value.quote,
                            "”"
                        ]
                    }, void 0, true, {
                        fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                        lineNumber: 110,
                        columnNumber: 29
                    }, this),
                    value.reasoning && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-[11px] text-slate-500 leading-snug",
                        children: value.reasoning
                    }, void 0, false, {
                        fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                        lineNumber: 115,
                        columnNumber: 29
                    }, this)
                ]
            }, key, true, {
                fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                lineNumber: 97,
                columnNumber: 21
            }, this);
        })
    }, void 0, false, {
        fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
        lineNumber: 87,
        columnNumber: 9
    }, this);
}
async function VideoPageAlt1({ params }) {
    const { id } = await params;
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    const { data: video, error } = await supabase.from("nde_vids").select(`
      videoId,
      title,
      channelName,
      channelId,
      channelUrl,
      date,
      viewCount,
      experiencerFullName,
      analysis_nde_summary,
      subtitles_punctuated,
      rvnde_total_score,
      rvnde_level,
      rvnde_summary_reason,
      rvnde_details,
      url,
      thumbnailUrl
    `).eq("videoId", id).single();
    if (error || !video) {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["notFound"])();
    }
    const { data: analysis } = await supabase.from("nde_analysis").select("total_greyson_score, scale_agreement, greyson_breakdown, transformation_score, transformation_classification, transformation_breakdown, experience_type, core_elements, trigger_category, overall_tone, intensity_rating, journey_sequence, journey_notes, phenomenology, entities, content_safety").eq("video_id", id).single();
    // Fetch similar experiences server-side (avoids client-side AbortError from React strict mode)
    const { data: similarData } = await supabase.rpc("find_similar_experiences", {
        target_video_id: id,
        match_count: 6,
        similarity_threshold: 0.7
    });
    const similarExperiences = similarData || [];
    const levelColor = getLevelColor(video.rvnde_level);
    const hasVeridical = video.rvnde_total_score !== null || video.rvnde_level;
    const hasGreyson = analysis && analysis.greyson_breakdown;
    const hasTransformation = analysis && analysis.transformation_breakdown;
    const scoreCount = [
        hasVeridical,
        hasGreyson,
        hasTransformation
    ].filter(Boolean).length;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "min-h-screen",
        style: {
            background: "#F8FAFC"
        },
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "border-b border-slate-200 bg-white/60 backdrop-blur-sm sticky top-0 z-10",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "container mx-auto px-4 max-w-6xl",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("nav", {
                        className: "flex items-center gap-1.5 text-sm text-slate-400 py-3",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"], {
                                href: "/",
                                className: "hover:text-blue-600 transition-colors",
                                children: "Home"
                            }, void 0, false, {
                                fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                lineNumber: 189,
                                columnNumber: 25
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$right$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronRight$3e$__["ChevronRight"], {
                                className: "w-3.5 h-3.5"
                            }, void 0, false, {
                                fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                lineNumber: 192,
                                columnNumber: 25
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"], {
                                href: "/search3",
                                className: "hover:text-blue-600 transition-colors",
                                children: "Search"
                            }, void 0, false, {
                                fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                lineNumber: 193,
                                columnNumber: 25
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$right$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronRight$3e$__["ChevronRight"], {
                                className: "w-3.5 h-3.5"
                            }, void 0, false, {
                                fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                lineNumber: 196,
                                columnNumber: 25
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-slate-600 font-medium truncate max-w-[200px] sm:max-w-xs",
                                children: video.title || "Video"
                            }, void 0, false, {
                                fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                lineNumber: 197,
                                columnNumber: 25
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                        lineNumber: 188,
                        columnNumber: 21
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                    lineNumber: 187,
                    columnNumber: 17
                }, this)
            }, void 0, false, {
                fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                lineNumber: 186,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "container mx-auto px-4 py-8 max-w-6xl",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "space-y-8",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "relative w-full aspect-video rounded-2xl overflow-hidden shadow-lg bg-black",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$src$2f$components$2f$video$2f$YouTubePlayer$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["YouTubePlayer"], {
                                        videoId: video.videoId,
                                        title: video.title || "Video"
                                    }, void 0, false, {
                                        fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                        lineNumber: 211,
                                        columnNumber: 29
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                    lineNumber: 210,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "space-y-4",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                                            className: "text-2xl md:text-3xl font-bold text-slate-900 leading-tight",
                                            style: {
                                                fontFamily: "'Crimson Pro', Georgia, serif"
                                            },
                                            children: video.title || "Untitled Video"
                                        }, void 0, false, {
                                            fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                            lineNumber: 216,
                                            columnNumber: 29
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex flex-wrap items-center gap-3 text-sm",
                                            children: [
                                                video.channelName && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"], {
                                                    href: video.channelId ? `/channel/${video.channelId}` : video.channelUrl || "#",
                                                    className: "flex items-center gap-1.5 font-medium text-slate-800 hover:text-blue-600 transition-colors",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold",
                                                            children: video.channelName.charAt(0)
                                                        }, void 0, false, {
                                                            fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                            lineNumber: 229,
                                                            columnNumber: 41
                                                        }, this),
                                                        video.channelName
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                    lineNumber: 225,
                                                    columnNumber: 37
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "text-slate-300",
                                                    children: "·"
                                                }, void 0, false, {
                                                    fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                    lineNumber: 236,
                                                    columnNumber: 33
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex items-center gap-1 text-slate-500",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$calendar$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__Calendar$3e$__["Calendar"], {
                                                            className: "w-3.5 h-3.5"
                                                        }, void 0, false, {
                                                            fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                            lineNumber: 239,
                                                            columnNumber: 37
                                                        }, this),
                                                        formatDate(video.date)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                    lineNumber: 238,
                                                    columnNumber: 33
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex items-center gap-1 text-slate-500",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$eye$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__Eye$3e$__["Eye"], {
                                                            className: "w-3.5 h-3.5"
                                                        }, void 0, false, {
                                                            fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                            lineNumber: 244,
                                                            columnNumber: 37
                                                        }, this),
                                                        formatViewCount(video.viewCount),
                                                        " views"
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                    lineNumber: 243,
                                                    columnNumber: 33
                                                }, this),
                                                video.experiencerFullName && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex items-center gap-1 text-slate-500",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$user$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__User$3e$__["User"], {
                                                            className: "w-3.5 h-3.5"
                                                        }, void 0, false, {
                                                            fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                            lineNumber: 250,
                                                            columnNumber: 41
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            children: [
                                                                "Experiencer: ",
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                                                    className: "text-slate-700",
                                                                    children: video.experiencerFullName
                                                                }, void 0, false, {
                                                                    fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                                    lineNumber: 252,
                                                                    columnNumber: 58
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                            lineNumber: 251,
                                                            columnNumber: 41
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                    lineNumber: 249,
                                                    columnNumber: 37
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                            lineNumber: 223,
                                            columnNumber: 29
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"], {
                                            href: video.url || `https://www.youtube.com/watch?v=${video.videoId}`,
                                            target: "_blank",
                                            className: "inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$external$2d$link$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__ExternalLink$3e$__["ExternalLink"], {
                                                    className: "w-3.5 h-3.5"
                                                }, void 0, false, {
                                                    fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                    lineNumber: 264,
                                                    columnNumber: 33
                                                }, this),
                                                "Watch on YouTube"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                            lineNumber: 259,
                                            columnNumber: 29
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                    lineNumber: 215,
                                    columnNumber: 25
                                }, this),
                                scoreCount > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "lg:hidden bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                            className: "text-sm font-bold text-slate-800 uppercase tracking-wider mb-4",
                                            style: {
                                                fontFamily: "'Crimson Pro', Georgia, serif",
                                                letterSpacing: "0.05em"
                                            },
                                            children: "Research Scores"
                                        }, void 0, false, {
                                            fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                            lineNumber: 272,
                                            columnNumber: 33
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "grid grid-cols-3 gap-3",
                                            children: [
                                                hasVeridical && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                                    href: "#section-veridical",
                                                    className: "rounded-xl p-3 block cursor-pointer hover:ring-2 hover:ring-emerald-300 transition-all ${levelColor.bg} ${levelColor.border} border",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "flex items-center gap-1.5 mb-1",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trending$2d$up$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__TrendingUp$3e$__["TrendingUp"], {
                                                                    className: "w-3.5 h-3.5 text-emerald-600"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                                    lineNumber: 282,
                                                                    columnNumber: 49
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    className: "text-[10px] font-semibold text-slate-700",
                                                                    children: "Veridical"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                                    lineNumber: 283,
                                                                    columnNumber: 49
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                            lineNumber: 281,
                                                            columnNumber: 45
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "flex items-baseline gap-1",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    className: "text-xl font-bold text-slate-900",
                                                                    children: video.rvnde_total_score ?? "—"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                                    lineNumber: 286,
                                                                    columnNumber: 49
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    className: "text-xs text-slate-400",
                                                                    children: "/28"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                                    lineNumber: 287,
                                                                    columnNumber: 49
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                            lineNumber: 285,
                                                            columnNumber: 45
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                    lineNumber: 280,
                                                    columnNumber: 41
                                                }, this),
                                                hasGreyson && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                                    href: "#section-greyson",
                                                    className: "rounded-xl p-3 block cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all bg-blue-50 border border-blue-200",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "flex items-center gap-1.5 mb-1",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$brain$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__Brain$3e$__["Brain"], {
                                                                    className: "w-3.5 h-3.5 text-blue-600"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                                    lineNumber: 294,
                                                                    columnNumber: 49
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    className: "text-[10px] font-semibold text-slate-700",
                                                                    children: "Greyson"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                                    lineNumber: 295,
                                                                    columnNumber: 49
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                            lineNumber: 293,
                                                            columnNumber: 45
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "flex items-baseline gap-1",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    className: "text-xl font-bold text-slate-900",
                                                                    children: analysis.total_greyson_score ?? "—"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                                    lineNumber: 298,
                                                                    columnNumber: 49
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    className: "text-xs text-slate-400",
                                                                    children: "/32"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                                    lineNumber: 299,
                                                                    columnNumber: 49
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                            lineNumber: 297,
                                                            columnNumber: 45
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                    lineNumber: 292,
                                                    columnNumber: 41
                                                }, this),
                                                hasTransformation && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                                    href: "#section-transformation",
                                                    className: "rounded-xl p-3 block cursor-pointer hover:ring-2 hover:ring-rose-300 transition-all bg-rose-50 border border-rose-200",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "flex items-center gap-1.5 mb-1",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$sparkles$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__Sparkles$3e$__["Sparkles"], {
                                                                    className: "w-3.5 h-3.5 text-rose-600"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                                    lineNumber: 306,
                                                                    columnNumber: 49
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    className: "text-[10px] font-semibold text-slate-700",
                                                                    children: "Transform"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                                    lineNumber: 307,
                                                                    columnNumber: 49
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                            lineNumber: 305,
                                                            columnNumber: 45
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "flex items-baseline gap-1",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    className: "text-xl font-bold text-slate-900",
                                                                    children: analysis.transformation_score ?? "—"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                                    lineNumber: 310,
                                                                    columnNumber: 49
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    className: "text-xs text-slate-400",
                                                                    children: "/50"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                                    lineNumber: 311,
                                                                    columnNumber: 49
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                            lineNumber: 309,
                                                            columnNumber: 45
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                    lineNumber: 304,
                                                    columnNumber: 41
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                            lineNumber: 278,
                                            columnNumber: 33
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                    lineNumber: 271,
                                    columnNumber: 29
                                }, this),
                                video.analysis_nde_summary && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "px-6 py-4 border-b border-slate-100 flex items-center gap-2",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$sparkles$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__Sparkles$3e$__["Sparkles"], {
                                                    className: "w-4 h-4 text-blue-500"
                                                }, void 0, false, {
                                                    fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                    lineNumber: 323,
                                                    columnNumber: 37
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                                    className: "text-lg font-bold text-slate-900",
                                                    style: {
                                                        fontFamily: "'Crimson Pro', Georgia, serif"
                                                    },
                                                    children: "AI Summary"
                                                }, void 0, false, {
                                                    fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                    lineNumber: 324,
                                                    columnNumber: 37
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "ml-auto text-[10px] font-medium bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full",
                                                    children: "AI-generated"
                                                }, void 0, false, {
                                                    fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                    lineNumber: 330,
                                                    columnNumber: 37
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                            lineNumber: 322,
                                            columnNumber: 33
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "px-6 py-5",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-slate-700 leading-relaxed whitespace-pre-line text-[15px]",
                                                children: video.analysis_nde_summary
                                            }, void 0, false, {
                                                fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                lineNumber: 335,
                                                columnNumber: 37
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                            lineNumber: 334,
                                            columnNumber: 33
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                    lineNumber: 321,
                                    columnNumber: 29
                                }, this),
                                analysis && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$src$2f$components$2f$analysis$2f$NderfAnalysisSection$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["NderfAnalysisSection"], {
                                    data: {
                                        experience_type: analysis.experience_type,
                                        trigger_category: analysis.trigger_category,
                                        tone: analysis.overall_tone,
                                        intensity_rating: analysis.intensity_rating,
                                        nde_elements: analysis.core_elements,
                                        journey_flow: analysis.journey_sequence,
                                        phenomenology: analysis.phenomenology,
                                        entities: analysis.entities,
                                        content_safety: analysis.content_safety,
                                        nde_summary: null
                                    }
                                }, void 0, false, {
                                    fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                    lineNumber: 344,
                                    columnNumber: 29
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$src$2f$components$2f$analysis$2f$SimilarExperiences$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SimilarExperiences"], {
                                    results: similarExperiences
                                }, void 0, false, {
                                    fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                    lineNumber: 361,
                                    columnNumber: 25
                                }, this),
                                hasVeridical && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    id: "section-veridical",
                                    className: `bg-white rounded-2xl border-2 ${levelColor.border} shadow-sm overflow-hidden scroll-mt-16`,
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: `px-6 py-4 ${levelColor.bg} flex items-center gap-3`,
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "w-10 h-10 rounded-xl bg-white/80 flex items-center justify-center",
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trending$2d$up$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__TrendingUp$3e$__["TrendingUp"], {
                                                        className: "w-5 h-5 text-emerald-600"
                                                    }, void 0, false, {
                                                        fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                        lineNumber: 368,
                                                        columnNumber: 41
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                    lineNumber: 367,
                                                    columnNumber: 37
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex-1",
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                                        className: "text-lg font-bold text-slate-900",
                                                        style: {
                                                            fontFamily: "'Crimson Pro', Georgia, serif"
                                                        },
                                                        children: [
                                                            "Veridical Perception",
                                                            " ",
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: "text-slate-400 font-normal text-base",
                                                                children: "(cvNDE)"
                                                            }, void 0, false, {
                                                                fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                                lineNumber: 376,
                                                                columnNumber: 45
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                        lineNumber: 371,
                                                        columnNumber: 41
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                    lineNumber: 370,
                                                    columnNumber: 37
                                                }, this),
                                                video.rvnde_total_score !== null && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex items-baseline gap-1 bg-white/90 px-4 py-2 rounded-xl shadow-sm",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "text-3xl font-bold text-slate-900",
                                                            children: video.rvnde_total_score
                                                        }, void 0, false, {
                                                            fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                            lineNumber: 381,
                                                            columnNumber: 45
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "text-slate-400 text-lg",
                                                            children: "/28"
                                                        }, void 0, false, {
                                                            fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                            lineNumber: 382,
                                                            columnNumber: 45
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                    lineNumber: 380,
                                                    columnNumber: 41
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                            lineNumber: 366,
                                            columnNumber: 33
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "px-6 py-5 space-y-4",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex items-center gap-2 flex-wrap",
                                                    children: [
                                                        video.rvnde_level && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: `inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${levelColor.bg} ${levelColor.text}`,
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    className: `w-2 h-2 rounded-full ${levelColor.dot}`
                                                                }, void 0, false, {
                                                                    fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                                    lineNumber: 390,
                                                                    columnNumber: 49
                                                                }, this),
                                                                video.rvnde_level
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                            lineNumber: 389,
                                                            columnNumber: 45
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"], {
                                                            href: "/scale/cvnde",
                                                            target: "_blank",
                                                            className: "text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1",
                                                            children: [
                                                                "About this scale ",
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$external$2d$link$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__ExternalLink$3e$__["ExternalLink"], {
                                                                    className: "w-3 h-3"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                                    lineNumber: 399,
                                                                    columnNumber: 62
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                            lineNumber: 394,
                                                            columnNumber: 41
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                    lineNumber: 387,
                                                    columnNumber: 37
                                                }, this),
                                                video.rvnde_summary_reason && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "text-sm text-slate-600 leading-relaxed",
                                                    children: video.rvnde_summary_reason
                                                }, void 0, false, {
                                                    fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                    lineNumber: 404,
                                                    columnNumber: 41
                                                }, this),
                                                video.rvnde_details && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$src$2f$components$2f$ui$2f$collapsible$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["Collapsible"], {
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$src$2f$components$2f$ui$2f$collapsible$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["CollapsibleTrigger"], {
                                                            asChild: true,
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["Button"], {
                                                                variant: "ghost",
                                                                size: "sm",
                                                                className: "w-full justify-between text-sm text-slate-600 hover:text-blue-600",
                                                                children: [
                                                                    "View Criteria Breakdown",
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$down$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronDown$3e$__["ChevronDown"], {
                                                                        className: "w-4 h-4"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                                        lineNumber: 418,
                                                                        columnNumber: 53
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                                lineNumber: 412,
                                                                columnNumber: 49
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                            lineNumber: 411,
                                                            columnNumber: 45
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$src$2f$components$2f$ui$2f$collapsible$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["CollapsibleContent"], {
                                                            className: "pt-3",
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(RvndeDetailsSection, {
                                                                details: video.rvnde_details
                                                            }, void 0, false, {
                                                                fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                                lineNumber: 422,
                                                                columnNumber: 49
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                            lineNumber: 421,
                                                            columnNumber: 45
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                    lineNumber: 410,
                                                    columnNumber: 41
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                            lineNumber: 386,
                                            columnNumber: 33
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                    lineNumber: 365,
                                    columnNumber: 29
                                }, this),
                                hasGreyson && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    id: "section-greyson",
                                    className: "lg:hidden scroll-mt-16",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$src$2f$components$2f$video$2f$GreysonScoreCard$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["GreysonScoreCard"], {
                                        totalScore: analysis.total_greyson_score,
                                        classification: analysis.scale_agreement,
                                        breakdown: analysis.greyson_breakdown
                                    }, void 0, false, {
                                        fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                        lineNumber: 433,
                                        columnNumber: 33
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                    lineNumber: 432,
                                    columnNumber: 29
                                }, this),
                                hasTransformation && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    id: "section-transformation",
                                    className: "lg:hidden scroll-mt-16",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$src$2f$components$2f$video$2f$TransformationScoreCard$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TransformationScoreCard"], {
                                        totalScore: analysis.transformation_score,
                                        classification: analysis.transformation_classification,
                                        breakdown: analysis.transformation_breakdown
                                    }, void 0, false, {
                                        fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                        lineNumber: 442,
                                        columnNumber: 33
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                    lineNumber: 441,
                                    columnNumber: 29
                                }, this),
                                video.subtitles_punctuated && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$src$2f$components$2f$ui$2f$collapsible$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["Collapsible"], {
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$src$2f$components$2f$ui$2f$collapsible$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["CollapsibleTrigger"], {
                                                asChild: true,
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                    className: "w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "flex items-center gap-2",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$book$2d$open$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__BookOpen$3e$__["BookOpen"], {
                                                                    className: "w-4 h-4 text-slate-500"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                                    lineNumber: 457,
                                                                    columnNumber: 49
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                                                    className: "text-lg font-bold text-slate-900",
                                                                    style: {
                                                                        fontFamily: "'Crimson Pro', Georgia, serif"
                                                                    },
                                                                    children: "Full Transcript"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                                    lineNumber: 458,
                                                                    columnNumber: 49
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                            lineNumber: 456,
                                                            columnNumber: 45
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$down$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronDown$3e$__["ChevronDown"], {
                                                            className: "w-5 h-5 text-slate-400"
                                                        }, void 0, false, {
                                                            fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                            lineNumber: 465,
                                                            columnNumber: 45
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                    lineNumber: 455,
                                                    columnNumber: 41
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                lineNumber: 454,
                                                columnNumber: 37
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$src$2f$components$2f$ui$2f$collapsible$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["CollapsibleContent"], {
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "px-6 pb-6",
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "bg-slate-50 rounded-xl p-5 max-h-[500px] overflow-y-auto border border-slate-100",
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "text-sm text-slate-700 leading-relaxed whitespace-pre-line",
                                                            children: video.subtitles_punctuated
                                                        }, void 0, false, {
                                                            fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                            lineNumber: 471,
                                                            columnNumber: 49
                                                        }, this)
                                                    }, void 0, false, {
                                                        fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                        lineNumber: 470,
                                                        columnNumber: 45
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                    lineNumber: 469,
                                                    columnNumber: 41
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                lineNumber: 468,
                                                columnNumber: 37
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                        lineNumber: 453,
                                        columnNumber: 33
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                    lineNumber: 452,
                                    columnNumber: 29
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                            lineNumber: 208,
                            columnNumber: 21
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "hidden lg:block space-y-6 lg:sticky lg:top-14 lg:self-start lg:max-h-[calc(100vh-4rem)] lg:overflow-y-auto lg:scrollbar-thin lg:pr-1",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                            className: "text-sm font-bold text-slate-800 uppercase tracking-wider mb-4",
                                            style: {
                                                fontFamily: "'Crimson Pro', Georgia, serif",
                                                letterSpacing: "0.05em"
                                            },
                                            children: "Research Scores"
                                        }, void 0, false, {
                                            fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                            lineNumber: 486,
                                            columnNumber: 29
                                        }, this),
                                        scoreCount === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-sm text-slate-400 leading-relaxed",
                                            children: "This video has not yet been analyzed by our research scales."
                                        }, void 0, false, {
                                            fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                            lineNumber: 494,
                                            columnNumber: 33
                                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "space-y-3",
                                            children: [
                                                hasVeridical && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                                    href: "#section-veridical",
                                                    className: `rounded-xl p-3 block cursor-pointer hover:ring-2 hover:ring-emerald-300 transition-all ${levelColor.bg} ${levelColor.border} border`,
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "flex items-center gap-2 mb-1",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trending$2d$up$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__TrendingUp$3e$__["TrendingUp"], {
                                                                    className: "w-4 h-4 text-emerald-600"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                                    lineNumber: 503,
                                                                    columnNumber: 49
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    className: "text-xs font-semibold text-slate-700",
                                                                    children: "Veridical Perception"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                                    lineNumber: 504,
                                                                    columnNumber: 49
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                            lineNumber: 502,
                                                            columnNumber: 45
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "flex items-baseline gap-1.5",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    className: "text-2xl font-bold text-slate-900",
                                                                    children: video.rvnde_total_score ?? "—"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                                    lineNumber: 507,
                                                                    columnNumber: 49
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    className: "text-sm text-slate-400",
                                                                    children: "/28"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                                    lineNumber: 510,
                                                                    columnNumber: 49
                                                                }, this),
                                                                video.rvnde_level && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    className: `ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full ${levelColor.text} bg-white/70`,
                                                                    children: video.rvnde_level.replace(" Evidential Strength", "")
                                                                }, void 0, false, {
                                                                    fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                                    lineNumber: 512,
                                                                    columnNumber: 53
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                            lineNumber: 506,
                                                            columnNumber: 45
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                    lineNumber: 501,
                                                    columnNumber: 41
                                                }, this),
                                                hasGreyson && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                                    href: "#section-greyson-desktop",
                                                    className: "rounded-xl p-3 block cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all bg-blue-50 border border-blue-200",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "flex items-center gap-2 mb-1",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$brain$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__Brain$3e$__["Brain"], {
                                                                    className: "w-4 h-4 text-blue-600"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                                    lineNumber: 524,
                                                                    columnNumber: 49
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    className: "text-xs font-semibold text-slate-700",
                                                                    children: "Greyson Scale"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                                    lineNumber: 525,
                                                                    columnNumber: 49
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                            lineNumber: 523,
                                                            columnNumber: 45
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "flex items-baseline gap-1.5",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    className: "text-2xl font-bold text-slate-900",
                                                                    children: analysis.total_greyson_score ?? "—"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                                    lineNumber: 528,
                                                                    columnNumber: 49
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    className: "text-sm text-slate-400",
                                                                    children: "/32"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                                    lineNumber: 531,
                                                                    columnNumber: 49
                                                                }, this),
                                                                analysis.scale_agreement && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    className: "ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full text-blue-700 bg-white/70",
                                                                    children: analysis.scale_agreement
                                                                }, void 0, false, {
                                                                    fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                                    lineNumber: 533,
                                                                    columnNumber: 53
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                            lineNumber: 527,
                                                            columnNumber: 45
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                    lineNumber: 522,
                                                    columnNumber: 41
                                                }, this),
                                                hasTransformation && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                                    href: "#section-transformation-desktop",
                                                    className: "rounded-xl p-3 block cursor-pointer hover:ring-2 hover:ring-rose-300 transition-all bg-rose-50 border border-rose-200",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "flex items-center gap-2 mb-1",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$sparkles$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__Sparkles$3e$__["Sparkles"], {
                                                                    className: "w-4 h-4 text-rose-600"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                                    lineNumber: 545,
                                                                    columnNumber: 49
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    className: "text-xs font-semibold text-slate-700",
                                                                    children: "Transformation"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                                    lineNumber: 546,
                                                                    columnNumber: 49
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                            lineNumber: 544,
                                                            columnNumber: 45
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "flex items-baseline gap-1.5",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    className: "text-2xl font-bold text-slate-900",
                                                                    children: analysis.transformation_score ?? "—"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                                    lineNumber: 549,
                                                                    columnNumber: 49
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    className: "text-sm text-slate-400",
                                                                    children: "/50"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                                    lineNumber: 552,
                                                                    columnNumber: 49
                                                                }, this),
                                                                analysis.transformation_classification && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    className: "ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full text-rose-700 bg-white/70",
                                                                    children: analysis.transformation_classification
                                                                }, void 0, false, {
                                                                    fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                                    lineNumber: 554,
                                                                    columnNumber: 53
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                            lineNumber: 548,
                                                            columnNumber: 45
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                    lineNumber: 543,
                                                    columnNumber: 41
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                            lineNumber: 498,
                                            columnNumber: 33
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "mt-5 pt-4 border-t border-slate-100 space-y-2",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"], {
                                                    href: "/scale/cvnde",
                                                    className: "flex items-center justify-between text-xs text-slate-500 hover:text-blue-600 transition-colors py-1",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            children: "About cvNDE Scale"
                                                        }, void 0, false, {
                                                            fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                            lineNumber: 570,
                                                            columnNumber: 37
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$right$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronRight$3e$__["ChevronRight"], {
                                                            className: "w-3.5 h-3.5"
                                                        }, void 0, false, {
                                                            fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                            lineNumber: 571,
                                                            columnNumber: 37
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                    lineNumber: 566,
                                                    columnNumber: 33
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"], {
                                                    href: "/scale/greyson",
                                                    className: "flex items-center justify-between text-xs text-slate-500 hover:text-blue-600 transition-colors py-1",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            children: "About Greyson Scale"
                                                        }, void 0, false, {
                                                            fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                            lineNumber: 577,
                                                            columnNumber: 37
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$right$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronRight$3e$__["ChevronRight"], {
                                                            className: "w-3.5 h-3.5"
                                                        }, void 0, false, {
                                                            fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                            lineNumber: 578,
                                                            columnNumber: 37
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                    lineNumber: 573,
                                                    columnNumber: 33
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"], {
                                                    href: "/scale/transformation",
                                                    className: "flex items-center justify-between text-xs text-slate-500 hover:text-blue-600 transition-colors py-1",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            children: "About NDE-TI Scale"
                                                        }, void 0, false, {
                                                            fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                            lineNumber: 584,
                                                            columnNumber: 37
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$right$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronRight$3e$__["ChevronRight"], {
                                                            className: "w-3.5 h-3.5"
                                                        }, void 0, false, {
                                                            fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                            lineNumber: 585,
                                                            columnNumber: 37
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                                    lineNumber: 580,
                                                    columnNumber: 33
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                            lineNumber: 565,
                                            columnNumber: 29
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                    lineNumber: 485,
                                    columnNumber: 25
                                }, this),
                                hasGreyson && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    id: "section-greyson-desktop",
                                    className: "scroll-mt-16",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$src$2f$components$2f$video$2f$GreysonScoreCard$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["GreysonScoreCard"], {
                                        totalScore: analysis.total_greyson_score,
                                        classification: analysis.scale_agreement,
                                        breakdown: analysis.greyson_breakdown
                                    }, void 0, false, {
                                        fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                        lineNumber: 593,
                                        columnNumber: 33
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                    lineNumber: 592,
                                    columnNumber: 29
                                }, this),
                                hasTransformation && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    id: "section-transformation-desktop",
                                    className: "scroll-mt-16",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Antigravity$2f$ProjectProfound$2f$profound$2d$archive$2f$src$2f$components$2f$video$2f$TransformationScoreCard$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TransformationScoreCard"], {
                                        totalScore: analysis.transformation_score,
                                        classification: analysis.transformation_classification,
                                        breakdown: analysis.transformation_breakdown
                                    }, void 0, false, {
                                        fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                        lineNumber: 604,
                                        columnNumber: 33
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                                    lineNumber: 603,
                                    columnNumber: 29
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                            lineNumber: 483,
                            columnNumber: 21
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                    lineNumber: 206,
                    columnNumber: 17
                }, this)
            }, void 0, false, {
                fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
                lineNumber: 205,
                columnNumber: 13
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx",
        lineNumber: 184,
        columnNumber: 9
    }, this);
}
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx [app-rsc] (ecmascript, Next.js Server Component)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/video/[id]/page.tsx [app-rsc] (ecmascript)"));
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__3191efdb._.js.map