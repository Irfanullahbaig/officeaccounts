import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  completeDirectorLoginAfterAuth,
  completeLoginAfterAuth,
} from "@/lib/auth/login";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const portal = searchParams.get("portal") ?? "staff";
  const isDirector = portal === "director";
  const loginPath = isDirector ? "/director/login" : "/login";

  if (!code) {
    return NextResponse.redirect(`${origin}${loginPath}?error=auth_callback_failed`);
  }

  const supabase = await createClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    return NextResponse.redirect(`${origin}${loginPath}?error=auth_callback_failed`);
  }

  const result = isDirector
    ? await completeDirectorLoginAfterAuth()
    : await completeLoginAfterAuth();

  if (!result.ok) {
    await supabase.auth.signOut();
    const params = new URLSearchParams({ error: "access_denied" });
    return NextResponse.redirect(`${origin}${loginPath}?${params.toString()}`);
  }

  const destination = isDirector
    ? "/director/dashboard"
    : result.role === "employee"
      ? "/my"
      : "/dashboard";

  return NextResponse.redirect(`${origin}${destination}`);
}
