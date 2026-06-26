import { NextResponse } from "next/server";
import { getSupabaseUrl, getSupabaseAnonKey, getSupabaseSecretKey } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

function resolveDatabaseUrl(): string | undefined {
  return (
    process.env.DATABASE_URL ??
    process.env.SUPABASE_DB_URL ??
    process.env.POSTGRES_PRISMA_URL ??
    process.env.POSTGRES_URL ??
    process.env.DATABASE_URL_UNPOOLED
  );
}

/** Reports whether required server env vars are present (no secret values). */
export async function GET() {
  const checks = {
    supabaseUrl: Boolean(process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabasePublishableKey: Boolean(
      process.env.SUPABASE_PUBLISHABLE_KEY ??
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    ),
    supabaseSecretKey: Boolean(
      process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY
    ),
    databaseUrl: Boolean(resolveDatabaseUrl()),
    jwksUrl: Boolean(process.env.SUPABASE_JWKS_URL),
  };

  const ok = Object.values(checks).every(Boolean);

  let supabaseReachable = false;
  if (checks.supabaseUrl) {
    try {
      const res = await fetch(getSupabaseJwksUrl(), { cache: "no-store" });
      supabaseReachable = res.ok;
    } catch {
      supabaseReachable = false;
    }
  }

  return NextResponse.json({
    ok: ok && supabaseReachable,
    checks: { ...checks, supabaseReachable },
    resolved: {
      supabaseUrl: getSupabaseUrlSafe(),
      hasPublishableKey: Boolean(getSupabaseAnonKeySafe()),
      hasSecretKey: Boolean(getSupabaseSecretKeySafe()),
      databaseIsPostgres: resolveDatabaseUrl()?.startsWith("postgres") ?? false,
    },
  });
}

function getSupabaseUrlSafe() {
  try {
    return getSupabaseUrl();
  } catch {
    return null;
  }
}

function getSupabaseAnonKeySafe() {
  try {
    return getSupabaseAnonKey();
  } catch {
    return null;
  }
}

function getSupabaseSecretKeySafe() {
  try {
    return getSupabaseSecretKey();
  } catch {
    return null;
  }
}

function getSupabaseJwksUrl() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  return (
    process.env.SUPABASE_JWKS_URL ??
    (url ? `${url.replace(/\/$/, "")}/auth/v1/.well-known/jwks.json` : "")
  );
}
