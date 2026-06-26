import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db/config";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    auth: isDatabaseConfigured() ? "database" : "static",
    databaseConfigured: isDatabaseConfigured(),
    sessionSecret: Boolean(process.env.SESSION_SECRET ?? process.env.AUTH_SECRET),
  });
}
