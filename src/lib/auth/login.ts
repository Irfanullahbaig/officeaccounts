"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { logLoginActivity } from "@/lib/auth/bootstrap-admin";
import { setSessionCookie, clearSessionCookie } from "@/lib/auth/cookies";
import {
  ACCESS_DENIED_MESSAGE,
  DIRECTOR_ACCESS_DENIED_MESSAGE,
  DIRECTOR_PORTAL_LOGIN,
} from "@/lib/auth/permissions";
import type { UserRole } from "@/types/database";

async function authenticateUser(email: string, password: string) {
  const normalizedEmail = email.toLowerCase();
  const allowedUser = await prisma.allowedUser.findUnique({
    where: { email: normalizedEmail },
    include: { employee: true },
  });

  if (!allowedUser || allowedUser.status !== "active") {
    await logLoginActivity(normalizedEmail, false, ACCESS_DENIED_MESSAGE);
    return { ok: false as const, error: ACCESS_DENIED_MESSAGE };
  }

  const passwordValid = await bcrypt.compare(password, allowedUser.passwordHash);
  if (!passwordValid) {
    await logLoginActivity(normalizedEmail, false, "Invalid password");
    return { ok: false as const, error: "Invalid email or password." };
  }

  return { ok: true as const, allowedUser };
}

async function finalizeLogin(allowedUser: {
  id: string;
  email: string;
  role: string;
  employeeId: string | null;
  employee: { fullName: string } | null;
}) {
  await prisma.allowedUser.update({
    where: { id: allowedUser.id },
    data: { lastLoginAt: new Date() },
  });

  await setSessionCookie({
    id: allowedUser.id,
    email: allowedUser.email,
    role: allowedUser.role as UserRole,
    employeeId: allowedUser.employeeId,
    fullName: allowedUser.employee?.fullName ?? null,
  });
}

export async function loginStaff(email: string, password: string) {
  const result = await authenticateUser(email, password);
  if (!result.ok) return result;

  const { allowedUser } = result;

  if (allowedUser.role === "director") {
    await logLoginActivity(allowedUser.email, false, "Director attempted staff login");
    return {
      ok: false as const,
      error: `Directors must sign in through the Director Portal at ${DIRECTOR_PORTAL_LOGIN}`,
    };
  }

  await logLoginActivity(allowedUser.email, true);
  await finalizeLogin(allowedUser);

  return {
    ok: true as const,
    role: allowedUser.role as UserRole,
  };
}

export async function loginDirector(email: string, password: string) {
  const result = await authenticateUser(email, password);
  if (!result.ok) {
    if (result.error === ACCESS_DENIED_MESSAGE) {
      return { ok: false as const, error: DIRECTOR_ACCESS_DENIED_MESSAGE };
    }
    return result;
  }

  const { allowedUser } = result;

  if (allowedUser.role !== "director") {
    await logLoginActivity(allowedUser.email, false, DIRECTOR_ACCESS_DENIED_MESSAGE);
    return { ok: false as const, error: DIRECTOR_ACCESS_DENIED_MESSAGE };
  }

  await logLoginActivity(allowedUser.email, true);
  await finalizeLogin(allowedUser);

  return { ok: true as const, role: "director" as const };
}

export async function logout() {
  await clearSessionCookie();
}
