import bcrypt from "bcryptjs";
import type { PrismaClient } from "@prisma/client";
import { upsertSupabaseAuthUser } from "@/lib/auth/supabase-users";

export const DEFAULT_ADMIN_EMAIL = "admin@northnine.pk";
export const DEFAULT_ADMIN_PASSWORD = "N9Accounts@123";
const LEGACY_ADMIN_EMAILS = ["admin@company.com"];

export function getDefaultAdminCredentials() {
  return {
    email: (process.env.DEFAULT_ADMIN_EMAIL ?? DEFAULT_ADMIN_EMAIL).toLowerCase(),
    password: process.env.DEFAULT_ADMIN_PASSWORD ?? DEFAULT_ADMIN_PASSWORD,
  };
}

export async function ensureDefaultAdminOnClient(prisma: PrismaClient) {
  const { email, password } = getDefaultAdminCredentials();
  const passwordHash = await bcrypt.hash(password, 12);

  const allowedUser = await prisma.allowedUser.upsert({
    where: { email },
    update: {
      passwordHash,
      role: "super_admin",
      status: "active",
    },
    create: {
      email,
      passwordHash,
      role: "super_admin",
      status: "active",
    },
  });

  await prisma.allowedUser.deleteMany({
    where: { email: { in: LEGACY_ADMIN_EMAILS } },
  });

  try {
    await upsertSupabaseAuthUser(email, password, {
      role: "super_admin",
      employeeId: allowedUser.employeeId,
      fullName: "Administrator",
      allowedUserId: allowedUser.id,
    });
  } catch (error) {
    console.error("Failed to sync default admin to Supabase Auth:", error);
    throw error;
  }
}
