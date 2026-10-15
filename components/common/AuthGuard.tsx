"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState<boolean>(false);

  useEffect(() => {
    // If user is on the login page, no auth check needed
    if (pathname === "/login") {
      setAuthorized(true);
      return;
    }

    const token = typeof window !== "undefined" ? localStorage.getItem("zigmaa_token") : null;
    const user = api.getCurrentUser();

    // Validate token expiration if token exists
    let isTokenExpired = false;
    if (token) {
      try {
        const payloadBase64 = token.split(".")[1];
        if (payloadBase64) {
          const payloadJson = JSON.parse(atob(payloadBase64.replace(/-/g, "+").replace(/_/g, "/")));
          if (payloadJson.exp && Date.now() >= payloadJson.exp * 1000) {
            isTokenExpired = true;
          }
        }
      } catch (e) {
        // If decoding fails, treat token as invalid
        isTokenExpired = true;
      }
    }

    if (!token || !user || isTokenExpired) {
      if (isTokenExpired) {
        api.logout();
      }
      setAuthorized(false);
      router.replace("/login");
    } else {
      setAuthorized(true);
    }
  }, [pathname, router]);

  // If user is trying to access protected routes without valid session, prevent flash of content
  if (!authorized && pathname !== "/login") {
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
