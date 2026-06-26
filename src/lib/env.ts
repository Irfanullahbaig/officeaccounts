const REQUIRED_SERVER_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
] as const;

function getSupabaseSecretKey(): string | undefined {
  return process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
}

function getSupabasePublicKey(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

function resolveDatabaseUrl(): string | undefined {
  return (
    process.env.DATABASE_URL ??
    process.env.SUPABASE_DB_URL ??
    process.env.POSTGRES_PRISMA_URL ??
    process.env.POSTGRES_URL ??
    process.env.DATABASE_URL_UNPOOLED
  );
}

export function getDatabaseUrl(): string {
  const url = resolveDatabaseUrl();
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Add your Supabase database connection string in Vercel → Settings → Environment Variables."
    );
  }
  return url;
}

export function getSetupSecret(): string {
  return (
    process.env.SETUP_SECRET ??
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    ""
  );
}

export function validateServerEnv() {
  const missing = REQUIRED_SERVER_VARS.filter((key) => !process.env[key]);

  if (!getSupabasePublicKey()) {
    missing.push("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" as (typeof REQUIRED_SERVER_VARS)[number]);
  }
  if (!getSupabaseSecretKey()) {
    missing.push("SUPABASE_SECRET_KEY" as (typeof REQUIRED_SERVER_VARS)[number]);
  }

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  const databaseUrl = resolveDatabaseUrl();
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL (Supabase connection string) is required for production."
    );
  }

  if (
    !databaseUrl.startsWith("postgres://") &&
    !databaseUrl.startsWith("postgresql://")
  ) {
    throw new Error(
      "DATABASE_URL must be your Supabase PostgreSQL connection string for production deployments."
    );
  }
}
