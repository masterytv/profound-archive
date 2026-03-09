import { createBrowserClient } from '@supabase/ssr'

// Store client on globalThis so it survives Turbopack HMR module resets.
// Without this, each hot-reload clears the module-level variable, causing
// GoTrueClient to re-acquire navigator.lock and throw AbortErrors in Strict Mode.
declare global {
  // eslint-disable-next-line no-var
  var __supabaseBrowserClient: ReturnType<typeof createBrowserClient> | undefined;
}

export function createClient() {
  if (globalThis.__supabaseBrowserClient) return globalThis.__supabaseBrowserClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn("Supabase environment variables are missing. Auth features will be disabled.");
    return createBrowserClient(
      "https://placeholder-supabase-url.com",
      "placeholder-key"
    );
  }

  globalThis.__supabaseBrowserClient = createBrowserClient(supabaseUrl, supabaseKey);
  return globalThis.__supabaseBrowserClient;
}
