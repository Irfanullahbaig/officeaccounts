"use server";

import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import type { AuthUser, UserRole } from "@/types/database";
import { isReadOnlyRole } from "@/lib/auth/permissions";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session-token";

export async function getCurrentUser(): Promise<AuthUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await verifySessionToken(token);
  if (!session) return null;

  const allowedUser = await prisma.allowedUser.findUnique({
    where: { id: session.id },
    include: { employee: true },
  });

  if (!allowedUser || allowedUser.status !== "active") return null;

  return {
    id: allowedUser.id,
    email: allowedUser.email,
    role: allowedUser.role as UserRole,
    employeeId: allowedUser.employeeId,
    fullName: allowedUser.employee?.fullName ?? session.fullName,
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
