import { isDatabaseConfigured, normalizeDatabaseEnv } from "@/lib/db/config";

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  normalizeDatabaseEnv();

  if (!isDatabaseConfigured()) {
    return;
  }

  try {
    const { ensureDefaultAdmin } = await import("@/lib/auth/bootstrap-admin");
    await ensureDefaultAdmin();
  } catch (error) {
    console.error("Failed to bootstrap default admin:", error);
  }
}
