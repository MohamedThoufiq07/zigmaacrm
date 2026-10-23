"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Shield,
  Building2,
  Users,
  CreditCard,
  Activity,
  ArrowLeft,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink,
  Zap,
  X,
  UserCheck,
  MessageSquare,
  PauseCircle,
  PlayCircle,
  Eye,
  Sliders,
  LogOut,
  ChevronRight,
  ShieldAlert,
  Lock,
  Key,
  LogIn,
  User,
  EyeOff,
  CheckCircle,
  Bell,
  AlertCircle,
  Sparkles
} from "lucide-react";
import { api } from "@/lib/api";
import LogoLoader from "@/components/common/LogoLoader";

interface OrganizationOwner {
  id?: string;
  full_name: string;
  email: string;
}

interface OrganizationQuotas {
  max_users: number;
  max_whatsapp: number;
}

interface OrganizationItem {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  trial_ends_at: string | null;
  days_left?: number | null;
  created_at: string | null;
  owner: OrganizationOwner;
  total_users: number;
  quotas: OrganizationQuotas;
}

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  timestamp: string | null;
  org_id: string;
  days_left?: number | null;
  is_urgent: boolean;
}

interface RecentSignupItem {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  created_at: string | null;
  trial_ends_at: string | null;
  days_left: number | null;
  is_recent: boolean;
  owner_name: string;
  owner_email: string;
}

interface OverviewData {
  kpi: {
    total_organizations: number;
    total_users: number;
    active_admins: number;
    active_sales_reps: number;
    active_subscriptions: number;
    free_trials: number;
    suspended_organizations: number;
  };
  system_health: {
    database: string;
    whatsapp_service: string;
    api_version: string;
    uptime_guarantee: string;
  };
  notifications?: NotificationItem[];
  recent_signups?: RecentSignupItem[];
}

