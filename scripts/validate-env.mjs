import { loadEnvFiles } from "./load-env.mjs";

/** Placeholder used only for `prisma generate` when DATABASE_URL is not set at build time. */
export const PRISMA_GENERATE_PLACEHOLDER_URL =
  "postgresql://build:build@127.0.0.1:5432/build?schema=public";

const isBuild = process.argv.includes("--build");
const isVercel = Boolean(process.env.VERCEL);

loadEnvFiles();

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    process.env.SUPABASE_DB_URL ??
    process.env.POSTGRES_PRISMA_URL ??
    process.env.POSTGRES_URL ??
    process.env.DATABASE_URL_UNPOOLED ??
    "";
}

function hasSupabaseAuthEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.SUPABASE_PUBLISHABLE_KEY;
  return Boolean(url && key);
}

function hasSupabaseServiceRole() {
  return Boolean(
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY
  );
}

export function isPostgresUrl(url) {
  return url.startsWith("postgres://") || url.startsWith("postgresql://");
}

export function ensureDatabaseUrlForGenerate() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  process.env.DATABASE_URL = PRISMA_GENERATE_PLACEHOLDER_URL;
  console.warn(
    "\n⚠️  DATABASE_URL is not set. Using a placeholder for prisma generate only.\n"
  );
  return process.env.DATABASE_URL;
}

if (isBuild) {
  const databaseUrl = process.env.DATABASE_URL;

  if (hasSupabaseAuthEnv()) {
    console.log("✓ Supabase Auth env detected");
    if (!hasSupabaseServiceRole()) {
      console.warn("⚠️  SUPABASE_SERVICE_ROLE_KEY missing — user sync & /api/setup will fail");
    }
  }

  if (!databaseUrl) {
    console.log("✓ Static auth mode — DATABASE_URL not required");
  } else if (isVercel && isPostgresUrl(databaseUrl)) {
    console.log("✓ Supabase/Postgres DATABASE_URL validated for Vercel build");
  } else if (isPostgresUrl(databaseUrl)) {
    console.log("✓ Postgres DATABASE_URL detected");
  }
}
