import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

const PUBLIC_ROUTES = ["/login", "/access-denied", "/api/auth"];

export default auth((request) => {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_ROUTES.some((r) => pathname.startsWith(r));
  const session = request.auth;

  if (!session?.user && !isPublic) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (session?.user && pathname === "/login") {
    const dest = session.user.role === "employee" ? "/my" : "/dashboard";
    return NextResponse.redirect(new URL(dest, request.url));
  }

  if (session?.user && !isPublic) {
    const role = session.user.role;
    const adminRoutes = ["/users", "/settings"];
    const financeRoutes = [
      "/employees",
      "/payroll",
      "/savings",
      "/loans",
      "/commissions",
      "/revenue",
      "/expenses",
      "/reports",
      "/audit-logs",
    ];

    if (adminRoutes.some((r) => pathname.startsWith(r)) && role !== "super_admin") {
      return NextResponse.redirect(
        new URL(role === "employee" ? "/my" : "/dashboard", request.url)
      );
    }

    if (financeRoutes.some((r) => pathname.startsWith(r)) && role === "employee") {
      return NextResponse.redirect(new URL("/my", request.url));
    }

    if (pathname === "/") {
      return NextResponse.redirect(
        new URL(role === "employee" ? "/my" : "/dashboard", request.url)
      );
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
