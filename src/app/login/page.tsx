"use client";

import { createClient } from "@/lib/supabase/client";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();

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
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
        <div>
          <h1 className="text-3xl font-extrabold text-center text-foreground">
            Sign In / Sign Up
          </h1>
          <p className="mt-2 text-sm text-center text-muted-foreground">
            Access your collections, favorites, and saved searches.
          </p>
        </div>
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          providers={['google']}
          redirectTo={getURL()}
          socialLayout="horizontal"
          onlyThirdPartyProviders={false}
          magicLink
        />
      </div>
    </div>
  );
}
