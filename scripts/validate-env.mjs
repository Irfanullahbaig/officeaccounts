import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

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

const missing = [];

if (!process.env.DATABASE_URL) {
  missing.push("DATABASE_URL");
}

if (missing.length > 0) {
  console.error("\n❌ Missing required environment variables:\n");
  for (const key of missing) {
    console.error(`  • ${key}`);
  }

  if (missing.includes("DATABASE_URL")) {
    console.error("\nHow to fix:");
    console.error("  Local:  copy .env.example to .env and set DATABASE_URL");
    console.error(
      "  Vercel: Project → Settings → Environment Variables → add DATABASE_URL"
    );
    console.error(
      "          Use a PostgreSQL URL (Vercel Postgres, Neon, or Supabase)\n"
    );
  }

  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl.startsWith("postgres://") && !databaseUrl.startsWith("postgresql://")) {
  const message =
    "DATABASE_URL must be a PostgreSQL connection string (postgres:// or postgresql://).";

  if (isVercel) {
    console.error(`\n❌ ${message}\n`);
    process.exit(1);
  }

  if (isBuild) {
    console.warn(`\n⚠️  ${message}`);
    console.warn("    SQLite/file URLs are not supported on Vercel.\n");
  }
}

if (isBuild && isVercel) {
  console.log("✓ Environment validation passed for Vercel build");
}
