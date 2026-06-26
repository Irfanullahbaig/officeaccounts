import { PrismaClient } from "@prisma/client";
import { getPrismaDatasourceUrl } from "@/lib/db/config";
import { normalizeDatabaseEnv } from "@/lib/db/env";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  normalizeDatabaseEnv();

  const datasourceUrl = getPrismaDatasourceUrl();

  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    ...(datasourceUrl ? { datasourceUrl } : {}),
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

globalForPrisma.prisma = prisma;
