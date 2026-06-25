const REQUIRED_SERVER_VARS = ["DATABASE_URL", "AUTH_SECRET"] as const;

export function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Add it to .env locally or Vercel Environment Variables."
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

  const databaseUrl = process.env.DATABASE_URL!;
  if (
    !databaseUrl.startsWith("postgres://") &&
    !databaseUrl.startsWith("postgresql://")
  ) {
    throw new Error(
      "DATABASE_URL must be a PostgreSQL connection string for production deployments."
    );
  }
}
