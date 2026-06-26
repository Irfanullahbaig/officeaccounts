import { NextResponse } from "next/server";
import {
  getSupabaseRestHeaders,
  getSupabaseRestUrl,
  SUPABASE_DEFAULT_TABLE,
} from "@/lib/supabase/rest";

export const dynamic = "force-dynamic";

/** Verifies Supabase REST API connectivity (e.g. /rest/v1/n9accounts). */
export async function GET() {
  try {
    const url = `${getSupabaseRestUrl()}/${SUPABASE_DEFAULT_TABLE}?limit=1`;
    const response = await fetch(url, {
      headers: getSupabaseRestHeaders(true),
      cache: "no-store",
    });

    const body = response.ok ? await response.json() : await response.text();

    return NextResponse.json({
      ok: response.ok,
      status: response.status,
      endpoint: url,
      sample: body,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Supabase REST check failed",
      },
      { status: 500 }
    );
  }
}
