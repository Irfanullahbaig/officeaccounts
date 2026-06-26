import { defineConfig } from "prisma/config";
import { loadEnvFiles } from "./scripts/load-env.mjs";
import {
  normalizeDatabaseEnv,
  normalizeDirectDatabaseEnv,
} from "./scripts/validate-env.mjs";

// Prisma CLI skips default .env loading when prisma.config.ts exists.
loadEnvFiles();
normalizeDatabaseEnv();
normalizeDirectDatabaseEnv();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
});
