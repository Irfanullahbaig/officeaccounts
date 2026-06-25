import { execSync } from "node:child_process";

const databaseUrl = process.env.DATABASE_URL ?? "";

if (!databaseUrl) {
  console.warn("DATABASE_URL is not set. Skipping database preparation.");
  process.exit(0);
}

const isPostgres = databaseUrl.startsWith("postgres");

try {
  if (isPostgres) {
    console.log("Preparing PostgreSQL database with prisma db push...");
    execSync("npx prisma db push --skip-generate", { stdio: "inherit" });
  } else {
    console.log("Preparing SQLite database with prisma migrate deploy...");
    execSync("npx prisma migrate deploy", { stdio: "inherit" });
  }
} catch (error) {
  console.error("Database preparation failed:", error);
  process.exit(1);
}
