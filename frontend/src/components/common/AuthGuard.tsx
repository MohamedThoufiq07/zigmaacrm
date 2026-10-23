"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/api";

const PUBLIC_PATHS = ["/login", "/signup", "/invite/accept", "/forgot-password", "/privacy-policy", "/admin"];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState<boolean>(false);

  useEffect(() => {
    const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname?.startsWith("/invite/"));

    let token = typeof window !== "undefined" ? localStorage.getItem("zigmaa_token") : null;
    if (token && token.startsWith('"') && token.endsWith('"')) {
      token = token.slice(1, -1).trim();
    }
    const user = api.getCurrentUser();

    // Validate token expiration if token exists
    let isTokenExpired = false;
    if (token) {
      try {
        const parts = token.split(".");
        if (parts.length === 3 && parts[1]) {
          const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
          const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, "=");
          const payloadJson = JSON.parse(atob(padded));
          if (payloadJson.exp && Date.now() >= payloadJson.exp * 1000) {
            isTokenExpired = true;
          }
        }
      } catch (e) {
        // Don't treat minor parsing hiccups as token expiration
      }
    }

    const hasValidToken = Boolean((token && !isTokenExpired) || (user && user.email));

    if (hasValidToken) {
      // If user is already authenticated and visits login or signup, redirect to dashboard
      if (pathname === "/login" || pathname === "/signup") {
        router.replace("/");
        return;
      }
      setAuthorized(true);
      return;
    }

    // Not authenticated
    if (isTokenExpired) {
      api.logout();
    }

    if (isPublic) {
      setAuthorized(true);
      return;
    }

    // Protected route without valid session -> redirect to login
    setAuthorized(false);
    router.replace("/login");
  }, [pathname, router]);

  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname?.startsWith("/invite/"));

  // If user is trying to access protected routes without valid session, prevent flash of content
  if (!authorized && !isPublic) {
    return (
      <div className="min-h-screen w-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-400 font-medium">Verifying authentication...</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

