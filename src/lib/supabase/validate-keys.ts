import { getSupabaseUrl } from "@/lib/supabase/env";

export type SupabaseKeyCheck = {
  ok: boolean;
  status: number;
  message?: string;
  hint?: string;
};

/** Verifies a Supabase API key is registered for this project (apikey header only). */
export async function checkSupabaseApiKey(
  apiKey: string,
  supabaseUrl = getSupabaseUrl()
): Promise<SupabaseKeyCheck> {
  const base = supabaseUrl.replace(/\/$/, "");

  try {
    const response = await fetch(`${base}/auth/v1/health`, {
      headers: { apikey: apiKey },
      cache: "no-store",
    });

    if (response.ok) {
      return { ok: true, status: response.status };
    }

    let body: { message?: string; hint?: string } = {};
    try {
      body = await response.json();
    } catch {
      body = {};
    }

    return {
      ok: false,
      status: response.status,
      message: body.message,
      hint: body.hint,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      message: error instanceof Error ? error.message : "Network error",
    };
  }
}

export function formatUnregisteredKeyHelp(): string {
  return (
    "Your Supabase API key is invalid or was revoked. Open Supabase Dashboard → " +
    "Project Settings → API Keys, copy the current publishable key (or legacy anon key) " +
    "into NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY and SUPABASE_PUBLISHABLE_KEY, then redeploy."
  );
}
