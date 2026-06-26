import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { isDirector } from "@/lib/auth/permissions";
import type { UserRole } from "@/types/database";

const PUBLIC_ROUTES = ["/login", "/access-denied", "/auth", "/api/setup", "/director/login"];

const ADMIN_PORTAL_PREFIXES = [
  "/dashboard",
  "/employees",
  "/payroll",
  "/savings",
  "/loans",
  "/commissions",
  "/revenue",
  "/expenses",
  "/reports",
  "/audit-logs",
  "/users",
  "/settings",
  "/my",
];

function isDirectorRoute(pathname: string) {
  return pathname === "/director" || pathname.startsWith("/director/");
}

function isAdminPortalRoute(pathname: string) {
  return ADMIN_PORTAL_PREFIXES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request);
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
  const role = user?.app_metadata?.role as UserRole | undefined;
  const director = role ? isDirector(role) : false;

  if (isDirectorRoute(pathname)) {
    if (pathname === "/director/login") {
      if (user && director) {
        return NextResponse.redirect(new URL("/director/dashboard", request.url));
      }
      return supabaseResponse;
    }

    if (!user || !director) {
      return NextResponse.redirect(new URL("/director/login", request.url));
    }

    if (pathname === "/director") {
      return NextResponse.redirect(new URL("/director/dashboard", request.url));
    }

    return supabaseResponse;
  }

  if (!user && !isPublic) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user && director && (pathname === "/login" || isAdminPortalRoute(pathname) || pathname === "/")) {
    return NextResponse.redirect(new URL("/director/dashboard", request.url));
  }

  if (user && pathname === "/login") {
    const dest = role === "employee" ? "/my" : "/dashboard";
    return NextResponse.redirect(new URL(dest, request.url));
  }

  if (user && !isPublic && !director) {
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

    if (adminRoutes.some((route) => pathname.startsWith(route)) && role !== "super_admin") {
      return NextResponse.redirect(
        new URL(role === "employee" ? "/my" : "/dashboard", request.url)
      );
    }

    if (financeRoutes.some((route) => pathname.startsWith(route)) && role === "employee") {
      return NextResponse.redirect(new URL("/my", request.url));
    }

    if (pathname === "/") {
      return NextResponse.redirect(
        new URL(role === "employee" ? "/my" : "/dashboard", request.url)
      );
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
