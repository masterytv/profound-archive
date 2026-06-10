import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
    // S-9: no per-request logging here — session-cookie fragments and user
    // emails must never be written to hosting logs.
    let supabaseResponse = NextResponse.next({
        request,
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    );
                    supabaseResponse = NextResponse.next({
                        request,
                    });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    // IMPORTANT: Do not run code between createServerClient and
    // supabase.auth.getUser(). A simple mistake could make it very hard
    // to debug issues with users being randomly logged out.
    const {
        data: { user },
    } = await supabase.auth.getUser();

    // Protect Admin Routes
    if (request.nextUrl.pathname.startsWith("/admin")) {
        if (!user) {
            const redirectResponse = NextResponse.redirect(new URL("/login", request.url));
            // Preserve any session cookies that were set during token refresh
            supabaseResponse.cookies.getAll().forEach((cookie) => {
                redirectResponse.cookies.set(cookie.name, cookie.value);
            });
            return redirectResponse;
        }

        // Check for admin role
        const { data: profile } = await supabase
            .from("profiles")
            .select("role, is_banned")
            .eq("id", user.id)
            .single();

        if (!profile || (profile.role !== "admin" && profile.role !== "super_admin")) {
            console.log("Middleware Access Denied -> Redirecting to /");
            const redirectResponse = NextResponse.redirect(new URL("/", request.url));
            // Preserve session cookies on redirect
            supabaseResponse.cookies.getAll().forEach((cookie) => {
                redirectResponse.cookies.set(cookie.name, cookie.value);
            });
            return redirectResponse;
        }

        if (profile && profile.is_banned) {
            console.log("User is banned -> Redirecting");
            const redirectResponse = NextResponse.redirect(new URL("/?error=banned", request.url));
            // Preserve session cookies on redirect
            supabaseResponse.cookies.getAll().forEach((cookie) => {
                redirectResponse.cookies.set(cookie.name, cookie.value);
            });
            return redirectResponse;
        }
    }

    // IMPORTANT: You *must* return the supabaseResponse object as-is.
    // If you're creating a new response object, copy over all cookies.
    return supabaseResponse;
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};
