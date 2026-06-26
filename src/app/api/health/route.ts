import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Basic health check — no external services required. */
export async function GET() {
  const checks = {
    databaseUrl: Boolean(process.env.DATABASE_URL),
    sessionSecret: Boolean(
      process.env.SESSION_SECRET ?? process.env.AUTH_SECRET
    ),
  };

  return NextResponse.json({
    ok: Object.values(checks).every(Boolean),
    checks,
    auth: "prisma-cookie",
  });
}
