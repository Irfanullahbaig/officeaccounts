import type { UserRole } from "@/types/database";

export const ROLES = {
  SUPER_ADMIN: "super_admin" as const,
  ADMIN: "admin" as const,
  FINANCE_MANAGER: "finance_manager" as const,
  EMPLOYEE: "employee" as const,
  VIEWER: "viewer" as const,
};

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  finance_manager: "Finance Manager",
  employee: "Employee",
  viewer: "Viewer",
};

export const ROUTE_PERMISSIONS: Record<string, UserRole[]> = {
  "/dashboard": ["super_admin", "admin", "finance_manager", "employee", "viewer"],
  "/employees": ["super_admin", "admin", "finance_manager", "viewer"],
  "/payroll": ["super_admin", "admin", "finance_manager"],
  "/savings": ["super_admin", "admin", "finance_manager", "viewer"],
  "/loans": ["super_admin", "admin", "finance_manager", "viewer"],
  "/commissions": ["super_admin", "admin", "finance_manager", "viewer"],
  "/revenue": ["super_admin", "admin", "finance_manager"],
  "/expenses": ["super_admin", "admin", "finance_manager"],
  "/reports": ["super_admin", "admin", "finance_manager", "viewer"],
  "/audit-logs": ["super_admin", "admin", "finance_manager", "viewer"],
  "/users": ["super_admin"],
  "/settings": ["super_admin", "admin"],
  "/my": ["super_admin", "admin", "finance_manager", "employee", "viewer"],
};

export function hasRole(userRole: UserRole, allowedRoles: UserRole[]): boolean {
  return allowedRoles.includes(userRole);
}

export function canAccessRoute(userRole: UserRole, pathname: string): boolean {
  const basePath = "/" + pathname.split("/").filter(Boolean).slice(0, 1).join("/");
  const allowed = ROUTE_PERMISSIONS[basePath];
  if (!allowed) return true;
  return hasRole(userRole, allowed);
}

export function isAdmin(role: UserRole): boolean {
  return role === "super_admin" || role === "admin";
}

export function isFinance(role: UserRole): boolean {
  return role === "super_admin" || role === "admin" || role === "finance_manager";
}

export function isEmployeeOnly(role: UserRole): boolean {
  return role === "employee";
}

export const ACCESS_DENIED_MESSAGE =
  "Access Denied. You are not authorized to access this system.";
