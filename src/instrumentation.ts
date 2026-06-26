export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const databaseUrl = process.env.DATABASE_URL ?? "";
  if (!databaseUrl || databaseUrl.includes("build@127.0.0.1")) {
    return;
  }

  try {
    const { ensureDefaultAdmin } = await import("@/lib/auth/bootstrap-admin");
    await ensureDefaultAdmin();
  } catch (error) {
    console.error("Failed to bootstrap default admin:", error);
  }
}
