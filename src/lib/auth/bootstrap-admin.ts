import { prisma } from "@/lib/prisma";
import {
  ensureDefaultAdminOnClient,
  getDefaultAdminCredentials,
  DEFAULT_ADMIN_EMAIL,
  DEFAULT_ADMIN_PASSWORD,
} from "@/lib/auth/admin-credentials";
import { isDatabaseConfigured } from "@/lib/db/config";
import { upsertSupabaseAuthUser } from "@/lib/auth/supabase-users";
import { isSupabaseAuthConfigured } from "@/lib/supabase/env";

export { DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_PASSWORD, getDefaultAdminCredentials };

export async function ensureDefaultAdmin() {
  await ensureDefaultAdminOnClient(prisma);

  if (isSupabaseAuthConfigured()) {
    const { email, password } = getDefaultAdminCredentials();
    try {
      await upsertSupabaseAuthUser({
        email,
        password,
        role: "super_admin",
      });
    } catch (error) {
      console.error("Failed to sync default admin to Supabase Auth:", error);
    }
  }
}

export async function logLoginActivity(
  email: string,
  success: boolean,
  failureReason?: string
) {
  if (!isDatabaseConfigured()) {
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
