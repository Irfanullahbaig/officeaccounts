export function getDatabaseUrl(): string {
  const url =
    process.env.DATABASE_URL ??
    process.env.SUPABASE_DB_URL ??
    process.env.POSTGRES_PRISMA_URL ??
    process.env.POSTGRES_URL;

  if (!url) {
    throw new Error("DATABASE_URL is not set.");
  }
  return url;
}

export function getSetupSecret(): string {
  return (
    process.env.SETUP_SECRET ??
    process.env.SESSION_SECRET ??
    process.env.AUTH_SECRET ??
    ""
  );
}
