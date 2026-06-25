export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  try {
    const { ensureDefaultAdmin } = await import("@/lib/auth/bootstrap-admin");
    await ensureDefaultAdmin();
  } catch (error) {
    console.error("Failed to bootstrap default admin:", error);
  }
}
