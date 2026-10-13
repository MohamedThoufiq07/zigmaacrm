"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  Search,
  FolderCog,
  CalendarDays,
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
  Camera
} from "lucide-react";
import AddLeadModal from "@/components/leads/AddLeadModal";
import HelpSupportModal from "@/components/common/HelpSupportModal";
import { api } from "@/lib/api";

interface HeaderProps {
  title?: string;
}

export default function Header({ title }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddLead, setShowAddLead] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [activeItem, setActiveItem] = useState("User Activity");
  const [isSidebarHidden, setIsSidebarHidden] = useState(false);

  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsSidebarHidden(localStorage.getItem("zigmaa_sidebar_hidden") === "true");
      const handleSidebarChange = (e: any) => {
        setIsSidebarHidden(Boolean(e.detail?.hidden));
      };
      window.addEventListener("zigmaa_sidebar_toggle", handleSidebarChange);

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
        window.removeEventListener("zigmaa_user_updated", loadUser);
        window.removeEventListener("storage", loadUser);
      };
    }
  }, []);

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
      router.push(`/leads?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleLogout = () => {
    api.logout();
    setShowProfileMenu(false);
    router.push("/login");
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

          {/* Utility Action Icons */}
          <div className="flex items-center gap-1.5 text-slate-600 px-1 py-1">
            <Link
              href="/leads"
              className="p-1.5 rounded-lg hover:bg-slate-100 hover:text-slate-900 transition-colors"
              title="Workspace Records"
            >
              <FolderCog className="w-4 h-4" />
            </Link>
            <Link
              href="/events"
              className="p-1.5 rounded-lg hover:bg-slate-100 hover:text-slate-900 transition-colors"
              title="Calendar"
            >
              <CalendarDays className="w-4 h-4" />
            </Link>

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
    </>
  );
}
