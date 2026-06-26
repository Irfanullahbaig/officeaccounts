import { existsSync } from "node:fs";
import path from "node:path";
import { resolveDatabaseUrl } from "@/lib/db/env";

export {
  getSupabaseProjectRef,
  isBuildPlaceholderUrl,
  isDatabaseConfigured,
  isPostgresDatabaseUrl,
  isUsableDatabaseUrl,
  normalizeDatabaseEnv,
  normalizeDirectDatabaseEnv,
  normalizeSupabasePostgresUrl,
  resolveDatabaseUrl,
  useStaticAuth,
} from "@/lib/db/env";

/** Prisma Client resolves SQLite file: paths from the schema directory. */
function resolveSqliteDatabaseUrl(url: string): string {
  const rawPath = url.slice("file:".length);
  if (path.isAbsolute(rawPath)) return url;

  const normalized = rawPath.replace(/^\.\//, "");
  const projectRoot = process.cwd();
  const prismaDir = path.join(projectRoot, "prisma");
  const candidates = [
    path.resolve(projectRoot, normalized),
    path.resolve(prismaDir, normalized),
    path.resolve(prismaDir, path.basename(normalized)),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return `file:${candidate}`;
    }
  }

  return `file:${path.resolve(prismaDir, normalized)}`;
}

/** URL passed to Prisma Client (absolute SQLite paths, pooled Postgres as-is). */
export function getPrismaDatasourceUrl(): string | undefined {
  const url = resolveDatabaseUrl();
  if (!url) return undefined;
  if (url.startsWith("file:")) return resolveSqliteDatabaseUrl(url);
  return url;
}
