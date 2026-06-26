import { NextResponse } from "next/server";
import {
  getSupabaseUrl,
  getSupabaseAnonKey,
  getSupabaseSecretKey,
} from "@/lib/supabase/env";
import {
  checkSupabaseApiKey,
  formatUnregisteredKeyHelp,
} from "@/lib/supabase/validate-keys";

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

/** Reports whether required server env vars are present and API keys work. */
export async function GET() {
  const checks = {
    supabaseUrl: Boolean(process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabasePublishableKey: Boolean(
      process.env.SUPABASE_PUBLISHABLE_KEY ??
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ),
    supabaseSecretKey: Boolean(
      process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY
    ),
    databaseUrl: Boolean(resolveDatabaseUrl()),
    jwksUrl: Boolean(process.env.SUPABASE_JWKS_URL),
  };

  let publishableKeyValid = false;
  let secretKeyValid = false;
  let keyError: string | undefined;

  try {
    const url = getSupabaseUrl();
    const publishable = getSupabaseAnonKey();
    const publishableCheck = await checkSupabaseApiKey(publishable, url);
    publishableKeyValid = publishableCheck.ok;

    if (!publishableCheck.ok) {
      keyError =
        publishableCheck.message === "Unregistered API key"
          ? formatUnregisteredKeyHelp()
          : publishableCheck.message ?? "Publishable key rejected by Supabase";
    }

    const secret = getSupabaseSecretKey();
    const secretCheck = await checkSupabaseApiKey(secret, url);
    secretKeyValid = secretCheck.ok;
  } catch (error) {
    keyError = error instanceof Error ? error.message : "Supabase key check failed";
  }

  let supabaseReachable = false;
  if (checks.supabaseUrl) {
    try {
      const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
      const res = await fetch(
        process.env.SUPABASE_JWKS_URL ??
          `${url!.replace(/\/$/, "")}/auth/v1/.well-known/jwks.json`,
        { cache: "no-store" }
      );
      supabaseReachable = res.ok;
    } catch {
      supabaseReachable = false;
    }
  }

  const ok =
    Object.values(checks).every(Boolean) &&
    publishableKeyValid &&
    secretKeyValid &&
    supabaseReachable;

  return NextResponse.json({
    ok,
    checks: {
      ...checks,
      publishableKeyValid,
      secretKeyValid,
      supabaseReachable,
    },
    keyError,
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
