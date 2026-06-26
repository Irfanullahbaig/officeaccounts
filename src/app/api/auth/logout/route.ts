import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth/cookies";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseAuthConfigured } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

export async function POST() {
  if (isSupabaseAuthConfigured()) {
    try {
      const supabase = await createSupabaseClient();
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Supabase sign-out failed:", error);
    }
  }

  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
