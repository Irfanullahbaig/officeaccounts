"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import type { AuthUser, UserRole } from "@/types/database";

export async function getCurrentUser(): Promise<AuthUser | null> {
  const session = await auth();
  if (!session?.user?.email) return null;

  return {
    id: session.user.id,
    email: session.user.email,
    role: session.user.role,
    employeeId: session.user.employeeId,
    fullName: session.user.fullName,
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
