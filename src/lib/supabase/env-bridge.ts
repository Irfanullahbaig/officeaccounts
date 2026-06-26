import type { SupabaseEnv } from "@supabase/server";

/** Maps Next.js / legacy env names to @supabase/server `SupabaseEnv` fields. */
export function resolveSupabaseEnv(overrides?: Partial<SupabaseEnv>): Partial<SupabaseEnv> {
  const url =
    overrides?.url ??
    process.env.SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const publishableKey =
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const secretKey =
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  const jwksUrl = process.env.SUPABASE_JWKS_URL;
  const jwks = process.env.SUPABASE_JWKS
    ? (JSON.parse(process.env.SUPABASE_JWKS) as SupabaseEnv["jwks"])
    : jwksUrl
      ? new URL(jwksUrl)
      : null;

  return {
    ...overrides,
    url: url ?? undefined,
    publishableKeys: overrides?.publishableKeys ?? (publishableKey ? { default: publishableKey } : {}),
    secretKeys: overrides?.secretKeys ?? (secretKey ? { default: secretKey } : {}),
    jwks: overrides?.jwks ?? jwks,
  };
}
