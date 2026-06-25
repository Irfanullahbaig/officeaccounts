import { prisma } from "@/lib/prisma";
import type { UserRole } from "@/types/database";
import {
  ensureDefaultAdminOnClient,
  getDefaultAdminCredentials,
  DEFAULT_ADMIN_EMAIL,
  DEFAULT_ADMIN_PASSWORD,
} from "@/lib/auth/admin-credentials";

export { DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_PASSWORD, getDefaultAdminCredentials };

export function matchesDefaultAdmin(email: string, password: string) {
  const admin = getDefaultAdminCredentials();
  return email === admin.email && password === admin.password;
}

export function buildDefaultAdminUser(email: string) {
  return {
    id: "default-admin",
    email,
    role: "super_admin" as UserRole,
    employeeId: null,
    fullName: "Administrator",
  };
}

export async function ensureDefaultAdmin() {
  await ensureDefaultAdminOnClient(prisma);
}

export async function logLoginActivity(
  email: string,
  success: boolean,
  failureReason?: string
) {
  try {
    await prisma.loginActivity.create({
      data: { email, success, failureReason },
    });
  } catch (error) {
    console.error("Failed to log login activity:", error);
  }
}
