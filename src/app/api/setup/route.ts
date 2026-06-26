import { NextResponse } from "next/server";
import { execSync } from "node:child_process";
import { ensureDefaultAdmin } from "@/lib/auth/bootstrap-admin";
import { getSetupSecret } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");

  try {
    const expectedSecret = getSetupSecret();

    if (!expectedSecret || !secret || secret !== expectedSecret) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: "DATABASE_URL is not configured" },
        { status: 500 }
      );
    }

    execSync("npx prisma db push --skip-generate", { stdio: "inherit" });
    await ensureDefaultAdmin();

    return NextResponse.json({
      ok: true,
      message: "Database initialized and default admin created",
      adminEmail: "admin@northnine.pk",
    });
  } catch (error) {
    console.error("Setup failed:", error);
    return NextResponse.json(
      {
        error: "Setup failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
