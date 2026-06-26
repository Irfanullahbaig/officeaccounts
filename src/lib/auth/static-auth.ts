import { getDefaultAdminCredentials } from "@/lib/auth/admin-credentials";
import type { UserRole } from "@/types/database";

export type StaticAuthUser = {
  id: string;
  email: string;
  password: string;
  role: UserRole;
  fullName: string | null;
  employeeId: string | null;
};

export function getStaticAuthUsers(): StaticAuthUser[] {
  const admin = getDefaultAdminCredentials();
  const users: StaticAuthUser[] = [
    {
      id: "static-admin",
      email: admin.email,
      password: admin.password,
      role: "super_admin",
      fullName: "Administrator",
      employeeId: null,
    },
  ];

  const directorEmail = process.env.DIRECTOR_EMAIL?.toLowerCase().trim();
  const directorPassword = process.env.DIRECTOR_PASSWORD;
  if (directorEmail && directorPassword) {
    users.push({
      id: "static-director",
      email: directorEmail,
      password: directorPassword,
      role: "director",
      fullName: "Director",
      employeeId: null,
    });
  }

  return users;
}

export function authenticateStaticUser(email: string, password: string): StaticAuthUser | null {
  const normalized = email.toLowerCase().trim();
  const user = getStaticAuthUsers().find((entry) => entry.email === normalized);
  if (!user || user.password !== password) {
    return null;
  }
  return user;
}
