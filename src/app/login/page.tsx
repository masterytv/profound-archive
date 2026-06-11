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

  // Read returnTo from query params so we redirect back after login
  const returnTo = searchParams.get("returnTo") || "/";

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string) => {
      if (event === "SIGNED_IN") {
        router.push(returnTo);
        router.refresh();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, router, returnTo]);

  // Check for error params (e.g. from auth callback)
  useEffect(() => {
    const error = searchParams.get("error");
    if (error === "duplicate") {
      setSignupError("An account with this email already exists.");
      setView("sign_in");
    }
  }, [searchParams]);

  // Build the auth callback URL from the CURRENT origin so the login flow stays
  // on the domain the user started from (staging stays on staging, prod on prod,
  // localhost on localhost). The PKCE code_verifier cookie is domain-bound, so
  // the callback must land on this host — a hardcoded canonical URL breaks login
  // on staging/preview domains (the code exchange fails: "login link expired").
  const getURL = () => {
    let url =
      (typeof window !== 'undefined' && window.location.origin) ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      'http://localhost:3000';
    url = url.includes('http') ? url : `https://${url}`;
    url = url.endsWith('/') ? url : `${url}/`;
    return `${url}auth/callback?next=${encodeURIComponent(returnTo)}`;
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
