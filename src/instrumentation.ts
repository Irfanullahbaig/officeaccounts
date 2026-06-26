export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { normalizeDatabaseEnv, isDatabaseConfigured } = await import("@/lib/db/env");

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
