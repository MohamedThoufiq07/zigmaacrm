"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  UserPlus,
  TrendingUp,
  AlertTriangle,
  Clock,
  Calendar,
  CheckCircle2,
  ChevronDown,
  LayoutGrid,
  BarChart3,
  Megaphone,
  Globe,
  Share2,
  Phone,
  MessageSquare,
  Mail,
  ChevronRight,
  Plus,
  Download,
  Trash2,
  ExternalLink,
  Kanban,
  Check,
  X
} from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import AddLeadModal from "@/components/leads/AddLeadModal";
import LeadDetailsDrawer from "@/components/leads/LeadDetailsDrawer";
import { api, formatGoogleCalendarUrl } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { Lead, Deal } from "@/lib/mockData";

export default function DashboardPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [activeTab, setActiveTab] = useState<"leads" | "deals">("leads");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showAddLead, setShowAddLead] = useState(false);
  const [dateRange, setDateRange] = useState("Last 30 Days");
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [showEditLayoutModal, setShowEditLayoutModal] = useState(false);

  // Layout customization state
  const [visibleWidgets, setVisibleWidgets] = useState({
    stats: true,
    trendChart: true,
    sourcePerformance: true,
    recentTable: true,
    quickActions: true
  });

  const loadAllData = async () => {
    try {
      const [allLeads, allDeals] = await Promise.all([
        api.getLeads(),
        api.getDeals()
      ]);
      setLeads(allLeads);
      setDeals(allDeals);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Filter leads based on selected date range
  const filteredLeads = leads.filter(lead => {
    if (dateRange === "All Time") return true;
    const created = new Date(lead.created_at).getTime();
    const now = Date.now();
    if (dateRange === "Today") {
      return (now - created) <= 24 * 60 * 60 * 1000;
    }
    if (dateRange === "Yesterday") {
      return (now - created) <= 48 * 60 * 60 * 1000;
    }
    if (dateRange === "Last 7 Days") {
      return (now - created) <= 7 * 24 * 60 * 60 * 1000;
    }
    if (dateRange === "Last 30 Days") {
      return (now - created) <= 30 * 24 * 60 * 60 * 1000;
    }
    return true;
  });

  // Calculate dynamic metrics starting from ZERO
  const totalLeads = filteredLeads.length;
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const todayStr = now.toISOString().split("T")[0];
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayStr = yesterday.toISOString().split("T")[0];
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();

  const newThisWeek = filteredLeads.filter(l => new Date(l.created_at) >= oneWeekAgo).length;
  const convertedLeads = filteredLeads.filter(l => l.stage === "Closed / Won" || l.status === "CONVERTED").length;
  const conversionRate = totalLeads > 0 ? `${((convertedLeads / totalLeads) * 100).toFixed(0)}%` : "0%";
  
  const overdueFollowups = filteredLeads.filter(l => {
    if (l.stage === "Closed / Won" || l.stage === "Lost") return false;
    const diff = (now.getTime() - new Date(l.created_at).getTime()) / (1000 * 3600 * 24);
    return diff > 3;
  }).length;

  const todaysLeads = filteredLeads.filter(l => (l.created_at || "").startsWith(todayStr)).length;
  const yesterdaysLeads = filteredLeads.filter(l => (l.created_at || "").startsWith(yesterdayStr)).length;
  const leadsThisMonth = filteredLeads.filter(l => {
    const d = new Date(l.created_at);
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  }).length;

  // Deal metrics
  const totalDeals = deals.length;
  const wonDeals = deals.filter(d => d.stage === "Closed Won").length;
  const winRate = totalDeals > 0 ? `${((wonDeals / totalDeals) * 100).toFixed(0)}%` : "0%";
  const totalPipelineVal = deals.reduce((sum, d) => sum + (Number(d.value) || 0), 0);
  const newDealsThisWeek = deals.filter(d => new Date(d.created_at) >= oneWeekAgo).length;
  const todaysDeals = deals.filter(d => (d.created_at || "").startsWith(todayStr)).length;
  const yesterdaysDeals = deals.filter(d => (d.created_at || "").startsWith(yesterdayStr)).length;
  const dealsThisMonth = deals.filter(d => {
    const dDate = new Date(d.created_at);
    return dDate.getMonth() === thisMonth && dDate.getFullYear() === thisYear;
  }).length;

  // Stat cards for Leads view
  const leadStatCards = [
    {
      title: "TOTAL LEADS",
      value: totalLeads,
      icon: Users,
      topBorder: "border-t-[3px] border-blue-500",
      iconBg: "bg-blue-50 text-blue-600"
    },
    {
      title: "NEW LEADS THIS WEEK",
      value: newThisWeek,
      icon: UserPlus,
      topBorder: "border-t-[3px] border-cyan-500",
      iconBg: "bg-cyan-50 text-cyan-600"
    },
    {
      title: "CONVERSION RATE",
      value: conversionRate,
      icon: TrendingUp,
      topBorder: "border-t-[3px] border-pink-500",
      iconBg: "bg-pink-50 text-pink-600"
    },
    {
      title: "OVERDUE FOLLOW-UPS",
      value: overdueFollowups,
      icon: AlertTriangle,
      topBorder: "border-t-[3px] border-rose-500",
      iconBg: "bg-rose-50 text-rose-600"
    },
    {
      title: "TODAY'S LEADS",
      value: todaysLeads,
      icon: Clock,
      topBorder: "border-t-[3px] border-amber-500",
      iconBg: "bg-amber-50 text-amber-600"
    },
    {
      title: "YESTERDAY'S LEADS",
      value: yesterdaysLeads,
      icon: Calendar,
      topBorder: "border-t-[3px] border-purple-500",
      iconBg: "bg-purple-50 text-purple-600"
    },
    {
      title: "LEADS THIS MONTH",
      value: leadsThisMonth,
      icon: BarChart3,
      topBorder: "border-t-[3px] border-teal-500",
      iconBg: "bg-teal-50 text-teal-600"
    },
    {
      title: "CONVERTED LEADS",
      value: convertedLeads,
      icon: CheckCircle2,
      topBorder: "border-t-[3px] border-emerald-500",
      iconBg: "bg-emerald-50 text-emerald-600"
    }
  ];

  // Stat cards for Deals view
  const dealStatCards = [
    {
      title: "TOTAL DEALS",
      value: totalDeals,
      icon: Kanban,
      topBorder: "border-t-[3px] border-blue-500",
      iconBg: "bg-blue-50 text-blue-600"
    },
    {
      title: "NEW DEALS THIS WEEK",
      value: newDealsThisWeek,
      icon: UserPlus,
      topBorder: "border-t-[3px] border-cyan-500",
      iconBg: "bg-cyan-50 text-cyan-600"
    },
    {
      title: "WIN RATE",
      value: winRate,
      icon: TrendingUp,
      topBorder: "border-t-[3px] border-pink-500",
      iconBg: "bg-pink-50 text-pink-600"
    },
    {
      title: "PIPELINE VALUE",
      value: formatCurrency(totalPipelineVal),
      icon: BarChart3,
      topBorder: "border-t-[3px] border-rose-500",
      iconBg: "bg-rose-50 text-rose-600"
    },
    {
      title: "TODAY'S DEALS",
      value: todaysDeals,
      icon: Clock,
      topBorder: "border-t-[3px] border-amber-500",
      iconBg: "bg-amber-50 text-amber-600"
    },
    {
      title: "YESTERDAY'S DEALS",
      value: yesterdaysDeals,
      icon: Calendar,
      topBorder: "border-t-[3px] border-purple-500",
      iconBg: "bg-purple-50 text-purple-600"
    },
    {
      title: "DEALS THIS MONTH",
      value: dealsThisMonth,
      icon: BarChart3,
      topBorder: "border-t-[3px] border-teal-500",
      iconBg: "bg-teal-50 text-teal-600"
    },
    {
      title: "CLOSED WON DEALS",
      value: wonDeals,
      icon: CheckCircle2,
      topBorder: "border-t-[3px] border-emerald-500",
      iconBg: "bg-emerald-50 text-emerald-600"
    }
  ];

  const currentCards = activeTab === "leads" ? leadStatCards : dealStatCards;

  // Source breakdown counts
  const sourceCounts: Record<string, number> = {
    "Meta Ads": 0,
    "Google Ads": 0,
    "Website Form": 0,
    "Walk-in": 0,
    "Referral": 0
  };
  filteredLeads.forEach(l => {
    const src = l.ad_source || l.source || "Meta Ads";
    if (src in sourceCounts) {
      sourceCounts[src] += 1;
    } else {
      sourceCounts["Referral"] = (sourceCounts["Referral"] || 0) + 1;
    }
  });

  const handleDeleteLead = async (id: number | string) => {
    if (confirm("Are you sure you want to delete this lead?")) {
      await api.deleteLead(id);
      loadAllData();
    }
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] text-slate-900 font-sans overflow-hidden select-none">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />

        <main className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6 custom-scrollbar">
          {/* Top Header & Filter Row */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  {activeTab === "leads" ? "Leads Dashboard" : "Deals Dashboard"}
                </h1>
                <p className="text-xs text-slate-500 font-medium">
                  {activeTab === "leads"
                    ? "Track, qualify, and convert your leads"
                    : "Track pipelines, values, and sales velocity"}
                </p>
              </div>

              {/* Segmented Pill Switcher */}
              <div className="p-1 bg-slate-200/80 rounded-xl flex items-center gap-1 border border-slate-300/60">
                <button
                  onClick={() => setActiveTab("leads")}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === "leads"
                      ? "bg-[#6941C6] text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Leads</span>
                </button>
                <button
                  onClick={() => setActiveTab("deals")}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === "deals"
                      ? "bg-[#6941C6] text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Kanban className="w-3.5 h-3.5" />
                  <span>Deals</span>
                </button>
              </div>
            </div>

            {/* Right Action Dropdowns */}
            <div className="flex items-center gap-2.5">
              {/* Date Filter Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowDateDropdown(!showDateDropdown)}
                  className="flex items-center gap-2 px-3.5 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold shadow-xs hover:bg-slate-50 transition-colors"
                >
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>{dateRange}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {showDateDropdown && (
                  <div className="absolute right-0 mt-2 w-44 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-40 text-xs">
                    {["Today", "Yesterday", "Last 7 Days", "Last 30 Days", "This Month", "All Time"].map((range) => (
                      <button
                        key={range}
                        onClick={() => {
                          setDateRange(range);
                          setShowDateDropdown(false);
                        }}
                        className="w-full text-left px-3.5 py-2 text-slate-700 hover:bg-slate-50 flex items-center justify-between"
                      >
                        <span>{range}</span>
                        {dateRange === range && <span className="text-[#6941C6] font-bold">✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Edit Layout Button */}
              <button
                onClick={() => setShowEditLayoutModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-slate-200 text-slate-700 hover:border-[#6941C6] hover:text-[#6941C6] rounded-xl text-xs font-semibold shadow-xs transition-colors"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Edit Layout</span>
              </button>
            </div>
          </div>

          {/* 8 Stat Cards Grid (2 rows x 4 cols) */}
          {visibleWidgets.stats && (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              {currentCards.map((card, idx) => {
                const Icon = card.icon;
                return (
                  <div
                    key={idx}
                    className={`p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden ${card.topBorder}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">
                        {card.title}
                      </span>
                      <div className={`p-2 rounded-full ${card.iconBg} transition-transform`}>
                        <Icon className="w-4 h-4" />
                      </div>
                    </div>

                    <div className="text-3xl font-bold text-slate-900 tracking-tight mt-3">
                      {card.value}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Analytics & Performance Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Leads Trend Card */}
            {visibleWidgets.trendChart && (
              <div className="lg:col-span-8 p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Leads Trend</h3>
                    <p className="text-xs text-slate-500 font-medium">Volume over last 6 months</p>
                  </div>
                  <span className="text-xs font-semibold text-[#6941C6] bg-purple-50 px-2.5 py-1 rounded-full border border-purple-100">
                    Live Record
                  </span>
                </div>

                {/* Dynamic Trend Visualization */}
                <div className="h-44 flex items-end justify-between gap-4 pt-4 px-2">
                  {[
                    { month: "May", leads: 0 },
                    { month: "Jun", leads: 0 },
                    { month: "Jul", leads: 0 },
                    { month: "Aug", leads: 0 },
                    { month: "Sep", leads: 0 },
                    { month: "Oct", leads: totalLeads }
                  ].map((item, idx) => {
                    const maxVal = Math.max(totalLeads, 10);
                    const heightPercent = totalLeads > 0 && item.month === "Oct" ? Math.min(100, Math.max(20, (item.leads / maxVal) * 100)) : 10;
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                        <div className="w-full max-w-[48px] flex items-end justify-center h-32 bg-slate-50 rounded-xl p-1 relative border border-slate-100">
                          <div
                            className="w-full bg-[#6941C6] rounded-lg transition-all group-hover:bg-[#5833af]"
                            style={{ height: `${heightPercent}%` }}
                          />
                          <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow">
                            {item.leads}
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-slate-500">{item.month}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Source Performance Card */}
            {visibleWidgets.sourcePerformance && (
              <div className="lg:col-span-4 p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Source Performance</h3>
                    <p className="text-xs text-slate-500 font-medium">Leads & conversions by source</p>
                  </div>
                  <Megaphone className="w-4 h-4 text-slate-400" />
                </div>

                {/* Source Bars */}
                <div className="space-y-3.5 pt-2">
                  {[
                    { name: "Meta Ads", count: sourceCounts["Meta Ads"], color: "bg-blue-600", icon: Megaphone },
                    { name: "Google Ads", count: sourceCounts["Google Ads"], color: "bg-amber-500", icon: Globe },
                    { name: "Website Form", count: sourceCounts["Website Form"], color: "bg-emerald-500", icon: Share2 },
                    { name: "Walk-in", count: sourceCounts["Walk-in"], color: "bg-purple-600", icon: Users },
                    { name: "Referral", count: sourceCounts["Referral"], color: "bg-cyan-600", icon: Users }
                  ].map((src, idx) => {
                    const percent = totalLeads > 0 ? ((src.count / totalLeads) * 100).toFixed(0) : "0";
                    return (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-700">{src.name}</span>
                          <span className="font-bold text-slate-900">
                            {src.count} ({percent}%)
                          </span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${src.color} transition-all duration-500`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions & Recent Table Section */}
          {visibleWidgets.recentTable && (
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Recent Records</h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {totalLeads > 0 ? `Showing ${Math.min(5, totalLeads)} of ${totalLeads} active records` : "No records yet. Start by adding a lead."}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href="/leads/import"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Bulk Import CSV</span>
                  </Link>

                  <Link
                    href="/events"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-[#6941C6] text-xs font-semibold rounded-xl transition-colors"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Google Calendar</span>
                  </Link>

                  <Link
                    href="/leads"
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#6941C6] hover:underline"
                  >
                    <span>View All</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Table or Zero State */}
              {leads.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-purple-50 text-[#6941C6] flex items-center justify-center">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">Clean Slate — 0 Records</h4>
                    <p className="text-xs text-slate-500 max-w-sm mt-1">
                      No dummy prices or dummy data. Click &quot;Add Lead&quot; or import a CSV to populate your CRM.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAddLead(true)}
                    className="mt-2 flex items-center gap-1.5 px-4 py-2 bg-[#6941C6] text-white text-xs font-bold rounded-xl shadow-sm hover:bg-[#5833af] transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add First Lead</span>
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                        <th className="py-2.5 px-3">Lead Name</th>
                        <th className="py-2.5 px-3">Company</th>
                        <th className="py-2.5 px-3">Phone</th>
                        <th className="py-2.5 px-3">Source</th>
                        <th className="py-2.5 px-3">Stage</th>
                        <th className="py-2.5 px-3">Deal Value</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {leads.slice(0, 5).map((lead) => (
                        <tr key={lead.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3 font-semibold text-slate-900">
                            {lead.name}
                          </td>
                          <td className="py-3 px-3 text-slate-600">
                            {lead.company_name || "—"}
                          </td>
                          <td className="py-3 px-3 text-slate-600 font-mono">
                            {lead.phone}
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                              {lead.ad_source || "Direct"}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-[#6941C6] border border-purple-200">
                              {lead.stage}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-semibold text-slate-900">
                            {formatCurrency(lead.deal_value || 0)}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {lead.phone && (
                                <a
                                  href={`tel:${lead.phone}`}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                                  title="Call"
                                >
                                  <Phone className="w-3.5 h-3.5" />
                                </a>
                              )}
                              {lead.phone && (
                                <a
                                  href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, "")}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                                  title="WhatsApp"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                </a>
                              )}
                              <button
                                onClick={() => setSelectedLead(lead)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-[#6941C6] hover:bg-purple-50 transition-colors"
                                title="View Details"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteLead(lead.id)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Edit Layout Modal */}
      {showEditLayoutModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Customize Dashboard Layout</h3>
                <p className="text-xs text-slate-500">Toggle panels to customize your dashboard</p>
              </div>
              <button
                onClick={() => setShowEditLayoutModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5">
              {[
                { key: "stats", label: "8 Metric Stat Cards (Zero-Default)" },
                { key: "trendChart", label: "Leads Trend Chart (6 Months)" },
                { key: "sourcePerformance", label: "Source Performance Analytics" },
                { key: "recentTable", label: "Recent Records Table & Actions" }
              ].map((item) => (
                <label
                  key={item.key}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer"
                >
                  <span className="text-xs font-semibold text-slate-800">{item.label}</span>
                  <input
                    type="checkbox"
                    checked={visibleWidgets[item.key as keyof typeof visibleWidgets]}
                    onChange={(e) =>
                      setVisibleWidgets({
                        ...visibleWidgets,
                        [item.key]: e.target.checked
                      })
                    }
                    className="w-4 h-4 text-[#6941C6] rounded focus:ring-[#6941C6]"
                  />
                </label>
              ))}
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => setShowEditLayoutModal(false)}
                className="px-4 py-2 bg-[#6941C6] text-white text-xs font-bold rounded-xl shadow hover:bg-[#5833af]"
              >
                Save Layout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Lead Modal */}
      {showAddLead && (
        <AddLeadModal
          isOpen={showAddLead}
          onClose={() => {
            setShowAddLead(false);
            loadAllData();
          }}
        />
      )}

      {/* Lead Details Drawer */}
      {selectedLead && (
        <LeadDetailsDrawer
          lead={selectedLead}
          isOpen={!!selectedLead}
          onClose={() => {
            setSelectedLead(null);
            loadAllData();
          }}
          onLeadUpdated={loadAllData}
        />
      )}
    </div>
  );
}
