import { prisma } from "@/lib/prisma";
import {
  ensureDefaultAdminOnClient,
  getDefaultAdminCredentials,
  DEFAULT_ADMIN_EMAIL,
  DEFAULT_ADMIN_PASSWORD,
} from "@/lib/auth/admin-credentials";

export { DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_PASSWORD, getDefaultAdminCredentials };

export async function ensureDefaultAdmin() {
  await ensureDefaultAdminOnClient(prisma);
}

export async function logLoginActivity(
  email: string,
  success: boolean,
  failureReason?: string
) {
  const databaseUrl = process.env.DATABASE_URL ?? "";
  if (!databaseUrl || databaseUrl.includes("build@127.0.0.1")) {
    return;
  }

  try {
    await prisma.loginActivity.create({
      data: { email, success, failureReason },
    });
  } catch (error) {
    console.error("Failed to log login activity:", error);
  }
}
