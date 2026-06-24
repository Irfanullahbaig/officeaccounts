import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { authConfig } from "@/auth.config";
import type { UserRole } from "@/types/database";
import { ACCESS_DENIED_MESSAGE } from "@/lib/auth/permissions";

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

        const allowedUser = await prisma.allowedUser.findUnique({
          where: { email },
          include: { employee: true },
        });

        if (!allowedUser || allowedUser.status !== "active") {
          await prisma.loginActivity.create({
            data: {
              email,
              success: false,
              failureReason: ACCESS_DENIED_MESSAGE,
            },
          });
          return null;
        }

        const valid = await bcrypt.compare(password, allowedUser.passwordHash);
        if (!valid) {
          await prisma.loginActivity.create({
            data: { email, success: false, failureReason: "Invalid password" },
          });
          return null;
        }

        await prisma.allowedUser.update({
          where: { id: allowedUser.id },
          data: { lastLoginAt: new Date() },
        });

        await prisma.loginActivity.create({
          data: { email, success: true },
        });

        return {
          id: allowedUser.id,
          email: allowedUser.email,
          role: allowedUser.role as UserRole,
          employeeId: allowedUser.employeeId,
          fullName: allowedUser.employee?.fullName ?? null,
        };
      },
    }),
  ],
});
