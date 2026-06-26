import { execSync } from "node:child_process";
import { loadEnvFiles } from "./load-env.mjs";
import { isUsableDatabaseUrl, normalizeDatabaseEnv } from "./validate-env.mjs";

loadEnvFiles();
normalizeDatabaseEnv();

const databaseUrl = process.env.DATABASE_URL ?? "";
const isPostgres =
  databaseUrl.startsWith("postgres://") || databaseUrl.startsWith("postgresql://");

if (process.env.VERCEL && isUsableDatabaseUrl(databaseUrl) && isPostgres) {
  console.log("\n→ Syncing Prisma schema to Vercel database...\n");
  try {
    execSync("npx prisma db push --skip-generate --accept-data-loss", {
      stdio: "inherit",
    });
    console.log("\n✓ Database schema synced\n");
  } catch (error) {
    console.warn("\n⚠️  prisma db push failed during build. Run /api/setup after deploy.\n");
    console.warn(error instanceof Error ? error.message : error);
  }
}
