import { createAdminClient as createServerAdminClient } from "@supabase/server/core";
import { resolveSupabaseEnv } from "@/lib/supabase/env-bridge";

export function createAdminClient() {
  const env = resolveSupabaseEnv();
  return createServerAdminClient({ env });
}
