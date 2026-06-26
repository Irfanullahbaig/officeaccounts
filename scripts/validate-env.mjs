import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/** Placeholder used only for `prisma generate` when DATABASE_URL is not set at build time. */
export const PRISMA_GENERATE_PLACEHOLDER_URL =
  "postgresql://build:build@127.0.0.1:5432/build?schema=public";

const isBuild = process.argv.includes("--build");
const isVercel = Boolean(process.env.VERCEL);

function loadDotEnv() {
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return;

  const content = readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadDotEnv();

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    process.env.SUPABASE_DB_URL ??
    process.env.POSTGRES_PRISMA_URL ??
    process.env.POSTGRES_URL ??
    process.env.DATABASE_URL_UNPOOLED ??
    "";
}

export function isPostgresUrl(url) {
  return url.startsWith("postgres://") || url.startsWith("postgresql://");
}

export function ensureDatabaseUrlForGenerate() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  process.env.DATABASE_URL = PRISMA_GENERATE_PLACEHOLDER_URL;
  console.warn(
    "\n⚠️  DATABASE_URL is not set. Using a placeholder for prisma generate only."
  );
  console.warn(
    "    Set DATABASE_URL to your Supabase connection string in Vercel → Environment Variables.\n"
  );
  return process.env.DATABASE_URL;
}

const SUPABASE_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
];

function getSupabaseSecretKey() {
  return process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
}

function getSupabasePublicKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

if (isBuild) {
  const databaseUrl = process.env.DATABASE_URL;
  const missingSupabase = SUPABASE_VARS.filter((key) => !process.env[key]);
  if (!getSupabasePublicKey()) {
    missingSupabase.push("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  }
  if (!getSupabaseSecretKey()) {
    missingSupabase.push("SUPABASE_SECRET_KEY");
  }

  if (missingSupabase.length > 0 && isVercel) {
    console.warn(
      `\n⚠️  Vercel build: missing Supabase auth variables: ${missingSupabase.join(", ")}`
    );
    console.warn("    Login requires Supabase Auth keys at runtime.\n");
  }

  if (!databaseUrl) {
    if (isVercel) {
      console.warn("\n⚠️  Vercel build: DATABASE_URL is not configured yet.");
      console.warn(
        "    Add your Supabase database URL from Project Settings → Database.\n"
      );
    } else {
      console.warn(
        "\n⚠️  Local build: DATABASE_URL is not set. Copy .env.example to .env.\n"
      );
    }
  } else if (!isPostgresUrl(databaseUrl)) {
    const message =
      "DATABASE_URL must be a Supabase PostgreSQL connection string (postgres:// or postgresql://).";

    if (isVercel) {
      console.error(`\n❌ ${message}`);
      console.error(
        "    Update DATABASE_URL in Vercel → Settings → Environment Variables.\n"
      );
      process.exit(1);
    }

    console.warn(`\n⚠️  ${message}`);
    console.warn("    SQLite/file URLs are not supported on Vercel.\n");
  } else if (isVercel) {
    console.log("✓ DATABASE_URL validated for Vercel build");
  }
}
