import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if ((!supabaseUrl || !supabaseAnonKey) && typeof window !== "undefined") {
  // Runtime (browser) warning — this is the one that actually matters.
  // eslint-disable-next-line no-console
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
      "Set them in Vercel Project Settings → Environment Variables."
  );
}

// Single shared browser client. Server components/actions that need
// elevated access should use a separate server client with the service
// role key, never exposed to the client bundle.
//
// Falls back to placeholder values so a missing env var during build
// (e.g. Vercel prerendering before variables are configured) doesn't
// crash the entire `next build`. Auth calls will simply fail at runtime
// until the real env vars are set.
export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-anon-key"
);
