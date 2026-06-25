import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import type { UserRole } from "@/types/database";

export const DEFAULT_ADMIN_EMAIL = "admin@northnine.pk";
export const DEFAULT_ADMIN_PASSWORD = "N9Accounts@123";
const LEGACY_ADMIN_EMAILS = ["admin@company.com"];

export function getDefaultAdminCredentials() {
  return {
    email: (process.env.DEFAULT_ADMIN_EMAIL ?? DEFAULT_ADMIN_EMAIL).toLowerCase(),
    password: process.env.DEFAULT_ADMIN_PASSWORD ?? DEFAULT_ADMIN_PASSWORD,
  };
}

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
  const { email, password } = getDefaultAdminCredentials();
  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.allowedUser.upsert({
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
