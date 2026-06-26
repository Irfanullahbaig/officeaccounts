import { existsSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/** Prisma Client resolves SQLite paths from the schema directory; env often uses project-root paths. */
function resolveSqliteDatabaseUrl(url: string): string {
  if (!url.startsWith("file:")) return url;

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

function createPrismaClient(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL;
  const datasourceUrl = databaseUrl
    ? resolveSqliteDatabaseUrl(databaseUrl)
    : undefined;

  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    ...(datasourceUrl ? { datasourceUrl } : {}),
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

globalForPrisma.prisma = prisma;
