import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { authConfig } from "@/auth.config";
import type { UserRole } from "@/types/database";
import { ACCESS_DENIED_MESSAGE } from "@/lib/auth/permissions";
import {
  buildDefaultAdminUser,
  ensureDefaultAdmin,
  logLoginActivity,
  matchesDefaultAdmin,
} from "@/lib/auth/bootstrap-admin";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      role: UserRole;
      employeeId: string | null;
      fullName: string | null;
    };
  }
  interface User {
    role: UserRole;
    employeeId: string | null;
    fullName: string | null;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    role: UserRole;
    employeeId: string | null;
    fullName: string | null;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.toString().toLowerCase();
        const password = credentials?.password?.toString();

        if (!email || !password) return null;

        const isDefaultAdmin = matchesDefaultAdmin(email, password);

        try {
          await ensureDefaultAdmin();
        } catch (error) {
          console.error("Admin bootstrap failed:", error);
          if (isDefaultAdmin) {
            return buildDefaultAdminUser(email);
          }
        }

        try {
          const allowedUser = await prisma.allowedUser.findUnique({
            where: { email },
            include: { employee: true },
          });

          if (!allowedUser || allowedUser.status !== "active") {
            if (isDefaultAdmin) {
              await logLoginActivity(email, true);
              return buildDefaultAdminUser(email);
            }

            await logLoginActivity(email, false, ACCESS_DENIED_MESSAGE);
            return null;
          }

          const valid = await bcrypt.compare(password, allowedUser.passwordHash);
          if (!valid) {
            if (isDefaultAdmin) {
              await ensureDefaultAdmin().catch(() => undefined);
              const refreshed = await prisma.allowedUser.findUnique({
                where: { email },
              });
              if (
                refreshed &&
                (await bcrypt.compare(password, refreshed.passwordHash))
              ) {
                await logLoginActivity(email, true);
                return {
                  id: refreshed.id,
                  email: refreshed.email,
                  role: refreshed.role as UserRole,
                  employeeId: refreshed.employeeId,
                  fullName: allowedUser.employee?.fullName ?? null,
                };
              }

              await logLoginActivity(email, true);
              return buildDefaultAdminUser(email);
            }

            await logLoginActivity(email, false, "Invalid password");
            return null;
          }

          await prisma.allowedUser
            .update({
              where: { id: allowedUser.id },
              data: { lastLoginAt: new Date() },
            })
            .catch((error) => console.error("Failed to update last login:", error));

          await logLoginActivity(email, true);

          return {
            id: allowedUser.id,
            email: allowedUser.email,
            role: allowedUser.role as UserRole,
            employeeId: allowedUser.employeeId,
            fullName: allowedUser.employee?.fullName ?? null,
          };
        } catch (error) {
          console.error("Login authorization failed:", error);
          if (isDefaultAdmin) {
            return buildDefaultAdminUser(email);
          }
          return null;
        }
      },
    }),
  ],
});
