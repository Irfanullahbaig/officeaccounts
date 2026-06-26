export function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set.");
  }
  return url;
}

/** Supports Supabase publishable key (new) or anon key (legacy). */
export function getSupabaseAnonKey(): string {
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY is required."
    );
  }

  return key;
}

/** Server-only secret key (new `sb_secret_` format or legacy service_role JWT). */
export function getSupabaseSecretKey(): string {
  const key =
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!key) {
    throw new Error(
      "SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY is required on the server."
    );
  }

  return key;
}

/** Auth API base, e.g. https://xxx.supabase.co/auth/v1 */
export function getSupabaseAuthUrl(): string {
  return (
    process.env.SUPABASE_AUTH_URL ??
    `${getSupabaseUrl().replace(/\/$/, "")}/auth/v1`
  );
}

/** OAuth authorize endpoint (provider query params added by Supabase client). */
export function getSupabaseOAuthAuthorizeUrl(): string {
  return `${getSupabaseAuthUrl()}/oauth/authorize`;
}
