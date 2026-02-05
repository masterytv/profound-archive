import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
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
                    cookiesToSet.forEach(({ name, value, options }) =>
                        request.cookies.set(name, value)
                    );
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    const {
        data: { user },
    } = await supabase.auth.getUser();

    // Protect Admin Routes
    if (request.nextUrl.pathname.startsWith("/admin")) {
        if (!user) {
            return NextResponse.redirect(new URL("/login", request.url));
        }

        // Check for admin role
        const { data: profile, error } = await supabase
            .from("profiles")
            .select("role, is_banned")
            .eq("id", user.id)
            .single();

        if (!profile || (profile.role !== "admin" && profile.role !== "super_admin")) {
            console.log("Middleware Access Denied -> Redirecting to /");
            // Redirect to home or a 403 page
            return NextResponse.redirect(new URL("/", request.url));
        }

        if (profile && profile.is_banned) {
            console.log("User is banned -> Redirecting");
            // Redirect to banned page or show error (using home for now with param)
            return NextResponse.redirect(new URL("/?error=banned", request.url));
        }
    }

    return response;
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};
