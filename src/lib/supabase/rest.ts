import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

/** PostgREST base URL, e.g. https://xxx.supabase.co/rest/v1 */
export function getSupabaseRestUrl(): string {
  return (
    process.env.SUPABASE_REST_URL ??
    `${getSupabaseUrl().replace(/\/$/, "")}/rest/v1`
  );
}

export function getSupabaseRestHeaders(server = false) {
  const key = server
    ? (process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "")
    : getSupabaseAnonKey();

  const headers: Record<string, string> = {
    apikey: key,
    "Content-Type": "application/json",
  };

  // Legacy JWT keys use Bearer; new sb_* keys must not (Supabase returns "Unregistered API key").
  if (key.startsWith("eyJ")) {
    headers.Authorization = `Bearer ${key}`;
  }

  return headers;
}

/** Default public table exposed in Supabase (optional REST access). */
export const SUPABASE_DEFAULT_TABLE = "n9accounts";
