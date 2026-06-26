import { withSupabase } from "@supabase/server";
import type { AuthModeWithKey, SupabaseContext } from "@supabase/server";
import { resolveSupabaseEnv } from "@/lib/supabase/env-bridge";

type RouteContext = SupabaseContext;

type RouteHandler = (
  request: Request,
  ctx: RouteContext
) => Response | Promise<Response>;

/**
 * Wraps a Next.js Route Handler with @supabase/server auth + clients.
 * For cookie-based staff sessions, prefer `createSupabaseContext` from `./context`.
 */
export function withSupabaseRouteHandler(
  options: { auth?: AuthModeWithKey | AuthModeWithKey[] },
  handler: RouteHandler
) {
  const env = resolveSupabaseEnv();
  return withSupabase(
    { ...options, env },
    async (request, ctx) => handler(request, ctx)
  );
}
