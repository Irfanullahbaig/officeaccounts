import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function parseEnvFile(envPath) {
  if (!existsSync(envPath)) return;

  const content = readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

/** Load `.env` then `.env.local` (same order as Next.js). */
export function loadEnvFiles() {
  parseEnvFile(resolve(process.cwd(), ".env"));
  parseEnvFile(resolve(process.cwd(), ".env.local"));
}
