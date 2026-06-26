import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  verifyCredentials,
  createContextClient,
  createAdminClient,
} from "@supabase/server/core";
import type { AuthModeWithKey, SupabaseContext } from "@supabase/server";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";
import { resolveSupabaseEnv } from "@/lib/supabase/env-bridge";

let cachedJwks: Awaited<ReturnType<typeof fetchJwks>> = undefined;

async function fetchJwks(supabaseUrl: string) {
  try {
    const res = await fetch(`${supabaseUrl.replace(/\/$/, "")}/auth/v1/.well-known/jwks.json`, {
      cache: "force-cache",
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function getJwks(supabaseUrl: string) {
  const bridged = resolveSupabaseEnv();
  if (bridged.jwks) return bridged.jwks;
  if (!cachedJwks) {
    cachedJwks = await fetchJwks(supabaseUrl);
  }
  return cachedJwks;
}

/**
 * Composes @supabase/ssr cookie sessions with @supabase/server JWT verification
 * and RLS-scoped clients. Use in Server Components and Route Handlers.
 */
export async function createSupabaseContext(
  options: { auth?: AuthModeWithKey | AuthModeWithKey[] } = { auth: "user" }
): Promise<
  { data: SupabaseContext; error: null } | { data: null; error: Error }
> {
  const supabaseUrl = getSupabaseUrl();
  const publishableKey = getSupabaseAnonKey();
  const nextEnv = resolveSupabaseEnv({
    url: supabaseUrl,
    publishableKeys: { default: publishableKey },
  });

  const cookieStore = await cookies();
  const ssrClient = createServerClient(supabaseUrl, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Server Components cannot write cookies — middleware handles refresh.
        }
      },
    },
  });

  const {
    data: { session },
  } = await ssrClient.auth.getSession();
  const token = session?.access_token ?? null;

  const jwks = await getJwks(supabaseUrl);
  const env = { ...nextEnv, jwks };

  const { data: auth, error } = await verifyCredentials(
    { token, apikey: null },
    { auth: options.auth ?? "user", env }
  );

  if (error) {
    return { data: null, error };
  }

  const supabase = createContextClient({
    auth: { token: auth!.token },
    env,
  });
  const supabaseAdmin = createAdminClient({ env });

  return {
    data: {
      supabase,
      supabaseAdmin,
      userClaims: auth!.userClaims,
      jwtClaims: auth!.jwtClaims,
      authMode: auth!.authMode,
    },
    error: null,
  };
}
