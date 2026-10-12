"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  BookUser,
  User,
  Handshake,
  CalendarDays,
  ListTodo,
  Bot,
  Settings,
  ChevronLeft,
  ArrowLeftToLine,
  Maximize2,
  PanelLeftOpen
} from "lucide-react";
import { cn } from "@/lib/utils";

// Persistent module-level state so that client-side SPA navigations
// retain the open/closed state instantly without flicker.
let hasMountedEver = false;
let globalExpanded = true;
let globalHidden = false;

export default function Sidebar() {
  const pathname = usePathname();
  // Safe initial state: on first page load & hydration, mounted is false so server & client match 100%.
  // On subsequent client-side SPA navigations, mounted starts true immediately.
  const [mounted, setMounted] = useState(hasMountedEver);
  const [expanded, setExpanded] = useState(() => (hasMountedEver ? globalExpanded : true));
  const [hidden, setHidden] = useState(() => (hasMountedEver ? globalHidden : false));
  // Only apply CSS transitions when user explicitly clicks the toggle button, not on page changes
  const [hasInteracted, setHasInteracted] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<{ name: string; top: number; icon: any } | null>(null);

  useEffect(() => {
    hasMountedEver = true;
    setMounted(true);
    try {
      const savedState = localStorage.getItem("zigmaa_sidebar_expanded");
      if (savedState !== null) {
        const isExp = savedState === "true";
        globalExpanded = isExp;
        setExpanded(isExp);
      }
      const savedHidden = localStorage.getItem("zigmaa_sidebar_hidden");
      if (savedHidden !== null) {
        const isHid = savedHidden === "true";
        globalHidden = isHid;
        setHidden(isHid);
      }
    } catch {
      // Ignore localStorage access restrictions
    }
  }, []);

  const handleCollapse = () => {
    setHasInteracted(true);
    setExpanded(false);
    setHidden(false);
    globalExpanded = false;
    globalHidden = false;
    if (typeof window !== "undefined") {
      localStorage.setItem("zigmaa_sidebar_expanded", "false");
      localStorage.setItem("zigmaa_sidebar_hidden", "false");
      window.dispatchEvent(new CustomEvent("zigmaa_sidebar_toggle", { detail: { hidden: false, expanded: false } }));
    }
  };

  const handleHide = () => {
    setHasInteracted(true);
    setHidden(true);
    globalHidden = true;
    if (typeof window !== "undefined") {
      localStorage.setItem("zigmaa_sidebar_hidden", "true");
      window.dispatchEvent(new CustomEvent("zigmaa_sidebar_toggle", { detail: { hidden: true, expanded } }));
    }
  };

  const handleShow = () => {
    setHasInteracted(true);
    setHidden(false);
    setExpanded(true);
    globalHidden = false;
    globalExpanded = true;
    if (typeof window !== "undefined") {
      localStorage.setItem("zigmaa_sidebar_hidden", "false");
      localStorage.setItem("zigmaa_sidebar_expanded", "true");
      window.dispatchEvent(new CustomEvent("zigmaa_sidebar_toggle", { detail: { hidden: false, expanded: true } }));
    }
  };

  const handleExpand = () => {
    setHasInteracted(true);
    setExpanded(true);
    setHidden(false);
    globalExpanded = true;
    globalHidden = false;
    if (typeof window !== "undefined") {
      localStorage.setItem("zigmaa_sidebar_expanded", "true");
      localStorage.setItem("zigmaa_sidebar_hidden", "false");
      window.dispatchEvent(new CustomEvent("zigmaa_sidebar_toggle", { detail: { hidden: false, expanded: true } }));
    }
  };

  const toggleExpand = () => {
    if (!expanded) {
      handleExpand();
    } else {
      handleCollapse();
    }
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>, name: string, icon: any) => {
    if (expanded) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setHoveredItem({
      name,
      top: rect.top + rect.height / 2,
      icon
    });
  };

  const currentPath = pathname || "";

  const navSections = [
    {
      title: "OVERVIEW",
      items: [{ name: "Dashboard", href: "/", icon: LayoutDashboard }]
    },
    {
      title: "SALES",
      items: [
        { name: "Leads", href: "/leads", icon: BookUser },
        { name: "Contacts", href: "/contacts", icon: User },
        { name: "Deals", href: "/pipeline", icon: Handshake }
      ]
    },
    {
      title: "ACTIVITIES",
      items: [
        { name: "Calendar & Schedule", href: "/events", icon: CalendarDays },
        { name: "Tasks", href: "/tasks", icon: ListTodo }
      ]
    },
    {
      title: "AUTOMATIONS",
      items: [
        { name: "Automations", href: "/automations", icon: Bot }
      ]
    },
    {
      title: "SETTINGS",
      items: [{ name: "Settings", href: "/settings", icon: Settings }]
    }
  ];

  if (!mounted) {
    return (
      <aside className="bg-[#141029] text-slate-300 flex flex-col border-r border-[#241f47] shadow-2xl z-40 shrink-0 select-none h-screen relative w-60">
        <div className="h-16 flex items-center justify-between px-3 border-b border-[#241f47] bg-[#141029]">
          <div className="flex items-center gap-2.5 w-full p-1">
            <div className="h-9 w-9 rounded-xl bg-purple-500/10 border border-purple-400/20 p-1 flex items-center justify-center shrink-0">
              <img
                src="/crmlogo.png"
                alt="Zigmaa Logo"
                className="h-full w-full object-contain"
              />
            </div>
            <div className="flex-1 flex items-center justify-between min-w-0 pr-1">
              <span className="font-bold text-sm text-white truncate tracking-tight">
                Default
              </span>
            </div>
          </div>
        </div>
        <div className="flex-1 p-3 space-y-4" />
      </aside>
    );
  }

  return (
    <>
      {/* Floating Trigger to Show Sidebar when Hidden (Image 3) */}
      {hidden && (
        <button
          onClick={handleShow}
          className="fixed top-3 left-4 z-50 p-2.5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-purple-300 text-slate-700 hover:text-[#6941C6] rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center group"
          title="Show sidebar"
        >
          <PanelLeftOpen className="w-4.5 h-4.5 text-slate-600 group-hover:text-[#6941C6]" />
        </button>
      )}

      <aside
        suppressHydrationWarning
        className={cn(
          "bg-[#141029] text-slate-300 flex flex-col border-r border-[#241f47] shadow-2xl z-40 shrink-0 select-none h-screen relative",
          hasInteracted && "transition-[width] duration-300 ease-in-out",
          hidden ? "w-0 p-0 border-none overflow-hidden" : expanded ? "w-60" : "w-16"
        )}
        onMouseLeave={() => setHoveredItem(null)}
      >
        {/* Top Header Row with Logo & Workspace Name */}
        <div className="h-16 flex items-center justify-between px-3 border-b border-[#241f47] bg-[#141029]">
          <button
            onClick={toggleExpand}
            className="flex items-center gap-2.5 w-full p-1 rounded-xl hover:bg-white/10 transition-colors group text-left cursor-pointer"
            title={expanded ? "Click to collapse sidebar" : "Click to expand sidebar"}
          >
            <div className="h-9 w-9 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-400/20 p-1 flex items-center justify-center shadow-md shadow-purple-950/60 shrink-0 group-hover:scale-110 transition-all">
              <img
                src="/crmlogo.png"
                alt="Zigmaa Logo"
                className="h-full w-full object-contain drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]"
              />
            </div>
            {expanded && (
              <div className="flex-1 flex items-center justify-between min-w-0 pr-1">
                <span className="font-bold text-sm text-white truncate tracking-tight">
                  Default
                </span>
                <div className="p-1 rounded-lg bg-white/5 text-slate-400 group-hover:text-white">
                  <ChevronLeft className="w-3.5 h-3.5" />
                </div>
              </div>
            )}
          </button>
        </div>

        {/* Navigation Menu with Section Titles */}
        <nav
          className="flex-1 py-3 px-2.5 space-y-4 overflow-y-auto no-scrollbar flex flex-col [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {navSections.map((section) => (
            <div key={section.title} className="space-y-1">
              {/* Section Header Title (Visible only when expanded) */}
              {expanded ? (
                <div className="px-3 pt-2 pb-1 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                  {section.title}
                </div>
              ) : (
                <div className="h-1 my-1 border-t border-[#241f47]" />
              )}

              {/* Section Items */}
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.href === "/"
                    ? currentPath === "/"
                    : currentPath.startsWith(item.href) ||
                      (item.href === "/pipeline" && currentPath.startsWith("/deals"));

                return (
                  <div
                    key={item.name}
                    className="relative group w-full flex justify-center"
                    onMouseEnter={(e) => handleMouseEnter(e, item.name, item.icon)}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    <Link
                      href={item.href}
                      className={cn(
                        "rounded-xl transition-colors relative flex items-center font-semibold text-xs",
                        expanded
                          ? "w-full px-3.5 py-2.5 justify-start gap-3"
                          : "w-11 h-11 justify-center p-2.5",
                        isActive
                          ? "bg-[#6941C6] text-white shadow-lg shadow-purple-950/80 font-bold"
                          : "text-slate-300 hover:text-white hover:bg-white/10"
                      )}
                    >
                      {/* Active Left Glowing Strip Indicator */}
                      {isActive && (
                        <span className="absolute -left-2.5 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-purple-400 rounded-r-full shadow-glow" />
                      )}

                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0 transition-transform group-hover:scale-105",
                          isActive ? "text-white" : "text-slate-400 group-hover:text-white"
                        )}
                      />
                      {expanded && <span className="truncate text-xs font-semibold">{item.name}</span>}
                    </Link>
                  </div>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Bottom Actions Section */}
        <div className="p-2.5 border-t border-[#241f47] w-full flex justify-center">
          {expanded ? (
            /* Expanded Mode: Collapse & Hide Controls (Image 1) */
            <div className="w-full bg-[#1c173b]/90 border border-slate-700/60 rounded-xl p-1 flex items-center justify-between text-xs">
              <button
                onClick={handleCollapse}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors font-medium cursor-pointer"
                title="Collapse sidebar"
              >
                <ArrowLeftToLine className="w-3.5 h-3.5 text-slate-400" />
                <span>Collapse</span>
              </button>
              <div className="w-px h-4 bg-slate-700/60" />
              <button
                onClick={handleHide}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors font-medium cursor-pointer"
                title="Hide sidebar"
              >
                <Maximize2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Hide</span>
              </button>
            </div>
          ) : (
            /* Collapsed Mode: Show pill button (Image 2) */
            <button
              onClick={handleExpand}
              className="w-full py-1.5 px-1 flex items-center justify-center gap-1.5 rounded-xl bg-purple-950/50 border border-purple-500/40 text-[#c4b5fd] hover:text-white hover:bg-purple-900/60 transition-all font-semibold text-xs cursor-pointer shadow-xs"
              title="Expand sidebar"
            >
              <PanelLeftOpen className="w-3.5 h-3.5 text-purple-400" />
              <span>Show</span>
            </button>
          )}
        </div>

      {/* Dynamic Fixed Flyout Tooltip (Renders cleanly outside nav overflow clipping) */}
      {!expanded && hoveredItem && (
        <div
          className="fixed left-20 -translate-y-1/2 px-3.5 py-2 bg-[#1c173b] text-white text-xs font-bold rounded-xl shadow-2xl border border-[#39316b] z-50 flex items-center gap-2.5 whitespace-nowrap pointer-events-none transition-all duration-150 animate-in fade-in zoom-in-95"
          style={{ top: `${hoveredItem.top}px` }}
        >
          <hoveredItem.icon className="w-4 h-4 text-[#a885ff]" />
          <span>{hoveredItem.name}</span>
        </div>
      )}
    </aside>
  </>
  );
}
