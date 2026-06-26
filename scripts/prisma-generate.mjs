import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ensureDatabaseUrlForGenerate,
  normalizeDatabaseEnv,
} from "./validate-env.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const schemaPath = resolve(__dirname, "../prisma/schema.prisma");
const prismaBin = resolve(__dirname, "../node_modules/.bin/prisma");

function runGenerate() {
  execSync(`"${prismaBin}" generate`, { stdio: "inherit" });
}

function syncSchemaProvider() {
  normalizeDatabaseEnv();

  const databaseUrl = process.env.DATABASE_URL ?? "";
  const provider = databaseUrl.startsWith("postgres") ? "postgresql" : "sqlite";
  let schema = readFileSync(schemaPath, "utf8");

  schema = schema.replace(
    /(datasource db \{[^]*?provider = )"(postgresql|sqlite)"/,
    `$1"${provider}"`
  );

  if (provider === "postgresql") {
    if (!schema.includes("directUrl")) {
      schema = schema.replace(
        /(datasource db \{[^]*?url\s+= env\("DATABASE_URL"\)\n)/,
        `$1  directUrl = env("DATABASE_URL_UNPOOLED")\n`
      );
    }
  } else {
    schema = schema.replace(/\n\s*directUrl = env\("DATABASE_URL_UNPOOLED"\)/, "");
  }

  const previous = readFileSync(schemaPath, "utf8");
  if (schema !== previous) {
    writeFileSync(schemaPath, schema);
    console.log(`Prisma provider set to ${provider}`);
  }
}

ensureDatabaseUrlForGenerate();

// Vercel: schema is committed as postgresql — skip local provider toggling.
if (process.env.VERCEL === "1") {
  runGenerate();
} else {
  syncSchemaProvider();
  runGenerate();
}
