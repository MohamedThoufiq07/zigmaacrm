import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Bypass static files, images, APIs, and next internal assets
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/static") ||
    pathname === "/favicon.ico" ||
    pathname === "/crmlogo.png" ||
    pathname === "/icon.png" ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get("zigmaa_token")?.value;

  const isPublicAuthRoute =
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/forgot-password" ||
    pathname.startsWith("/invite/");

  // If user has token and tries to access login or signup, redirect to dashboard root (/)
  if (token && isPublicAuthRoute) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Dedicated Super Admin Portal (/admin) handles its own authentication gateway
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return NextResponse.next();
  }

  // If user does not have token and visits protected route, redirect to /login
  if (!token && !isPublicAuthRoute && pathname !== "/privacy-policy") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|crmlogo.png|icon.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
