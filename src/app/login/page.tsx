"use client";

import { createClient } from "@/lib/supabase/client";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";

function LoginContent() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [view, setView] = useState<"sign_in" | "sign_up" | "forgotten_password">("sign_in");
  const [signupError, setSignupError] = useState<string | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        router.push("/");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, router]);

  // Check for error params (e.g. from auth callback)
  useEffect(() => {
    const error = searchParams.get("error");
    if (error === "duplicate") {
      setSignupError("An account with this email already exists.");
      setView("sign_in");
    }
  }, [searchParams]);

  // Get the redirect URL from environment variables or default to localhost
  const getURL = () => {
    let url =
      process.env.NEXT_PUBLIC_SITE_URL ?? // Set this to your site URL in production
      process.env.NEXT_PUBLIC_VERCEL_URL ?? // Automatically set by Vercel.
      'http://localhost:3000/';
    // Make sure to include `https://` when not localhost.
    url = url.includes('http') ? url : `https://${url}`;
    // Make sure to include a trailing `/`.
    url = url.charAt(url.length - 1) === '/' ? url : `${url}/`;
    return `${url}auth/callback`;
  };

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-10rem)] px-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-2xl shadow-md border border-slate-200/60">
        <div>
          <h1 className="text-3xl font-extrabold text-center text-foreground">
            {view === "sign_up" ? "Create Account" : view === "forgotten_password" ? "Reset Password" : "Welcome Back"}
          </h1>
          <p className="mt-2 text-sm text-center text-muted-foreground">
            {view === "sign_up"
              ? "Join to access collections, favorites, and saved searches."
              : view === "forgotten_password"
                ? "Enter your email and we'll send you a reset link."
                : "Access your collections, favorites, and saved searches."}
          </p>
        </div>

        {/* Duplicate signup warning */}
        {signupError && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm">
            <p className="text-amber-800 font-medium">{signupError}</p>
            <p className="text-amber-700 mt-1">
              Try{" "}
              <button
                onClick={() => { setView("sign_in"); setSignupError(null); }}
                className="text-blue-600 hover:underline font-medium"
              >
                signing in
              </button>
              {" "}instead, or{" "}
              <button
                onClick={() => { setView("forgotten_password"); setSignupError(null); }}
                className="text-blue-600 hover:underline font-medium"
              >
                reset your password
              </button>
              .
            </p>
          </div>
        )}

        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          providers={['google']}
          redirectTo={getURL()}
          socialLayout="horizontal"
          onlyThirdPartyProviders={false}
          magicLink
          view={view}
        />

        {/* View toggle links */}
        <div className="text-center text-sm text-slate-500 space-y-1">
          {view === "sign_in" && (
            <p>
              Don&apos;t have an account?{" "}
              <button
                onClick={() => { setView("sign_up"); setSignupError(null); }}
                className="text-blue-600 hover:underline font-medium"
              >
                Sign up
              </button>
            </p>
          )}
          {view === "sign_up" && (
            <p>
              Already have an account?{" "}
              <button
                onClick={() => { setView("sign_in"); setSignupError(null); }}
                className="text-blue-600 hover:underline font-medium"
              >
                Sign in
              </button>
            </p>
          )}
          {view === "forgotten_password" && (
            <p>
              Remember your password?{" "}
              <button
                onClick={() => { setView("sign_in"); setSignupError(null); }}
                className="text-blue-600 hover:underline font-medium"
              >
                Sign in
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)] px-4">
        <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-2xl shadow-md border border-slate-200/60">
          <h1 className="text-3xl font-extrabold text-center text-foreground">Welcome Back</h1>
          <p className="mt-2 text-sm text-center text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