export default function SuperAdminPortalPage() {
  const router = useRouter();

  // Enforce Light Mode on Admin Portal
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.remove("dark");
      document.documentElement.style.colorScheme = "light";
    }
  }, []);

  // Authentication & Authorization state
  const [loading, setLoading] = useState<boolean>(true);
  const [authorized, setAuthorized] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Portal Data state
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [organizations, setOrganizations] = useState<OrganizationItem[]>([]);
  const [fetching, setFetching] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");

  // Notification UI state
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [dismissBanner, setDismissBanner] = useState<boolean>(false);

  // Table Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [planFilter, setPlanFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Modals state
  const [selectedOrg, setSelectedOrg] = useState<OrganizationItem | null>(null);
  const [modalType, setModalType] = useState<"PLAN" | "TRIAL" | "QUOTAS" | "STATUS" | null>(null);

  // Modal form states
  const [newPlan, setNewPlan] = useState<string>("PRO");
  const [extendDays, setExtendDays] = useState<number>(14);
  const [quotaUsers, setQuotaUsers] = useState<number>(15);
  const [quotaWhatsapp, setQuotaWhatsapp] = useState<number>(1500);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Direct Master Admin Login on /admin
  const [adminUsername, setAdminUsername] = useState<string>("");
  const [adminPassword, setAdminPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loginLoading, setLoginLoading] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string>("");

  // 1. Authorization Guard
  useEffect(() => {
    async function checkSuperAdmin() {
      try {
        let user: any = api.getCurrentUser();
        if (!user || !user.email) {
          try {
            user = await api.getMe();
          } catch {}
        }
        if (!user) {
          // Stay on /admin and render dedicated master admin login
          setAuthorized(false);
          setLoading(false);
          return;
        }

        const roleStr = (user.role || "").toLowerCase();
        const emailStr = (user.email || "").toLowerCase();
        const isSuper =
          Boolean(user.is_super_admin) ||
          roleStr === "super_admin" ||
          roleStr === "superadmin" ||
          ["admin@zigmaa.com", "zigmaaadmin", "zigmaaadmin@zigmaa.com", "thoufiqarsath84@gmail.com", "mdthoufiq0507@gmail.com"].includes(emailStr) ||
          emailStr.endsWith("@zigmaa.com");

        if (!isSuper) {
          setCurrentUser(user);
          setAuthorized(false);
          setLoading(false);
          return;
        }

        setCurrentUser(user);
        setAuthorized(true);
        loadPortalData();
      } catch (err: any) {
        console.error("Super Admin check failed:", err);
        setAuthorized(false);
      } finally {
        setLoading(false);
      }
    }

    checkSuperAdmin();
  }, []);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminUsername.trim() || !adminPassword) {
      setLoginError("Please enter both username and password.");
      return;
    }

    setLoginLoading(true);
    setLoginError("");

    try {
      const res = await api.superAdminLogin(adminUsername.trim(), adminPassword);
      const user = res?.user;
      const roleStr = (user?.role || "").toLowerCase();
      const emailStr = (user?.email || "").toLowerCase();
      const isSuper =
        Boolean(user?.is_super_admin) ||
        roleStr === "super_admin" ||
        roleStr === "superadmin" ||
        ["admin@zigmaa.com", "zigmaaadmin", "zigmaaadmin@zigmaa.com", "thoufiqarsath84@gmail.com", "mdthoufiq0507@gmail.com"].includes(emailStr) ||
        emailStr.endsWith("@zigmaa.com");

      if (!isSuper) {
        setLoginError("Access Denied: This account is authenticated but does not possess Super Administrator privileges.");
        setLoginLoading(false);
        return;
      }

      setCurrentUser(user);
      setAuthorized(true);
      loadPortalData();
    } catch (err: any) {
      setLoginError(err.message || "Invalid credentials for master portal.");
    } finally {
      setLoginLoading(false);
    }
  };

  // 2. Fetch Portal Data
  async function loadPortalData() {
    setFetching(true);
    setErrorMsg("");
    try {
      const [overviewData, orgsData] = await Promise.all([
        api.getSuperAdminOverview(),
        api.getSuperAdminOrganizations()
      ]);
      setOverview(overviewData);
      setOrganizations(orgsData);
    } catch (err: any) {
      console.error("Failed to load portal data:", err);
      setErrorMsg(err.message || "Failed to load super admin portal data. Ensure backend is running.");
    } finally {
      setFetching(false);
    }
  }

  // 3. Filtered Organizations
  const filteredOrgs = useMemo(() => {
    return organizations.filter((org) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        org.name.toLowerCase().includes(q) ||
        org.slug.toLowerCase().includes(q) ||
        (org.owner?.email || "").toLowerCase().includes(q) ||
        (org.owner?.full_name || "").toLowerCase().includes(q);

      const matchPlan =
        planFilter === "ALL" ||
        (org.plan || "").toUpperCase() === planFilter.toUpperCase();

      const matchStatus =
        statusFilter === "ALL" ||
        (org.status || "").toUpperCase() === statusFilter.toUpperCase();

      return matchSearch && matchPlan && matchStatus;
    });
  }, [organizations, searchQuery, planFilter, statusFilter]);

  // 4. Modal Handlers
  const openPlanModal = (org: OrganizationItem) => {
    setSelectedOrg(org);
    setNewPlan((org.plan || "PRO").toUpperCase());
    setModalType("PLAN");
  };

  const openTrialModal = (org: OrganizationItem) => {
    setSelectedOrg(org);
    setExtendDays(14);
    setModalType("TRIAL");
  };

  const openQuotasModal = (org: OrganizationItem) => {
    setSelectedOrg(org);
    setQuotaUsers(org.quotas?.max_users || 15);
    setQuotaWhatsapp(org.quotas?.max_whatsapp || 1500);
    setModalType("QUOTAS");
  };

  const openStatusModal = (org: OrganizationItem) => {
    setSelectedOrg(org);
    setModalType("STATUS");
  };

  const closeModal = () => {
    setSelectedOrg(null);
    setModalType(null);
    setErrorMsg("");
  };

  // 5. Actions Execution
  const handleChangePlan = async () => {
    if (!selectedOrg) return;
    setActionLoading(true);
    try {
      await api.updateTenantPlan(selectedOrg.id, newPlan);
      setSuccessMsg(`Successfully updated ${selectedOrg.name} to ${newPlan} plan.`);
      closeModal();
      loadPortalData();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update plan");
    } finally {
      setActionLoading(false);
    }
  };

  const handleExtendTrial = async () => {
    if (!selectedOrg) return;
    setActionLoading(true);
    try {
      await api.extendTenantTrial(selectedOrg.id, extendDays);
      setSuccessMsg(`Trial for ${selectedOrg.name} extended by ${extendDays} days.`);
      closeModal();
      loadPortalData();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to extend trial");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateQuotas = async () => {
    if (!selectedOrg) return;
    setActionLoading(true);
    try {
      await api.updateTenantQuotas(selectedOrg.id, {
        max_users: Number(quotaUsers),
        max_whatsapp: Number(quotaWhatsapp)
      });
      setSuccessMsg(`Quotas updated for ${selectedOrg.name}.`);
      closeModal();
      loadPortalData();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update quotas");
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!selectedOrg) return;
    setActionLoading(true);
    const nextStatus = selectedOrg.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    try {
      await api.updateTenantStatus(selectedOrg.id, nextStatus);
      setSuccessMsg(`Company ${selectedOrg.name} has been ${nextStatus === "ACTIVE" ? "activated" : "suspended"}.`);
      closeModal();
      loadPortalData();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update status");
    } finally {
      setActionLoading(false);
    }
  };

  const handleImpersonate = async (org: OrganizationItem) => {
    const confirmSwitch = window.confirm(
      `Switch session to view as Administrator for "${org.name}"? You can return to Master Portal at any time.`
    );
    if (!confirmSwitch) return;

    try {
      await api.impersonateTenant(org.id);
      window.location.href = "/";
    } catch (err: any) {
      alert(err.message || "Unable to impersonate organization.");
    }
  };

  // Notification count (urgent warnings + new registrations)
  const notificationsList = overview?.notifications || [];
  const urgentCount = notificationsList.filter((n) => n.is_urgent).length;
  const recentCompany = overview?.recent_signups?.[0];

  // Official Branded Loading State (Light Mode)
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <LogoLoader
          size="lg"
          text="ZIGMAA MASTER PORTAL"
          fullScreen={true}
          theme="light"
        />
      </div>
    );
  }

  // Master Admin Gateway Login (Light Mode - Red & White Professional Theme)
  if (!authorized) {
    return (
      <div className="h-screen w-screen overflow-hidden bg-slate-50 flex items-center justify-center p-4 text-slate-900 font-sans relative select-none">
        {/* Subtle architectural dot matrix backdrop */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.35]"
          style={{
            backgroundImage: "radial-gradient(rgba(148, 163, 184, 0.4) 1px, transparent 1px)",
            backgroundSize: "24px 24px"
          }}
        />

        {/* Ambient volumetric crimson blooms */}
        <div className="absolute w-[500px] h-[500px] rounded-full bg-red-600/5 blur-[120px] pointer-events-none" />
        <div className="absolute w-[300px] h-[300px] rounded-full bg-rose-500/5 blur-[80px] pointer-events-none" />

        {/* Crisp Center Login Card */}
        <div className="w-full max-w-[420px] bg-white border border-slate-200/90 rounded-2xl p-7 sm:p-8 shadow-xl shadow-slate-200/60 relative z-10">
          {/* Header Branding with Official Logo */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200/80 shadow-sm p-2 mb-3 flex items-center justify-center">
              <img
                src="/crmlogo.png"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = "/loadinglogo.png";
                }}
                alt="Zigmaa CRM"
                className="w-10 h-10 object-contain drop-shadow-sm"
              />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-red-50 border border-red-200 text-[11px] font-bold text-red-600 uppercase tracking-wider mb-2">
              <Shield className="w-3.5 h-3.5 text-red-600" />
              <span>Super Admin Gateway</span>
            </div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
              Zigmaa Master Portal
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Enter administrative credentials to access control center
            </p>
          </div>

          {/* Error Notice */}
          {loginError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span className="font-medium leading-relaxed">{loginError}</span>
            </div>
          )}

          {/* Secure Login Form */}
          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Admin Username or Email
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  required
                  autoFocus
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  placeholder="Enter admin username or email"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-colors shadow-2xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Master Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Enter master password"
                  className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-colors shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-2.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-red-600/20 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
            >
              {loginLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verifying Clearance...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Sign In to Master Portal</span>
                </>
              )}
            </button>
          </form>

          {/* Footer Back Link */}
          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <Link
              href="/"
              className="text-xs font-medium text-slate-500 hover:text-red-600 transition-colors inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to CRM Dashboard</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Master Portal Dashboard (Light Mode - Red & White SaaS Architecture)
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* 1. MASTER PORTAL HEADER */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200/90 shadow-2xs px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-xs p-1.5 flex items-center justify-center">
              <img
                src="/crmlogo.png"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = "/loadinglogo.png";
                }}
                alt="Zigmaa Master Portal"
                className="w-7 h-7 object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-slate-900">
                  ZIGMAA MASTER PORTAL
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest bg-red-50 text-red-600 px-2.5 py-0.5 rounded-full border border-red-200">
                  Super Admin
                </span>
              </div>
              <p className="text-xs text-slate-500">Global Multi-Tenant Infrastructure & Control Center</p>
            </div>
          </div>
        </div>

        {/* Master Portal Navigation & Controls */}
        <div className="flex items-center gap-3">
          {/* Notifications Dropdown (New Signups & Critical Trial Warnings) */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200 shadow-2xs transition-all relative cursor-pointer"
              title="Platform Notifications (New Signups & Expiring Trials)"
            >
              <Bell className="w-4 h-4 text-slate-600" />
              {notificationsList.length > 0 && (
                <span className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-white font-bold text-[10px] flex items-center justify-center shadow-xs ${
                  urgentCount > 0 ? "bg-red-600 animate-pulse" : "bg-red-500"
                }`}>
                  {notificationsList.length}
                </span>
              )}
            </button>

            {showNotifications && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowNotifications(false)}
                />
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 z-50 text-xs text-slate-900 animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">Platform Notifications</span>
                      <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-600 font-bold text-[10px] border border-red-200">
                        {notificationsList.length} total
                      </span>
                    </div>
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto custom-scrollbar my-2">
                    {notificationsList.length === 0 ? (
                      <div className="py-8 text-center text-slate-400">
                        No active notifications.
                      </div>
                    ) : (
                      notificationsList.map((notif) => (
                        <div
                          key={notif.id}
                          className={`p-3 rounded-xl transition-colors ${
                            notif.is_urgent ? "bg-red-50/70 border border-red-100" : "hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            {notif.is_urgent ? (
                              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5 animate-pulse" />
                            ) : (
                              <Building2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                            )}
                            <div className="flex-1">
                              <div className="font-bold text-slate-900 flex items-center justify-between">
                                <span>{notif.title}</span>
                                {notif.days_left !== undefined && notif.days_left !== null && (
                                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                                    notif.days_left <= 3
                                      ? "bg-red-600 text-white"
                                      : "bg-amber-100 text-amber-800"
                                  }`}>
                                    {notif.days_left}d left
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                                {notif.message}
                              </p>
                              {notif.timestamp && (
                                <span className="text-[10px] text-slate-400 font-mono block mt-1">
                                  {new Date(notif.timestamp).toLocaleString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 text-center">
                    <span className="text-[11px] text-slate-400">
                      Notifications auto-update with every new tenant signup
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>

          <button
            onClick={loadPortalData}
            disabled={fetching}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 rounded-lg text-xs font-semibold transition-all border border-slate-200 shadow-2xs cursor-pointer disabled:opacity-50"
            title="Refresh All Real-time Platform Metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${fetching ? "animate-spin text-red-600" : "text-slate-500"}`} />
            <span>Refresh</span>
          </button>

          {/* Dedicated Toggle: Back to CRM Dashboard */}
          <Link
            href="/"
            className="flex items-center gap-2 px-3.5 py-1.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs font-semibold rounded-lg shadow-sm shadow-red-600/20 transition-all border border-red-600"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to CRM Dashboard</span>
          </Link>

          <div className="h-6 w-px bg-slate-200 mx-1" />

          {/* Super Admin User Info & Logout */}
          <div className="flex items-center gap-2 pl-1">
            <div className="w-8 h-8 rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-xs font-bold text-red-600">
              SA
            </div>
            <button
              onClick={() => {
                api.logout();
                router.replace("/login");
              }}
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* 2. MAIN PORTAL BODY */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        {/* NEW COMPANY SIGNUP BANNER ALERT (Triggered upon registration) */}
        {!dismissBanner && recentCompany && (
          <div className="p-4 bg-gradient-to-r from-red-50 via-rose-50 to-white border border-red-200 rounded-2xl shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-md shadow-red-600/20 shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-slate-900 text-sm">
                    New Company Registered: {recentCompany.name}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold uppercase tracking-wider">
                    7-Day Trial
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  Owner: <strong className="text-slate-800">{recentCompany.owner_name}</strong> ({recentCompany.owner_email}) • Started 7-Day Free Trial
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                onClick={() => setSearchQuery(recentCompany.name)}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer transition-all"
              >
                Inspect Tenant
              </button>
              <button
                onClick={() => setDismissBanner(true)}
                className="p-1.5 text-slate-400 hover:text-slate-600 cursor-pointer rounded-lg hover:bg-slate-100 transition-colors"
                title="Dismiss Banner"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Alerts & Notifications */}
        {errorMsg && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
              <span className="font-medium">{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg("")} className="text-red-500 hover:text-red-700 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span className="font-medium">{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg("")} className="text-emerald-500 hover:text-emerald-700 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 3. KPI METRIC CARDS */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Organizations */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs hover:shadow-md hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Companies
              </span>
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-slate-900 mb-1 tracking-tight">
              {overview?.kpi.total_organizations ?? "—"}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="text-emerald-600 font-semibold flex items-center gap-0.5">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                {overview?.kpi.total_organizations ? `${overview.kpi.total_organizations - (overview.kpi.suspended_organizations || 0)} active` : "0 active"}
              </span>
              <span>•</span>
              <span className="text-amber-600 font-medium">{overview?.kpi.suspended_organizations ?? 0} suspended</span>
            </div>
          </div>

          {/* Card 2: Total Active Admins & Reps */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs hover:shadow-md hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Users
              </span>
              <div className="p-2 bg-purple-50 text-purple-600 rounded-xl border border-purple-100">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-slate-900 mb-1 tracking-tight">
              {overview?.kpi.total_users ?? "—"}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="text-purple-600 font-semibold">{overview?.kpi.active_admins ?? 0} Admins</span>
              <span>•</span>
              <span className="text-slate-600 font-medium">{overview?.kpi.active_sales_reps ?? 0} Sales Reps</span>
            </div>
          </div>

          {/* Card 3: Active Subscriptions vs Free Trials */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs hover:shadow-md hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Subscriptions vs Trials
              </span>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-3xl font-extrabold text-emerald-600 tracking-tight">
                {overview?.kpi.active_subscriptions ?? "—"}
              </span>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">paid</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="text-amber-600 font-semibold">{overview?.kpi.free_trials ?? 0} on Free Trial</span>
              <span>•</span>
              <span className="text-slate-400">7-Day Starter/Pro</span>
            </div>
          </div>

          {/* Card 4: System & WhatsApp Health */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs hover:shadow-md hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                System Status
              </span>
              <div className="p-2 bg-red-50 text-red-600 rounded-xl border border-red-100">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-base font-bold text-slate-900 capitalize">
                DB: {overview?.system_health.database ?? "Healthy"}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1">
                WhatsApp:
                <span className="text-emerald-600 font-semibold capitalize">
                  {overview?.system_health.whatsapp_service ?? "Connected"}
                </span>
              </span>
              <span className="text-slate-400 font-medium">{overview?.system_health.uptime_guarantee ?? "99.98%"}</span>
            </div>
          </div>
        </section>

        {/* 4. ORGANIZATIONS MANAGEMENT TABLE */}
        <section className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
          {/* Table Toolbar */}
          <div className="p-4 sm:p-5 border-b border-slate-200/90 flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between bg-slate-50/50">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-red-600" />
                <span>Registered Organizations & Tenants</span>
                <span className="text-xs font-bold bg-red-50 text-red-600 border border-red-200 px-2.5 py-0.5 rounded-full">
                  {filteredOrgs.length}
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage tenant subscription plans, extend trials, regulate quotas, and view company workspaces.
              </p>
            </div>

            {/* Search & Filter Controls */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Search */}
              <div className="relative min-w-[210px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search company or owner..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-colors shadow-2xs"
                />
              </div>

              {/* Plan Filter */}
              <select
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
                className="py-1.5 px-3 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-red-600 transition-colors cursor-pointer shadow-2xs"
              >
                <option value="ALL">All Plans</option>
                <option value="FREE_TRIAL">Free Trial</option>
                <option value="STARTER">Starter</option>
                <option value="PRO">Pro</option>
                <option value="ENTERPRISE">Enterprise</option>
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="py-1.5 px-3 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-red-600 transition-colors cursor-pointer shadow-2xs"
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="EXPIRED">Expired</option>
              </select>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Company Name</th>
                  <th className="py-3 px-4">Owner Email</th>
                  <th className="py-3 px-4">Plan</th>
                  <th className="py-3 px-4">Trial Expiry</th>
                  <th className="py-3 px-4 text-center">Users</th>
                  <th className="py-3 px-4">Quotas</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredOrgs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-400">
                      No organizations matching current filters.
                    </td>
                  </tr>
                ) : (
                  filteredOrgs.map((org) => {
                    const isTrial = (org.plan || "").toUpperCase().includes("TRIAL");
                    const isPro = (org.plan || "").toUpperCase() === "PRO";
                    const isEnterprise = (org.plan || "").toUpperCase() === "ENTERPRISE";
                    const isSuspended = org.status === "SUSPENDED";

                    return (
                      <tr
                        key={org.id}
                        className="hover:bg-slate-50/80 transition-colors group"
                      >
                        {/* Company Name */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center font-bold text-red-600 uppercase text-xs shadow-2xs">
                              {org.name.slice(0, 2)}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900 group-hover:text-red-600 transition-colors">
                                {org.name}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                /{org.slug}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Owner Email */}
                        <td className="py-3 px-4">
                          <div className="text-slate-800 font-medium">{org.owner?.full_name || "N/A"}</div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {org.owner?.email || "No email"}
                          </div>
                        </td>

                        {/* Plan */}
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              isEnterprise
                                ? "bg-purple-50 text-purple-700 border border-purple-200"
                                : isPro
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : isTrial
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-slate-100 text-slate-700 border border-slate-200"
                            }`}
                          >
                            {isEnterprise && <Zap className="w-2.5 h-2.5 text-purple-600" />}
                            {org.plan}
                          </span>
                        </td>

                        {/* Trial Expiry with Color Transition (Turns RED in the last 3 days - Matching Exact Design) */}
                        <td className="py-3 px-4">
                          {org.trial_ends_at ? (() => {
                            let days = org.days_left;
                            if (days === undefined || days === null) {
                              const diffMs = new Date(org.trial_ends_at).getTime() - new Date().getTime();
                              days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                            }
                            const isRedCritical = days <= 3;

                            return (
                              <div className="flex flex-col gap-1 items-start">
                                {/* The Exact Pill Badge from user mockup */}
                                <div
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold select-none shadow-2xs transition-all ${
                                    isRedCritical
                                      ? "bg-red-600 text-white shadow-red-600/30 ring-1 ring-red-500/30"
                                      : "bg-amber-50 text-amber-800 border border-amber-200"
                                  }`}
                                  title={
                                    days <= 0
                                      ? "Trial has expired!"
                                      : `Trial expires in ${days} day${days === 1 ? "" : "s"}`
                                  }
                                >
                                  {isRedCritical ? (
                                    <AlertCircle className="w-3 h-3 text-white shrink-0 animate-pulse" />
                                  ) : (
                                    <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                                  )}
                                  <span className="font-semibold tracking-tight">Trial</span>
                                  <span
                                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold shadow-inner ${
                                      isRedCritical
                                        ? "bg-red-800/90 text-white"
                                        : "bg-amber-200/60 text-amber-900"
                                    }`}
                                  >
                                    {days <= 0 ? "Expired" : `${days}d left`}
                                  </span>
                                </div>
                                <span className="text-[10px] text-slate-400 pl-1 font-mono">
                                  {new Date(org.trial_ends_at).toLocaleDateString()}
                                </span>
                              </div>
                            );
                          })() : (
                            <span className="text-slate-400 text-[11px] font-medium">Permanent</span>
                          )}
                        </td>

                        {/* Total Users */}
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center justify-center font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 text-xs">
                            {org.total_users}
                          </span>
                        </td>

                        {/* Quotas */}
                        <td className="py-3 px-4">
                          <div className="text-[11px] text-slate-600 leading-relaxed">
                            <span>Max Users: <strong className="text-slate-900">{org.quotas?.max_users ?? 15}</strong></span>
                            <br />
                            <span>WhatsApp: <strong className="text-slate-900">{org.quotas?.max_whatsapp ?? 1500}</strong></span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              isSuspended
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isSuspended ? "bg-rose-500" : "bg-emerald-500"
                              }`}
                            />
                            {org.status}
                          </span>
                        </td>

                        {/* Action Buttons */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Extend Trial */}
                            <button
                              onClick={() => openTrialModal(org)}
                              className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-medium shadow-2xs transition-colors cursor-pointer"
                              title="Extend Free Trial Period"
                            >
                              Extend Trial
                            </button>

                            {/* Change Plan */}
                            <button
                              onClick={() => openPlanModal(org)}
                              className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-medium shadow-2xs transition-colors cursor-pointer"
                              title="Change Subscription Tier"
                            >
                              Change Plan
                            </button>

                            {/* Quotas Modal */}
                            <button
                              onClick={() => openQuotasModal(org)}
                              className="p-1.5 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-lg shadow-2xs transition-colors cursor-pointer"
                              title="Manage Tenant Quotas"
                            >
                              <Sliders className="w-3.5 h-3.5" />
                            </button>

                            {/* Suspend / Activate Toggle */}
                            <button
                              onClick={() => openStatusModal(org)}
                              className={`p-1.5 rounded-lg border shadow-2xs transition-colors cursor-pointer ${
                                isSuspended
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                  : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                              }`}
                              title={isSuspended ? "Re-activate Organization" : "Suspend Organization"}
                            >
                              {isSuspended ? (
                                <PlayCircle className="w-3.5 h-3.5" />
                              ) : (
                                <PauseCircle className="w-3.5 h-3.5" />
                              )}
                            </button>

                            {/* Impersonate / View as Admin */}
                            <button
                              onClick={() => handleImpersonate(org)}
                              className="flex items-center gap-1 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[11px] font-semibold shadow-xs shadow-red-600/20 transition-all cursor-pointer ml-1"
                              title={`View "${org.name}" as Workspace Administrator`}
                            >
                              <Eye className="w-3 h-3" />
                              <span>View as Admin</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* ============================================================== */}
      {/* ACTION MODALS (LIGHT THEME)                                    */}
      {/* ============================================================== */}

      {/* 1. CHANGE PLAN MODAL */}
      {modalType === "PLAN" && selectedOrg && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 text-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-red-600" />
                <h3 className="font-bold text-slate-900 text-base">Change Plan Tier</h3>
              </div>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <p className="text-xs text-slate-500 mb-3">
                Update subscription plan for <strong className="text-slate-900">{selectedOrg.name}</strong>.
              </p>

              <div className="space-y-2">
                {[
                  { id: "FREE_TRIAL", name: "Free Trial", desc: "Basic CRM trial, 5 users, 200 WhatsApp msgs" },
                  { id: "STARTER", name: "Starter", desc: "Small teams, 5 users, 500 WhatsApp msgs" },
                  { id: "PRO", name: "Pro", desc: "Growing teams, 15 users, 1,500 WhatsApp msgs" },
                  { id: "ENTERPRISE", name: "Enterprise", desc: "Unlimited scale, 50 users, 5,000 WhatsApp msgs" },
                ].map((tier) => (
                  <label
                    key={tier.id}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      newPlan === tier.id
                        ? "bg-red-50 border-red-500 text-slate-900"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="plan"
                      value={tier.id}
                      checked={newPlan === tier.id}
                      onChange={(e) => setNewPlan(e.target.value)}
                      className="mt-1 accent-red-600"
                    />
                    <div>
                      <div className="font-semibold text-xs">{tier.name}</div>
                      <div className="text-[11px] text-slate-500">{tier.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                onClick={closeModal}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleChangePlan}
                disabled={actionLoading}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? "Updating..." : "Confirm Plan Change"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. EXTEND TRIAL MODAL */}
      {modalType === "TRIAL" && selectedOrg && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 text-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-slate-900 text-base">Extend Trial Period</h3>
              </div>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <p className="text-xs text-slate-500 mb-3">
                Extend free trial access for <strong className="text-slate-900">{selectedOrg.name}</strong>.
              </p>

              <div className="grid grid-cols-3 gap-2 mb-4">
                {[7, 14, 30].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setExtendDays(d)}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      extendDays === d
                        ? "bg-amber-50 border-amber-500 text-amber-800"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    +{d} Days
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Custom Additional Days
                </label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={extendDays}
                  onChange={(e) => setExtendDays(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-red-600"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                onClick={closeModal}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleExtendTrial}
                disabled={actionLoading}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? "Extending..." : "Apply Extension"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. TENANT QUOTAS MODAL */}
      {modalType === "QUOTAS" && selectedOrg && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 text-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-base">Manage Tenant Quotas</h3>
              </div>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-slate-500">
                Adjust maximum operational limits for <strong className="text-slate-900">{selectedOrg.name}</strong>.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span>User Limit (Max Team Members)</span>
                  <span className="text-slate-400 font-normal">Currently: {selectedOrg.total_users} active</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={quotaUsers}
                  onChange={(e) => setQuotaUsers(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-red-600 shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Monthly WhatsApp Messages Quota</span>
                  <span className="text-slate-400 font-normal">Meta Cloud API</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={quotaWhatsapp}
                  onChange={(e) => setQuotaWhatsapp(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-red-600 shadow-2xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                onClick={closeModal}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateQuotas}
                disabled={actionLoading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? "Saving..." : "Save Quotas"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. SUSPEND / ACTIVATE CONFIRMATION MODAL */}
      {modalType === "STATUS" && selectedOrg && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 text-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  {selectedOrg.status === "ACTIVE" ? "Suspend Organization" : "Re-activate Organization"}
                </h3>
              </div>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {selectedOrg.status === "ACTIVE" ? (
                <>
                  Are you sure you want to suspend <strong className="text-slate-900">{selectedOrg.name}</strong>?
                  All tenant users will be prevented from accessing CRM data until manually re-activated.
                </>
              ) : (
                <>
                  Re-activate workspace access for <strong className="text-slate-900">{selectedOrg.name}</strong>?
                  Users will immediately regain access to their pipeline and contacts.
                </>
              )}
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                onClick={closeModal}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleToggleStatus}
                disabled={actionLoading}
                className={`px-4 py-2 rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50 ${
                  selectedOrg.status === "ACTIVE"
                    ? "bg-rose-600 hover:bg-rose-700 text-white"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white"
                }`}
              >
                {actionLoading
                  ? "Processing..."
                  : selectedOrg.status === "ACTIVE"
                  ? "Confirm Suspension"
                  : "Confirm Activation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
