import { isDatabaseConfigured, resolveDatabaseUrl } from "@/lib/db/config";

export function getDatabaseUrl(): string {
  const url = resolveDatabaseUrl();
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

export { isDatabaseConfigured };
