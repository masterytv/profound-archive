import { createBrowserClient } from '@supabase/ssr'

let client: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (client) return client;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn("Supabase environment variables are missing. Auth features will be disabled.");
    return createBrowserClient(
      "https://placeholder-supabase-url.com",
      "placeholder-key"
    );
  }

  client = createBrowserClient(supabaseUrl, supabaseKey);
  return client;
}
