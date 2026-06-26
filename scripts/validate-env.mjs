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

  if (!databaseUrl) {
    if (isVercel) {
      console.warn("\n⚠️  Vercel build: DATABASE_URL is not configured yet.\n");
    } else {
      console.warn(
        "\n⚠️  Local build: DATABASE_URL is not set. Copy .env.example to .env.local.\n"
      );
    }
  } else if (!isPostgresUrl(databaseUrl) && isVercel) {
    const message =
      "DATABASE_URL must be a PostgreSQL connection string on Vercel.";

    console.error(`\n❌ ${message}`);
    console.error(
      "    Update DATABASE_URL in Vercel → Settings → Environment Variables.\n"
    );
    process.exit(1);
  } else if (isVercel && isPostgresUrl(databaseUrl)) {
    console.log("✓ DATABASE_URL validated for Vercel build");
  }
}
