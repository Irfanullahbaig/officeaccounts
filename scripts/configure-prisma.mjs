import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const schemaPath = join(__dirname, "../prisma/schema.prisma");
const databaseUrl = process.env.DATABASE_URL ?? "";
const provider = databaseUrl.startsWith("postgres") ? "postgresql" : "sqlite";

const schema = readFileSync(schemaPath, "utf8");
const updated = schema.replace(
  /provider\s*=\s*"(postgresql|sqlite)"/,
  `provider = "${provider}"`
);

if (updated === schema) {
  console.warn("Could not update Prisma provider in schema.prisma");
} else {
  writeFileSync(schemaPath, updated);
  console.log(`Prisma datasource provider set to ${provider}`);
}
