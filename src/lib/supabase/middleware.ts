import { type NextRequest } from "next/server";
import { createMiddlewareClient } from "@/utils/supabase/middleware";

export async function updateSession(request: NextRequest) {
  const { supabase, supabaseResponse } = createMiddlewareClient(request);

  if (!supabase) {
    return { supabaseResponse, user: null, configured: false as const };
  }

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      console.error("Supabase middleware getUser:", error.message);
      return { supabaseResponse, user: null, configured: true as const };
    }

    return { supabaseResponse, user, configured: true as const };
  } catch (error) {
    console.error("Supabase middleware session error:", error);
    return { supabaseResponse, user: null, configured: true as const };
  }
}
