import { createClient, SupabaseClient } from "@supabase/supabase-js";

let serviceClient: SupabaseClient | null = null;

function resolveSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  if (!url) {
    throw new Error("Supabase URL is not configured. Provide NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL in your environment.");
  }
  return url;
}

function resolveSupabaseServiceKey(): string {
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SERVICE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) {
    throw new Error(
      "Supabase service key is not configured. Provide SUPABASE_SERVICE_ROLE_KEY, SUPABASE_SERVICE_KEY, or NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment.",
    );
  }
  return key;
}

export function getServiceSupabase(): SupabaseClient {
  if (!serviceClient) {
    serviceClient = createClient(resolveSupabaseUrl(), resolveSupabaseServiceKey(), {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return serviceClient;
}
