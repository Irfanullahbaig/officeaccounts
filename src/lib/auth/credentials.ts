import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { ensureDefaultAdmin, logLoginActivity } from "@/lib/auth/bootstrap-admin";
import { setSessionCookie } from "@/lib/auth/cookies";
import {
  ACCESS_DENIED_MESSAGE,
  DIRECTOR_ACCESS_DENIED_MESSAGE,
  DIRECTOR_PORTAL_LOGIN,
} from "@/lib/auth/permissions";
import type { UserRole } from "@/types/database";

export type LoginResult =
  | { ok: true; role: UserRole }
  | { ok: false; error: string; status?: number };

function prismaErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  if (
    message.includes("P1001") ||
    message.includes("Can't reach database") ||
    message.includes("ECONNREFUSED")
  ) {
    return "Cannot connect to the database. Set DATABASE_URL in Vercel → Environment Variables.";
  }

  if (
    message.includes("P2021") ||
    message.includes("does not exist") ||
    message.includes("no such table")
  ) {
    return "Database not initialized. Open /api/setup?secret=YOUR_SESSION_SECRET once, then try again.";
  }

  return "Login failed. Please try again.";
}

export async function ensureDatabaseReady(): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const count = await prisma.allowedUser.count();
    if (count === 0) {
      await ensureDefaultAdmin();
    }
    return { ok: true };
  } catch (error) {
    console.error("Database readiness check failed:", error);
    return { ok: false, error: prismaErrorMessage(error) };
  }
}

async function authenticateUser(email: string, password: string) {
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

async function finalizeLogin(allowedUser: {
  id: string;
  email: string;
  role: string;
  employeeId: string | null;
  employee: { fullName: string } | null;
}) {
  await prisma.allowedUser
    .update({
      where: { id: allowedUser.id },
      data: { lastLoginAt: new Date() },
    })
    .catch(() => undefined);

  await setSessionCookie({
    id: allowedUser.id,
    email: allowedUser.email,
    role: allowedUser.role as UserRole,
    employeeId: allowedUser.employeeId,
    fullName: allowedUser.employee?.fullName ?? null,
  });
}

export async function performStaffLogin(email: string, password: string): Promise<LoginResult> {
  try {
    const ready = await ensureDatabaseReady();
    if (!ready.ok) {
      return { ok: false, error: ready.error, status: 503 };
    }

    const result = await authenticateUser(email, password);
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
    await finalizeLogin(allowedUser);

    return { ok: true, role: allowedUser.role as UserRole };
  } catch (error) {
    console.error("Staff login error:", error);
    return { ok: false, error: prismaErrorMessage(error), status: 500 };
  }
}

export async function performDirectorLogin(email: string, password: string): Promise<LoginResult> {
  try {
    const ready = await ensureDatabaseReady();
    if (!ready.ok) {
      return { ok: false, error: ready.error, status: 503 };
    }

    const result = await authenticateUser(email, password);
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
    await finalizeLogin(allowedUser);

    return { ok: true, role: "director" };
  } catch (error) {
    console.error("Director login error:", error);
    return { ok: false, error: prismaErrorMessage(error), status: 500 };
  }
}
