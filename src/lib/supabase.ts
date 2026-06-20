import { createClient } from "@supabase/supabase-js";

// Fall back to harmless placeholders when env vars are absent so the app can
// still boot (and demo mode can run fully client-side) without a configured DB.
const supabaseUrl =
  (import.meta.env.VITE_SUPABASE_URL as string) || "https://demo.invalid.supabase.co";
const supabaseAnonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || "demo-anon-key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
