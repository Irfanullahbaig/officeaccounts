import { NextResponse } from "next/server";
import { performDirectorLogin, performStaffLogin } from "@/lib/auth/credentials";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { email?: string; password?: string; portal?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const email = body.email?.trim();
  const password = body.password ?? "";

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const portal = body.portal === "director" ? "director" : "staff";
  const result =
    portal === "director"
      ? await performDirectorLogin(email, password)
      : await performStaffLogin(email, password);

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status ?? 401 }
    );
  }

  return NextResponse.json({ ok: true, role: result.role });
}
