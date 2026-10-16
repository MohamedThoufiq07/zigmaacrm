"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  Search,
  Sun,
  Moon,
  FileText,
  Bell,
  User,
  UserPlus,
  Building2,
  Settings,
  Activity,
  ShieldCheck,
  HelpCircle,
  LogOut,
  ChevronDown,
  Camera,
  Sparkles
} from "lucide-react";
import AddLeadModal from "@/components/leads/AddLeadModal";
import HelpSupportModal from "@/components/common/HelpSupportModal";
import AICopilotDrawer from "@/components/ai/AICopilotDrawer";
import { api } from "@/lib/api";
import { useTheme } from "@/context/ThemeContext";

interface HeaderProps {
  title?: string;
}

export default function Header({ title }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddLead, setShowAddLead] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showAiCopilot, setShowAiCopilot] = useState(false);
  const [activeItem, setActiveItem] = useState("User Activity");
  const [isSidebarHidden, setIsSidebarHidden] = useState(false);

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeRole, setActiveRole] = useState<string>("ADMIN");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsSidebarHidden(localStorage.getItem("zigmaa_sidebar_hidden") === "true");
      setActiveRole(api.getActiveRole());

      const handleSidebarChange = (e: any) => {
        setIsSidebarHidden(Boolean(e.detail?.hidden));
      };
      window.addEventListener("zigmaa_sidebar_toggle", handleSidebarChange);

      const handleRoleChange = () => {
        setActiveRole(api.getActiveRole());
      };
      window.addEventListener("zigmaa_role_changed", handleRoleChange);

      // Load logged-in user details
      const loadUser = () => {
        const user = api.getCurrentUser();
        if (user) {
          setCurrentUser(user);
        }
      };

      loadUser();
      window.addEventListener("zigmaa_user_updated", loadUser);
      window.addEventListener("storage", loadUser);

      return () => {
        window.removeEventListener("zigmaa_sidebar_toggle", handleSidebarChange);
        window.removeEventListener("zigmaa_role_changed", handleRoleChange);
        window.removeEventListener("zigmaa_user_updated", loadUser);
        window.removeEventListener("storage", loadUser);
      };
    }
  }, []);

  const switchRole = (newRole: "ADMIN" | "SALES_REP") => {
    setActiveRole(newRole);
    api.setActiveRole(newRole);
    window.location.reload();
  };

  const getInitials = (name?: string, email?: string) => {
    if (name && name.trim()) {
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return parts[0].slice(0, 2).toUpperCase();
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return "U";
  };

  const getPageTitle = () => {
    if (title) return title;
    if (!pathname || pathname === "/") return "Dashboard";
    if (pathname.startsWith("/leads")) return "Leads";
    if (pathname.startsWith("/contacts")) return "Contacts";
    if (pathname.startsWith("/deals") || pathname.startsWith("/pipeline")) return "Deals";
    if (pathname.startsWith("/tasks")) return "Tasks";
    if (pathname.startsWith("/events") || pathname.startsWith("/calendar")) return "Calendar & Meetings";
    if (pathname.startsWith("/automations")) return "Automations";
    if (pathname.startsWith("/settings")) return "Settings";
    const seg = pathname.replace("/", "").split("/")[0];
    return seg.charAt(0).toUpperCase() + seg.slice(1);
  };

  const pageTitle = getPageTitle();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/contacts?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleLogout = () => {
    api.logout();
    setShowProfileMenu(false);
    router.replace("/login");
  };

  const menuItems = [
    { label: "Profile", href: "/settings", icon: User },
    { label: "Manage Users & Roles", href: "/settings", icon: UserPlus },
    { label: "Settings", href: "/settings", icon: Settings },
    { label: "User Activity", href: "/events", icon: Activity },
    { label: "Privacy Policy", href: "/privacy-policy", icon: ShieldCheck },
    { label: "Help", href: "/settings", icon: HelpCircle }
  ];

  return (
    <>
      <header
        className={`h-16 bg-white border-b border-slate-200/90 flex items-center justify-between z-20 shrink-0 select-none shadow-xs transition-all ${
          isSidebarHidden ? "pl-16 pr-6" : "px-6"
        }`}
      >
        {/* Left: Page Title */}
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{pageTitle}</h1>
        </div>

        {/* Right Controls: Search Bar, Badges & Profile */}
        <div className="flex items-center gap-3">
          {/* Search Bar moved to Right Side */}
          <form onSubmit={handleSearchSubmit} className="relative w-56 sm:w-64 lg:w-72">
            <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search records..."
              className="w-full bg-slate-50 text-slate-900 text-sm pl-10 pr-4 py-2 rounded-full border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white placeholder:text-slate-400 font-medium transition-all"
            />
          </form>

          {/* AI Copilot Doubt Clearance Button */}
          <button
            onClick={() => setShowAiCopilot(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-red-600 via-rose-600 to-red-500 text-white rounded-full text-xs font-semibold shadow-xs hover:shadow-md hover:brightness-105 active:scale-95 transition-all cursor-pointer border border-red-500/20"
            title="Ask AI Assistant - Clear Doubts & Explore CRM Features"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-200 animate-pulse" />
            <span className="hidden sm:inline">Ask AI Copilot</span>
            <span className="sm:hidden">AI</span>
          </button>

          {/* Utility Action Icons */}
          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 px-1 py-1">
            {/* Dark & Light Mode Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-amber-300 dark:hover:bg-slate-800 transition-all cursor-pointer flex items-center justify-center group"
              title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
              aria-label="Toggle dark and light mode"
            >
              {theme === "dark" ? (
                <Sun className="w-4.5 h-4.5 text-amber-400 group-hover:rotate-45 transition-transform" />
              ) : (
                <Moon className="w-4.5 h-4.5 text-slate-600 group-hover:text-slate-900 transition-colors" />
              )}
            </button>

            {/* Notifications Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-1.5 rounded-lg hover:bg-slate-100 hover:text-slate-900 transition-colors relative cursor-pointer"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-600" />
              </button>

              {showNotifications && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowNotifications(false)}
                  />
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 p-3 z-50">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <span className="font-bold text-xs text-slate-900">Notifications</span>
                      <span className="text-[10px] text-red-600 font-semibold cursor-pointer">Mark read</span>
                    </div>
                    <div className="py-3 text-center text-xs text-slate-500">
                      No unread notifications.
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Quick Role Simulation Switcher in Navbar */}
          <div className="hidden sm:flex items-center bg-slate-100/90 border border-slate-200/90 p-0.5 rounded-xl shadow-xs">
            <button
              type="button"
              onClick={() => switchRole("ADMIN")}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeRole === "ADMIN"
                  ? "bg-white text-red-600 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              title="View full organization pipeline and records"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Admin</span>
            </button>
            <button
              type="button"
              onClick={() => switchRole("SALES_REP")}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeRole === "SALES_REP"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              title="View restricted to assigned rep leads and pipeline"
            >
              <User className="w-3.5 h-3.5" />
              <span>Sales Rep</span>
            </button>
          </div>

          {/* User Profile Avatar with Exact Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 text-white font-bold flex items-center justify-center text-xs shadow-xs border border-amber-300/80 shrink-0 cursor-pointer hover:ring-2 hover:ring-red-500/40 transition-all overflow-hidden"
              title={currentUser?.full_name || currentUser?.email || "User Profile"}
            >
              {currentUser?.picture ? (
                <img
                  src={currentUser.picture}
                  alt={currentUser?.full_name || "Profile"}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <span className="text-[11px] font-bold text-white">
                  {getInitials(currentUser?.full_name, currentUser?.email)}
                </span>
              )}
            </button>

            {showProfileMenu && (
              <>
                {/* Backdrop to close on click outside */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowProfileMenu(false)}
                />

                {/* Popover Card */}
                <div className="absolute right-0 mt-2 w-68 bg-white rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.12)] border border-slate-100 z-50 text-xs overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                  {/* Top Avatar & Name Section */}
                  <div className="pt-6 pb-3 flex flex-col items-center px-4">
                    {/* Interactive Profile Avatar with hover change overlay */}
                    {/* Avatar Display */}
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-600 to-rose-600 text-white font-bold text-2xl flex items-center justify-center shadow-md select-none overflow-hidden border-2 border-white ring-2 ring-red-100">
                      {currentUser?.picture ? (
                        <img
                          src={currentUser.picture}
                          alt={currentUser?.full_name || "Profile"}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      ) : (
                        <span className="text-xl font-bold tracking-tight text-white drop-shadow-xs">
                          {getInitials(currentUser?.full_name, currentUser?.email)}
                        </span>
                      )}
                    </div>

                    <h3 className="mt-2 text-sm font-bold text-slate-800 tracking-tight select-none text-center">
                      {currentUser?.full_name || "CRM Administrator"}
                    </h3>
                    {currentUser?.email && (
                      <p className="text-[11px] text-slate-400 font-normal truncate max-w-[210px] mt-0.5 text-center">
                        {currentUser.email}
                      </p>
                    )}
                  </div>

                  <div className="h-px bg-slate-100 mx-3 my-1" />

                  {/* Role Simulation Section */}
                  <div className="mx-3 my-2 p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Role Simulation
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          activeRole === "ADMIN"
                            ? "bg-red-100 text-red-700"
                            : "bg-slate-200 text-slate-800"
                        }`}
                      >
                        {activeRole === "ADMIN" ? "Admin Mode" : "Sales Rep Mode"}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 p-0.5 bg-slate-200/60 rounded-lg">
                      <button
                        type="button"
                        onClick={() => switchRole("ADMIN")}
                        className={`py-1.5 px-2 rounded-md font-semibold text-[11px] transition-all cursor-pointer flex items-center justify-center gap-1 ${
                          activeRole === "ADMIN"
                            ? "bg-white text-red-600 shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        <ShieldCheck className="w-3 h-3" />
                        <span>Admin</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => switchRole("SALES_REP")}
                        className={`py-1.5 px-2 rounded-md font-semibold text-[11px] transition-all cursor-pointer flex items-center justify-center gap-1 ${
                          activeRole === "SALES_REP"
                            ? "bg-white text-slate-900 shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        <User className="w-3 h-3" />
                        <span>Sales Rep</span>
                      </button>
                    </div>
                  </div>

                  {/* Menu Items List */}
                  <div className="p-2 space-y-0.5">
                    {menuItems.map((item) => {
                      const Icon = item.icon;
                      const isHighlighted = activeItem === item.label;

                      if (item.label === "Help") {
                        return (
                          <button
                            key={item.label}
                            type="button"
                            onClick={() => {
                              setShowProfileMenu(false);
                              setShowHelpModal(true);
                            }}
                            onMouseEnter={() => setActiveItem(item.label)}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer text-left ${
                              isHighlighted
                                ? "bg-red-50 text-red-600 font-semibold"
                                : "text-slate-700 hover:bg-red-50 hover:text-red-600 font-medium"
                            }`}
                          >
                            <Icon
                              className={`w-4 h-4 shrink-0 ${
                                isHighlighted ? "text-red-600" : "text-slate-500"
                              }`}
                            />
                            <span className="truncate">{item.label} & Support</span>
                          </button>
                        );
                      }

                      return (
                        <Link
                          key={item.label}
                          href={item.href}
                          onClick={() => {
                            setActiveItem(item.label);
                            setShowProfileMenu(false);
                          }}
                          onMouseEnter={() => setActiveItem(item.label)}
                          className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer ${
                            isHighlighted
                              ? "bg-red-50 text-red-600 font-semibold"
                              : "text-slate-700 hover:bg-red-50 hover:text-red-600 font-medium"
                          }`}
                        >
                          <Icon
                            className={`w-4 h-4 shrink-0 ${
                              isHighlighted ? "text-red-600" : "text-slate-500"
                            }`}
                          />
                          <span className="truncate">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>

                  {/* Slider/Separator Track */}
                  <div className="px-3.5 py-1.5 flex items-center justify-between gap-2 text-slate-400 select-none">
                    <div className="w-0 h-0 border-y-[4px] border-y-transparent border-r-[5px] border-r-slate-400" />
                    <div className="flex-1 h-1.5 bg-slate-300 rounded-full" />
                    <div className="w-0 h-0 border-y-[4px] border-y-transparent border-l-[5px] border-l-slate-400" />
                  </div>

                  {/* Logout Row */}
                  <div className="p-2 pt-1 border-t border-slate-100">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-3 py-2 text-[#EF4444] hover:bg-rose-50 rounded-xl font-semibold text-xs transition-colors cursor-pointer text-left"
                    >
                      <LogOut className="w-4 h-4 shrink-0 text-[#EF4444]" />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {showAddLead && <AddLeadModal isOpen={showAddLead} onClose={() => setShowAddLead(false)} />}
      <HelpSupportModal isOpen={showHelpModal} onClose={() => setShowHelpModal(false)} />
      <AICopilotDrawer isOpen={showAiCopilot} onClose={() => setShowAiCopilot(false)} />
    </>
  );
}
