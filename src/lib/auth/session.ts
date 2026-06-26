"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import type { AuthUser, UserRole } from "@/types/database";
import { isReadOnlyRole } from "@/lib/auth/permissions";

export async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return null;

  const metadata = user.app_metadata ?? {};
  let role = metadata.role as UserRole | undefined;
  let employeeId = (metadata.employeeId as string | null | undefined) ?? null;
  let fullName = (metadata.fullName as string | null | undefined) ?? null;
  let allowedUserId = metadata.allowedUserId as string | undefined;

  if (!role || !allowedUserId) {
    const allowedUser = await prisma.allowedUser.findUnique({
      where: { email: user.email.toLowerCase() },
      include: { employee: true },
    });

    if (!allowedUser || allowedUser.status !== "active") return null;

    role = allowedUser.role as UserRole;
    employeeId = allowedUser.employeeId;
    fullName = allowedUser.employee?.fullName ?? null;
    allowedUserId = allowedUser.id;
  }

  return {
    id: allowedUserId,
    email: user.email,
    role,
    employeeId,
    fullName,
  };
}

export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function requireRole(roles: UserRole[]): Promise<AuthUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) throw new Error("Forbidden");
  return user;
}

export async function requireDirector(): Promise<AuthUser> {
  return requireRole(["director"]);
}

export async function requireWriteAccess(): Promise<AuthUser> {
  const user = await requireUser();
  if (isReadOnlyRole(user.role)) {
    throw new Error("You have view-only access and cannot modify data.");
  }
  return user;
}

export async function createAuditLog(params: {
  userEmail?: string;
  action: string;
  entityType: string;
  entityId?: string;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
}) {
  await prisma.auditLog.create({
    data: {
      userEmail: params.userEmail ?? null,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId ?? null,
      oldValue: params.oldValue ? JSON.stringify(params.oldValue) : null,
      newValue: params.newValue ? JSON.stringify(params.newValue) : null,
    },
  });
}
