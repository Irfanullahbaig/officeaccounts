const REQUIRED_SERVER_VARS = ["AUTH_SECRET"] as const;

function resolveDatabaseUrl(): string | undefined {
  return (
    process.env.DATABASE_URL ??
    process.env.POSTGRES_PRISMA_URL ??
    process.env.POSTGRES_URL ??
    process.env.DATABASE_URL_UNPOOLED
  );
}

export function getDatabaseUrl(): string {
  const url = resolveDatabaseUrl();
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Add it in Vercel → Settings → Environment Variables, or connect Vercel Postgres."
    );
  }
  return url;
}

export function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error(
      "AUTH_SECRET is not set. Generate one with: openssl rand -base64 32"
    );
  }
  return secret;
}

export function validateServerEnv() {
  const missing = REQUIRED_SERVER_VARS.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  const databaseUrl = resolveDatabaseUrl();
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL (or POSTGRES_URL / POSTGRES_PRISMA_URL) is required for production."
    );
  }

  if (
    !databaseUrl.startsWith("postgres://") &&
    !databaseUrl.startsWith("postgresql://")
  ) {
    throw new Error(
      "DATABASE_URL must be a PostgreSQL connection string for production deployments."
    );
  }
}
