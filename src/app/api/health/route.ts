import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getDatabaseConnectionInfo,
  isDatabaseConfigured,
} from "@/lib/db/env";

export const dynamic = "force-dynamic";

export async function GET() {
  const databaseConfigured = isDatabaseConfigured();
  const connection = getDatabaseConnectionInfo();

  let databaseReachable = false;
  let databaseError: string | undefined;

  if (databaseConfigured) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      databaseReachable = true;
    } catch (error) {
      databaseError =
        error instanceof Error ? error.message.split("\n")[0] : "Database query failed";
    }
  }

  return NextResponse.json({
    ok: databaseConfigured ? databaseReachable : true,
    auth: databaseConfigured ? "database" : "static",
    databaseConfigured,
    databaseReachable,
    database: connection
      ? {
          host: connection.host,
          port: connection.port,
          user: connection.user,
          database: connection.database,
          pooled: connection.pooled,
        }
      : null,
    databaseError,
    sessionSecret: Boolean(process.env.SESSION_SECRET ?? process.env.AUTH_SECRET),
    vercel: Boolean(process.env.VERCEL),
  });
}
