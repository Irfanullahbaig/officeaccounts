import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ensureDatabaseUrlForGenerate } from "./validate-env.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const schemaPath = resolve(__dirname, "../prisma/schema.prisma");

function syncSchemaProvider() {
  const databaseUrl = process.env.DATABASE_URL ?? "";
  const provider = databaseUrl.startsWith("postgres") ? "postgresql" : "sqlite";
  const schema = readFileSync(schemaPath, "utf8");
  const updated = schema.replace(
    /(datasource db \{[^]*?provider = )"(postgresql|sqlite)"/,
    `$1"${provider}"`
  );

  if (updated !== schema) {
    writeFileSync(schemaPath, updated);
    console.log(`Prisma provider set to ${provider} for local environment`);
  }
}

ensureDatabaseUrlForGenerate();
syncSchemaProvider();

execSync("npx prisma generate", { stdio: "inherit" });
