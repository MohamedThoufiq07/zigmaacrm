"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export interface UserSession {
  id: string;
  organization_id?: string;
  email: string;
  full_name: string;
  role: "ADMIN" | "MANAGER" | "SALES_REP" | string;
  is_active?: boolean;
  company_name?: string;
  organization_name?: string;
  picture?: string;
}

interface AuthContextType {
  user: UserSession | null;
  role: string;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<any>;
  signup: (data: {
    email: string;
    password: string;
    full_name: string;
    company_name?: string;
    organization_name?: string;
  }) => Promise<any>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  switchRole: (newRole: "ADMIN" | "SALES_REP") => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<UserSession | null>(null);
  const [role, setRole] = useState<string>("ADMIN");
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshUser = useCallback(async () => {
    if (typeof window === "undefined") return;
    const storedToken = localStorage.getItem("zigmaa_token");
    if (!storedToken) {
      setUser(null);
      setToken(null);
      setRole("ADMIN");
      setLoading(false);
      return;
    }

    setToken(storedToken);
    try {
      const me = await api.getMe();
      if (me) {
        setUser(me);
        const resolvedRole = me.role || localStorage.getItem("zigmaa_active_role") || "ADMIN";
        setRole(resolvedRole);
        localStorage.setItem("zigmaa_active_role", resolvedRole);
      }
    } catch (err) {
      console.warn("Failed to verify active session via /api/v1/auth/me:", err);
      const cached = api.getCurrentUser();
      if (cached) {
        setUser(cached);
        setRole(cached.role || "ADMIN");
      } else {
        api.logout();
        setUser(null);
        setToken(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();

    const handleUserUpdate = () => {
      const cached = api.getCurrentUser();
      setUser(cached);
      if (cached?.role) {
        setRole(cached.role);
      }
      const t = localStorage.getItem("zigmaa_token");
      setToken(t);
    };

    window.addEventListener("zigmaa_user_updated", handleUserUpdate);
    window.addEventListener("zigmaa_role_changed", handleUserUpdate);

    return () => {
      window.removeEventListener("zigmaa_user_updated", handleUserUpdate);
      window.removeEventListener("zigmaa_role_changed", handleUserUpdate);
    };
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    const data = await api.login(email, password);
    setToken(data.access_token);
    setUser(data.user);
    const userRole = data.user?.role || "ADMIN";
    setRole(userRole);
    localStorage.setItem("zigmaa_active_role", userRole);
    return data;
  };

  const signup = async (data: {
    email: string;
    password: string;
    full_name: string;
    company_name?: string;
    organization_name?: string;
  }) => {
    const resData = await api.signup(data);
    setToken(resData.access_token);
    setUser(resData.user);
    const userRole = resData.user?.role || "ADMIN";
    setRole(userRole);
    localStorage.setItem("zigmaa_active_role", userRole);
    return resData;
  };

  const logout = () => {
    api.logout();
    setUser(null);
    setToken(null);
    setRole("ADMIN");
    router.replace("/login");
  };

  const switchRole = (newRole: "ADMIN" | "SALES_REP") => {
    setRole(newRole);
    api.setActiveRole(newRole);
    window.location.reload();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        token,
        loading,
        login,
        signup,
        logout,
        refreshUser,
        switchRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
