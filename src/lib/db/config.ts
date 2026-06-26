const BUILD_PLACEHOLDER = "postgresql://build:build@127.0.0.1:5432/build";

export function resolveDatabaseUrl(): string | undefined {
  const url =
    process.env.DATABASE_URL ??
    process.env.SUPABASE_DB_URL ??
    process.env.POSTGRES_PRISMA_URL ??
    process.env.POSTGRES_URL ??
    process.env.DATABASE_URL_UNPOOLED;

  if (!url || url.includes(BUILD_PLACEHOLDER)) {
    return undefined;
  }

  return url;
}

/** True when a real database URL is configured (local SQLite or hosted Postgres). */
export function isDatabaseConfigured(): boolean {
  return Boolean(resolveDatabaseUrl());
}

/** Vercel/static deploys without DATABASE_URL use env-based login only. */
export function useStaticAuth(): boolean {
  return !isDatabaseConfigured();
}
