import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn("Supabase environment variables are missing. Auth features will be disabled.");
    // Return a dummy client or a partial implementation to prevent crashes
    // Using a valid URL format but dummy data to pass validation if possible, 
    // but createBrowserClient might validate connectivity.
    // Safer approach: Return null or throw specific error that components can catch?
    // Most components expect a valid client.
    // Let's try to return a minimal mock or fallback to prevent the "Required" error.
    
    // Actually, the error comes from the library validation. 
    // We can return a dummy if we really want to avoid crash, but auth won't work.
    return createBrowserClient(
        "https://placeholder-supabase-url.com",
        "placeholder-key"
    );
  }

  return createBrowserClient(supabaseUrl, supabaseKey)
}
