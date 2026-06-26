import { type NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/middleware";

export async function updateSession(request: NextRequest) {
  const { supabase, supabaseResponse } = createClient(request);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabaseResponse, user };
}
