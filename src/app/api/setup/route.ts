import { NextResponse } from "next/server";
import { execSync } from "node:child_process";
import { ensureDefaultAdmin } from "@/lib/auth/bootstrap-admin";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");
  const expectedSecret =
    process.env.SETUP_SECRET ?? process.env.AUTH_SECRET ?? "n9-setup";

  if (!secret || secret !== expectedSecret) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    execSync("node scripts/configure-prisma.mjs", { stdio: "inherit" });
    execSync("npx prisma generate", { stdio: "inherit" });

    const databaseUrl = process.env.DATABASE_URL ?? "";
    if (!databaseUrl) {
      return NextResponse.json(
        { error: "DATABASE_URL is not configured on Vercel" },
        { status: 500 }
      );
    }

    if (databaseUrl.startsWith("postgres")) {
      execSync("npx prisma db push --skip-generate", { stdio: "inherit" });
    } else {
      execSync("npx prisma migrate deploy", { stdio: "inherit" });
    }

    await ensureDefaultAdmin();

    return NextResponse.json({
      ok: true,
      message: "Database initialized and default admin ensured",
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
