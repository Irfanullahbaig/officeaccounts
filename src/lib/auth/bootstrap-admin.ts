import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

export const DEFAULT_ADMIN_EMAIL = "admin@northnine.pk";
export const DEFAULT_ADMIN_PASSWORD = "N9Accounts@123";
const LEGACY_ADMIN_EMAILS = ["admin@company.com"];

export async function ensureDefaultAdmin() {
  const email = (process.env.DEFAULT_ADMIN_EMAIL ?? DEFAULT_ADMIN_EMAIL).toLowerCase();
  const password = process.env.DEFAULT_ADMIN_PASSWORD ?? DEFAULT_ADMIN_PASSWORD;
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
