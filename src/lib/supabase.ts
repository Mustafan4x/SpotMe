import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder-key";

const isMissingEnv =
  supabaseUrl === "https://placeholder.supabase.co" || supabaseAnonKey === "placeholder-key";

if (isMissingEnv && typeof window !== "undefined") {
  console.warn(
    "Missing Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY). " +
      "The Supabase client will not work until these are set in .env.local."
  );
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);
