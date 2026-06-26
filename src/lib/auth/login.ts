"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma";
import { logLoginActivity } from "@/lib/auth/bootstrap-admin";
import {
  ACCESS_DENIED_MESSAGE,
  DIRECTOR_ACCESS_DENIED_MESSAGE,
  DIRECTOR_PORTAL_LOGIN,
} from "@/lib/auth/permissions";
import type { UserRole } from "@/types/database";

async function finalizeLogin(email: string, allowedUserId: string, supabaseUserId: string) {
  await prisma.allowedUser
    .update({
      where: { id: allowedUserId },
      data: { lastLoginAt: new Date() },
    })
    .catch(() => undefined);

  const allowedUser = await prisma.allowedUser.findUnique({
    where: { id: allowedUserId },
    include: { employee: true },
  });
  if (!allowedUser) {
    throw new Error("User record not found.");
  }

  const admin = createAdminClient();
  await admin.auth.admin.updateUserById(supabaseUserId, {
    app_metadata: {
      role: allowedUser.role,
      employeeId: allowedUser.employeeId,
      fullName: allowedUser.employee?.fullName ?? null,
      allowedUserId: allowedUser.id,
    },
  });

  return allowedUser;
}

export async function completeLoginAfterAuth() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.email) {
    return { ok: false as const, error: "Authentication failed." };
  }

  const email = user.email.toLowerCase();
  const allowedUser = await prisma.allowedUser.findUnique({
    where: { email },
    include: { employee: true },
  });

  if (!allowedUser || allowedUser.status !== "active") {
    await logLoginActivity(email, false, ACCESS_DENIED_MESSAGE);
    await supabase.auth.signOut();
    return { ok: false as const, error: ACCESS_DENIED_MESSAGE };
  }

  if (allowedUser.role === "director") {
    await logLoginActivity(email, false, "Director attempted staff login");
    await supabase.auth.signOut();
    return {
      ok: false as const,
      error: `Directors must sign in through the Director Portal at ${DIRECTOR_PORTAL_LOGIN}`,
    };
  }

  await logLoginActivity(email, true);
  await finalizeLogin(email, allowedUser.id, user.id);

  return {
    ok: true as const,
    role: allowedUser.role as UserRole,
  };
}

export async function completeDirectorLoginAfterAuth() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.email) {
    return { ok: false as const, error: "Authentication failed." };
  }

  const email = user.email.toLowerCase();
  const allowedUser = await prisma.allowedUser.findUnique({
    where: { email },
    include: { employee: true },
  });

  if (!allowedUser || allowedUser.status !== "active" || allowedUser.role !== "director") {
    await logLoginActivity(email, false, DIRECTOR_ACCESS_DENIED_MESSAGE);
    await supabase.auth.signOut();
    return { ok: false as const, error: DIRECTOR_ACCESS_DENIED_MESSAGE };
  }

  await logLoginActivity(email, true);
  await finalizeLogin(email, allowedUser.id, user.id);

  return { ok: true as const, role: "director" as const };
}
