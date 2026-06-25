import type { NextAuthConfig } from "next-auth";
import type { UserRole } from "@/types/database";

export const authConfig = {
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role: UserRole }).role;
        token.employeeId = (user as { employeeId: string | null }).employeeId;
        token.fullName = (user as { fullName: string | null }).fullName;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        session.user.role = token.role as UserRole;
        session.user.employeeId = (token.employeeId as string | null) ?? null;
        session.user.fullName = (token.fullName as string | null) ?? null;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
