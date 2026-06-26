import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { isDatabaseConfigured } from "@/lib/db/config";
import { ensureDefaultAdmin, logLoginActivity } from "@/lib/auth/bootstrap-admin";
import { setSessionCookie } from "@/lib/auth/cookies";
import { authenticateStaticUser } from "@/lib/auth/static-auth";
import {
  ACCESS_DENIED_MESSAGE,
  DIRECTOR_ACCESS_DENIED_MESSAGE,
  DIRECTOR_PORTAL_LOGIN,
} from "@/lib/auth/permissions";
import type { UserRole } from "@/types/database";

export type LoginResult =
  | { ok: true; role: UserRole }
  | { ok: false; error: string; status?: number };

async function finalizeLogin(user: {
  id: string;
  email: string;
  role: UserRole;
  employeeId: string | null;
  fullName: string | null;
}) {
  await setSessionCookie({
    id: user.id,
    email: user.email,
    role: user.role,
    employeeId: user.employeeId,
    fullName: user.fullName,
  });
}

async function performStaticStaffLogin(email: string, password: string): Promise<LoginResult> {
  const user = authenticateStaticUser(email, password);
  if (!user) {
    return { ok: false, error: "Invalid email or password.", status: 401 };
  }

  if (user.role === "director") {
    return {
      ok: false,
      error: `Directors must sign in through the Director Portal at ${DIRECTOR_PORTAL_LOGIN}`,
      status: 403,
    };
  }

  await finalizeLogin(user);
  return { ok: true, role: user.role };
}

async function performStaticDirectorLogin(email: string, password: string): Promise<LoginResult> {
  const user = authenticateStaticUser(email, password);
  if (!user || user.role !== "director") {
    return { ok: false, error: DIRECTOR_ACCESS_DENIED_MESSAGE, status: 401 };
  }

  await finalizeLogin(user);
  return { ok: true, role: "director" };
}

async function ensureDatabaseReady(): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const count = await prisma.allowedUser.count();
    if (count === 0) {
      await ensureDefaultAdmin();
    }
    return { ok: true };
  } catch (error) {
    console.error("Database readiness check failed:", error);
    return { ok: false, error: "Login failed. Please try again." };
  }
}

async function authenticateDatabaseUser(email: string, password: string) {
  const normalizedEmail = email.toLowerCase().trim();

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

export async function performStaffLogin(email: string, password: string): Promise<LoginResult> {
  if (!isDatabaseConfigured()) {
    return performStaticStaffLogin(email, password);
  }

  try {
    const ready = await ensureDatabaseReady();
    if (!ready.ok) {
      return { ok: false, error: ready.error, status: 503 };
    }

    const result = await authenticateDatabaseUser(email, password);
    if (!result.ok) {
      return { ok: false, error: result.error, status: 401 };
    }

    const { allowedUser } = result;

    if (allowedUser.role === "director") {
      await logLoginActivity(allowedUser.email, false, "Director attempted staff login");
      return {
        ok: false,
        error: `Directors must sign in through the Director Portal at ${DIRECTOR_PORTAL_LOGIN}`,
        status: 403,
      };
    }

    await logLoginActivity(allowedUser.email, true);
    await prisma.allowedUser
      .update({
        where: { id: allowedUser.id },
        data: { lastLoginAt: new Date() },
      })
      .catch(() => undefined);

    await finalizeLogin({
      id: allowedUser.id,
      email: allowedUser.email,
      role: allowedUser.role as UserRole,
      employeeId: allowedUser.employeeId,
      fullName: allowedUser.employee?.fullName ?? null,
    });

    return { ok: true, role: allowedUser.role as UserRole };
  } catch (error) {
    console.error("Staff login error:", error);
    return { ok: false, error: "Login failed. Please try again.", status: 500 };
  }
}

export async function performDirectorLogin(email: string, password: string): Promise<LoginResult> {
  if (!isDatabaseConfigured()) {
    return performStaticDirectorLogin(email, password);
  }

  try {
    const ready = await ensureDatabaseReady();
    if (!ready.ok) {
      return { ok: false, error: ready.error, status: 503 };
    }

    const result = await authenticateDatabaseUser(email, password);
    if (!result.ok) {
      const error =
        result.error === ACCESS_DENIED_MESSAGE
          ? DIRECTOR_ACCESS_DENIED_MESSAGE
          : result.error;
      return { ok: false, error, status: 401 };
    }

    const { allowedUser } = result;

    if (allowedUser.role !== "director") {
      await logLoginActivity(allowedUser.email, false, DIRECTOR_ACCESS_DENIED_MESSAGE);
      return { ok: false, error: DIRECTOR_ACCESS_DENIED_MESSAGE, status: 403 };
    }

    await logLoginActivity(allowedUser.email, true);
    await prisma.allowedUser
      .update({
        where: { id: allowedUser.id },
        data: { lastLoginAt: new Date() },
      })
      .catch(() => undefined);

    await finalizeLogin({
      id: allowedUser.id,
      email: allowedUser.email,
      role: "director",
      employeeId: allowedUser.employeeId,
      fullName: allowedUser.employee?.fullName ?? null,
    });

    return { ok: true, role: "director" };
  } catch (error) {
    console.error("Director login error:", error);
    return { ok: false, error: "Login failed. Please try again.", status: 500 };
  }
}
