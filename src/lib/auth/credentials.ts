import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { isDatabaseConfigured } from "@/lib/db/env";
import { isSupabaseAuthConfigured } from "@/lib/supabase/env";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
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
  try {
    await setSessionCookie({
      id: user.id,
      email: user.email,
      role: user.role,
      employeeId: user.employeeId,
      fullName: user.fullName,
    });
  } catch (error) {
    console.error("Failed to set session cookie:", error);
    throw new Error(
      "Unable to start a session. Set SESSION_SECRET in your environment variables."
    );
  }
}

async function loginWithStaticUser(
  email: string,
  password: string,
  portal: "staff" | "director"
): Promise<LoginResult | null> {
  const user = authenticateStaticUser(email, password);
  if (!user) return null;

  if (portal === "staff" && user.role === "director") {
    return {
      ok: false,
      error: `Directors must sign in through the Director Portal at ${DIRECTOR_PORTAL_LOGIN}`,
      status: 403,
    };
  }

  if (portal === "director" && user.role !== "director") {
    return { ok: false, error: DIRECTOR_ACCESS_DENIED_MESSAGE, status: 401 };
  }

  await finalizeLogin(user);
  return { ok: true, role: user.role };
}

async function loginWithSupabase(
  email: string,
  password: string,
  portal: "staff" | "director"
): Promise<LoginResult | null> {
  if (!isSupabaseAuthConfigured() || !isDatabaseConfigured()) return null;

  const normalizedEmail = email.toLowerCase().trim();
  const supabase = await createSupabaseClient();
  const { error: authError } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  if (authError) {
    if (authError.message.toLowerCase().includes("invalid login credentials")) {
      return null;
    }
    console.error("Supabase sign-in error:", authError);
    return { ok: false, error: "Unable to sign in. Please try again.", status: 500 };
  }

  try {
    const count = await prisma.allowedUser.count();
    if (count === 0) {
      await ensureDefaultAdmin();
    }
  } catch (error) {
    console.error("Database bootstrap failed:", error);
    await supabase.auth.signOut();
    return { ok: false, error: "Cannot connect to database.", status: 503 };
  }

  const allowedUser = await prisma.allowedUser.findUnique({
    where: { email: normalizedEmail },
    include: { employee: true },
  });

  if (!allowedUser || allowedUser.status !== "active") {
    await supabase.auth.signOut();
    await logLoginActivity(normalizedEmail, false, ACCESS_DENIED_MESSAGE);
    return { ok: false, error: ACCESS_DENIED_MESSAGE, status: 401 };
  }

  if (portal === "staff" && allowedUser.role === "director") {
    await supabase.auth.signOut();
    await logLoginActivity(allowedUser.email, false, "Director attempted staff login");
    return {
      ok: false,
      error: `Directors must sign in through the Director Portal at ${DIRECTOR_PORTAL_LOGIN}`,
      status: 403,
    };
  }

  if (portal === "director" && allowedUser.role !== "director") {
    await supabase.auth.signOut();
    await logLoginActivity(allowedUser.email, false, DIRECTOR_ACCESS_DENIED_MESSAGE);
    return { ok: false, error: DIRECTOR_ACCESS_DENIED_MESSAGE, status: 401 };
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
}

async function loginWithDatabase(
  email: string,
  password: string,
  portal: "staff" | "director"
): Promise<LoginResult | null> {
  const normalizedEmail = email.toLowerCase().trim();

  try {
    const count = await prisma.allowedUser.count();
    if (count === 0) {
      await ensureDefaultAdmin();
    }
  } catch (error) {
    console.error("Database bootstrap failed:", error);
    return null;
  }

  const allowedUser = await prisma.allowedUser.findUnique({
    where: { email: normalizedEmail },
    include: { employee: true },
  });

  if (!allowedUser || allowedUser.status !== "active") {
    await logLoginActivity(normalizedEmail, false, ACCESS_DENIED_MESSAGE);
    return { ok: false, error: ACCESS_DENIED_MESSAGE, status: 401 };
  }

  const passwordValid = await bcrypt.compare(password, allowedUser.passwordHash);
  if (!passwordValid) {
    await logLoginActivity(normalizedEmail, false, "Invalid password");
    return null;
  }

  if (portal === "staff" && allowedUser.role === "director") {
    await logLoginActivity(allowedUser.email, false, "Director attempted staff login");
    return {
      ok: false,
      error: `Directors must sign in through the Director Portal at ${DIRECTOR_PORTAL_LOGIN}`,
      status: 403,
    };
  }

  if (portal === "director" && allowedUser.role !== "director") {
    await logLoginActivity(allowedUser.email, false, DIRECTOR_ACCESS_DENIED_MESSAGE);
    return { ok: false, error: DIRECTOR_ACCESS_DENIED_MESSAGE, status: 401 };
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
}

async function performLogin(
  email: string,
  password: string,
  portal: "staff" | "director"
): Promise<LoginResult> {
  try {
    if (isSupabaseAuthConfigured() && isDatabaseConfigured()) {
      const supabaseResult = await loginWithSupabase(email, password, portal);
      if (supabaseResult?.ok) return supabaseResult;
      if (supabaseResult && !supabaseResult.ok) return supabaseResult;
    }

    const staticResult = await loginWithStaticUser(email, password, portal);
    if (staticResult?.ok) return staticResult;
    if (staticResult && !staticResult.ok) return staticResult;

    if (isDatabaseConfigured() && !isSupabaseAuthConfigured()) {
      const dbResult = await loginWithDatabase(email, password, portal);
      if (dbResult?.ok) return dbResult;
      if (dbResult && !dbResult.ok) return dbResult;
    }

    return { ok: false, error: "Invalid email or password.", status: 401 };
  } catch (error) {
    console.error(`${portal} login error:`, error);
    const message =
      error instanceof Error ? error.message : "Unable to sign in. Please try again.";
    return { ok: false, error: message, status: 500 };
  }
}

export async function performStaffLogin(email: string, password: string): Promise<LoginResult> {
  return performLogin(email, password, "staff");
}

export async function performDirectorLogin(email: string, password: string): Promise<LoginResult> {
  return performLogin(email, password, "director");
}
