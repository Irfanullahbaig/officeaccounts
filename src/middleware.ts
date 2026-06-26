import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session-token";
import type { UserRole } from "@/types/database";

const PUBLIC_ROUTES = [
  "/login",
  "/access-denied",
  "/api/setup",
  "/api/health",
  "/api/auth",
  "/director/login",
];

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

function isDirector(role: UserRole | undefined) {
  return role === "director";
}

function isDirectorRoute(pathname: string) {
  return pathname === "/director" || pathname.startsWith("/director/");
}

function isAdminPortalRoute(pathname: string) {
  return ADMIN_PORTAL_PREFIXES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

function isPublicRoute(pathname: string) {
  return PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = isPublicRoute(pathname);

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;
  const role = session?.role;
  const director = isDirector(role);

  if (isDirectorRoute(pathname)) {
    if (pathname === "/director/login") {
      if (session && director) {
        return NextResponse.redirect(new URL("/director/dashboard", request.url));
      }
      return NextResponse.next();
    }

    if (!session || !director) {
      return NextResponse.redirect(new URL("/director/login", request.url));
    }

    if (pathname === "/director") {
      return NextResponse.redirect(new URL("/director/dashboard", request.url));
    }

    return NextResponse.next();
  }

  if (!session && !isPublic) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (session && director && (pathname === "/login" || isAdminPortalRoute(pathname) || pathname === "/")) {
    return NextResponse.redirect(new URL("/director/dashboard", request.url));
  }

  if (session && pathname === "/login") {
    const dest = role === "employee" ? "/my" : "/dashboard";
    return NextResponse.redirect(new URL(dest, request.url));
  }

  if (session && !isPublic && !director) {
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

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
