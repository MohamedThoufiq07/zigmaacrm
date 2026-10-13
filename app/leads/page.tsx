"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  Plus,
  Upload,
  Download,
  Phone,
  Mail,
  MessageSquare,
  Trash2,
  ExternalLink,
  Edit2,
  ChevronLeft,
  ChevronRight,
  Filter,
  SlidersHorizontal,
  RotateCw,
  LayoutGrid,
  Columns3,
  MoreVertical,
  CheckSquare,
  Square,
  ChevronDown,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Calendar,
  Building2,
  GripVertical
} from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import LeadDetailsDrawer from "@/components/leads/LeadDetailsDrawer";
import AddLeadModal from "@/components/leads/AddLeadModal";
import EditLeadModal from "@/components/leads/EditLeadModal";
import FilterSelect from "@/components/common/FilterSelect";
import MoreViewsDropdown from "@/components/common/MoreViewsDropdown";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { Lead } from "@/lib/mockData";
import { useToast } from "@/components/common/ToastProvider";

const LEADS_MORE_VIEWS = [
  "All Leads",
  "Converted Leads",
  "Junk Leads",
  "My Converted Leads",
  "My Leads",
  "Not Qualified Leads",
  "Open Leads",
  "Recently Created Leads",
  "Recently Modified Leads",
  "Today's Leads"
];

const LEAD_SOURCES = [
  "Youtube",
  "WhatsApp",
  "Instagram",
  "Advertisement",
  "Cold Call",
  "Employee Referral",
  "Meta Ads",
  "Google Ads",
  "LinkedIn Ads",
  "Website Inbound"
];

const KANBAN_STAGES = [
  { id: "Attempted to Contact", label: "Attempted to Contact", dot: "bg-blue-500", border: "border-blue-200" },
  { id: "Contact in Future", label: "Contact in Future", dot: "bg-purple-500", border: "border-purple-200" },
  { id: "Contacted", label: "Contacted", dot: "bg-emerald-500", border: "border-emerald-200" },
  { id: "Not Contacted", label: "Not Contacted", dot: "bg-amber-500", border: "border-amber-200" },
  { id: "Pre-Qualified", label: "Pre-Qualified", dot: "bg-sky-500", border: "border-sky-200" },
  { id: "Lost Lead", label: "Lost Lead", dot: "bg-rose-500", border: "border-rose-200" }
];

export default function LeadsPage() {
  const { toast, confirm } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");
  const [activeTab, setActiveTab] = useState<string>("All Leads");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSource, setSelectedSource] = useState("ALL");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [showAddLead, setShowAddLead] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<number | string>>(new Set());

  const fetchLeads = async () => {
    try {
      const data = await api.getLeads({
        search: searchQuery || undefined,
        source: selectedSource !== "ALL" ? selectedSource : undefined
      });
      setLeads(data || []);
    } catch (e) {
      console.error(e);
      toast.error("Fetch Error", "Could not load leads list.");
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [searchQuery, selectedSource]);

  // Tab Filtering
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      if (activeTab === "My Leads") return true;
      if (activeTab === "Open Leads") return lead.stage !== "Closed / Won";
      if (activeTab === "Converted Leads") return lead.stage === "Closed / Won";
      if (activeTab === "Today's Leads") {
        const todayStr = new Date().toISOString().slice(0, 10);
        return (lead.created_at || "").startsWith(todayStr);
      }
      return true;
    });
  }, [leads, activeTab]);

  const handleDeleteLead = async (e: React.MouseEvent, lead: Lead) => {
    e.stopPropagation();
    const confirmed = await confirm({
      title: "Delete Lead",
      message: `Are you sure you want to permanently delete "${lead.name}"? This action cannot be undone.`,
      confirmText: "Delete Lead",
      cancelText: "Keep",
      variant: "danger"
    });

    if (confirmed) {
      try {
        await api.deleteLead(lead.id);
        toast.success("Lead Deleted", `"${lead.name}" was removed from the database.`);
        fetchLeads();
      } catch (err: any) {
        toast.error("Delete Failed", err.message || "Could not delete lead.");
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    const confirmed = await confirm({
      title: `Delete ${count} Leads`,
      message: `Are you sure you want to delete ${count} selected lead(s)? This action cannot be undone.`,
      confirmText: `Delete ${count} Leads`,
      cancelText: "Cancel",
      variant: "danger"
    });

    if (confirmed) {
      try {
        for (const id of Array.from(selectedIds)) {
          await api.deleteLead(id);
        }
        setSelectedIds(new Set());
        toast.success("Bulk Delete Complete", `${count} leads deleted.`);
        fetchLeads();
      } catch {
        toast.error("Bulk Delete Failed", "An error occurred during deletion.");
      }
    }
  };

  const handleStageChange = async (leadId: number | string, newStage: string) => {
    setLeads((prev) =>
      prev.map((l) => (String(l.id) === String(leadId) ? { ...l, stage: newStage as any } : l))
    );
    try {
      await api.updateLeadStage(leadId, newStage);
      toast.info("Stage Updated", `Lead moved to "${newStage}"`);
    } catch (e) {
      console.error(e);
      toast.error("Update Failed", "Could not update lead stage.");
    }
  };

  const handleExportCsv = () => {
    if (leads.length === 0) {
      toast.warning("Export Warning", "No leads available to export.");
      return;
    }
    const headers = ["First Name", "Company", "Mobile Number", "Email", "Source", "Stage", "Deal Value"];
    const rows = leads.map((l) => [
      `"${l.name}"`,
      `"${l.company_name || ""}"`,
      `"${l.phone}"`,
      `"${l.email || ""}"`,
      `"${l.ad_source}"`,
      `"${l.stage}"`,
      l.deal_value || 0
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `zigmaa_leads_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Export Complete", `Exported ${leads.length} leads to CSV.`);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedLeads.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedLeads.map((l) => l.id)));
    }
  };

  const toggleSelectOne = (id: number | string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const totalPages = Math.ceil(filteredLeads.length / pageSize) || 1;
  const paginatedLeads = filteredLeads.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="flex h-screen bg-[#F8FAFC] text-slate-900 font-sans overflow-hidden select-none">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />

        <main className="flex-1 overflow-y-auto p-5 lg:p-7 space-y-5 custom-scrollbar">
          {/* Controls: ONE Straight Row Above Table (Tabs on Left | Actions on Right) */}
          <div className="flex flex-wrap lg:flex-nowrap items-center justify-between gap-3">
            {/* Left: Navigation Tabs + More Views (···) */}
            <div className="flex items-center gap-1.5 text-sm flex-wrap sm:flex-nowrap">
              {["All Leads", "My Leads", "Open Leads", "Converted Leads", "Today's Leads"].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={(e) => {
                    setActiveTab(tab);
                    setCurrentPage(1);
                    e.currentTarget.blur();
                  }}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap text-sm outline-none! focus:outline-none! focus-visible:outline-none! ring-0! focus:ring-0! focus-visible:ring-0! border select-none ${
                    activeTab === tab
                      ? "bg-red-50 text-red-600 font-bold border-red-200/80 shadow-2xs"
                      : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                  style={{ outline: "none", boxShadow: activeTab === tab ? undefined : "none" }}
                >
                  {tab}
                </button>
              ))}

              {/* More Views Dropdown (···) */}
              <MoreViewsDropdown
                views={LEADS_MORE_VIEWS}
                activeView={activeTab}
                onSelect={(view) => {
                  setActiveTab(view);
                  setCurrentPage(1);
                }}
              />

              {/* Bulk Actions Indicator */}
              {selectedIds.size > 0 && (
                <div className="flex items-center gap-2 ml-2 px-3 py-1 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-bold animate-in fade-in duration-100">
                  <span>{selectedIds.size} selected</span>
                  <button
                    onClick={handleBulkDelete}
                    className="p-1 hover:bg-red-100 rounded text-red-600 transition-colors cursor-pointer"
                    title="Delete Selected Leads"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Right Actions: [Lead Source ▾] [Add Lead ▾] [Export] [ ⊞ | ▥ ] */}
            <div className="flex items-center gap-2.5 shrink-0">
              {/* Custom Lead Source Dropdown */}
              <FilterSelect
                placeholder="Lead Source"
                value={selectedSource}
                options={LEAD_SOURCES}
                onChange={(val) => {
                  setSelectedSource(val);
                  setCurrentPage(1);
                }}
              />

              {/* Add Lead with Split Dropdown */}
              <div className="relative">
                <div className="inline-flex rounded-xl shadow-xs">
                  <button
                    onClick={() => setShowAddLead(true)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-sm font-semibold rounded-l-xl transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Add Lead</span>
                  </button>
                  <button
                    onClick={() => setShowAddMenu(!showAddMenu)}
                    className="px-2.5 py-2 bg-red-700 hover:bg-red-800 text-white text-sm rounded-r-xl transition-all cursor-pointer border-l border-red-500/30"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>

                {showAddMenu && (
                  <div className="absolute right-0 mt-1.5 w-48 bg-white border border-slate-200 rounded-xl shadow-lg p-1.5 z-30 text-sm space-y-0.5 animate-in fade-in zoom-in-95 duration-100">
                    <button
                      onClick={() => {
                        setShowAddLead(true);
                        setShowAddMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-red-50 text-slate-700 hover:text-red-600 rounded-lg font-medium flex items-center gap-2 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Create Single Lead</span>
                    </button>
                    <Link
                      href="/leads/import"
                      className="w-full text-left px-3 py-2 hover:bg-red-50 text-slate-700 hover:text-red-600 rounded-lg font-medium flex items-center gap-2 cursor-pointer"
                    >
                      <Upload className="w-4 h-4 text-red-600" />
                      <span>Bulk CSV Import</span>
                    </Link>
                  </div>
                )}
              </div>

              {/* Export Button */}
              <button
                onClick={handleExportCsv}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-sm font-semibold shadow-2xs transition-colors cursor-pointer"
              >
                Export
              </button>

              {/* View Toggle: [ ⊞ Table | ▥ Kanban ] */}
              <div className="flex items-center bg-slate-100/90 border border-slate-200 p-0.5 rounded-xl shadow-2xs">
                <button
                  onClick={() => setViewMode("table")}
                  title="Table View"
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    viewMode === "table"
                      ? "bg-white text-red-600 shadow-2xs font-bold"
                      : "text-slate-400 hover:text-slate-700"
                  }`}
                >
                  <LayoutGrid className="w-4.5 h-4.5" />
                </button>
                <button
                  onClick={() => setViewMode("kanban")}
                  title="Kanban Board View"
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    viewMode === "kanban"
                      ? "bg-white text-red-600 shadow-2xs font-bold"
                      : "text-slate-400 hover:text-slate-700"
                  }`}
                >
                  <Columns3 className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>
          </div>

          {/* VIEW 1: TABLE VIEW */}
          {viewMode === "table" && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
              <div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200/80 text-sm font-semibold text-slate-800">
                        <th className="py-3.5 px-3 w-12 text-center border-r border-slate-200/80">
                          <div className="flex items-center justify-center">
                            <button
                              onClick={toggleSelectAll}
                              className="flex items-center justify-center cursor-pointer text-slate-400 hover:text-slate-600 transition-colors"
                            >
                              {selectedIds.size > 0 && selectedIds.size === paginatedLeads.length ? (
                                <CheckSquare className="w-4 h-4 text-red-600" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </th>
                        <th className="px-4 py-3.5 border-r border-slate-200/80">
                          <span>Activities</span>
                        </th>
                        <th className="px-4 py-3.5 border-r border-slate-200/80">
                          <span>Leads Owner</span>
                        </th>
                        <th className="px-4 py-3.5 border-r border-slate-200/80">
                          <span>First Name</span>
                        </th>
                        <th className="px-4 py-3.5 border-r border-slate-200/80">
                          <span>Mobile Number</span>
                        </th>
                        <th className="px-4 py-3.5 border-r border-slate-200/80">
                          <span>Company</span>
                        </th>
                        <th className="px-4 py-3.5 border-r border-slate-200/80">
                          <span>Stage</span>
                        </th>
                        <th className="px-4 py-3.5 text-right border-r border-slate-200/80">
                          <span>Amount</span>
                        </th>
                        <th className="px-4 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 text-slate-700 font-medium text-sm">
                      {paginatedLeads.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-24 text-center">
                            <div className="max-w-md mx-auto space-y-1.5">
                              <p className="text-base font-bold text-slate-900">No leads yet</p>
                              <p className="text-sm text-slate-500">Leads you add or import will show up here.</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        paginatedLeads.map((lead) => {
                          const isSelected = selectedIds.has(lead.id);

                          return (
                            <tr
                              key={lead.id}
                              onClick={() => setSelectedLead(lead)}
                              className={`hover:bg-slate-50/80 transition-colors cursor-pointer group ${
                                isSelected ? "bg-red-50/40" : ""
                              }`}
                            >
                              <td
                                className="py-3 px-3 text-center"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleSelectOne(lead.id);
                                }}
                              >
                                <div className="flex items-center justify-center">
                                  {isSelected ? (
                                    <CheckSquare className="w-4 h-4 text-red-600" />
                                  ) : (
                                    <Square className="w-4 h-4 text-slate-300 group-hover:text-slate-400" />
                                  )}
                                </div>
                              </td>

                              {/* Activities Quick Icons */}
                              <td className="p-3" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center gap-1.5">
                                  {lead.phone && (
                                    <a
                                      href={`tel:${lead.phone}`}
                                      className="p-1 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
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
                                      className="p-1 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                                      title="WhatsApp"
                                    >
                                      <MessageSquare className="w-3.5 h-3.5" />
                                    </a>
                                  )}
                                  {lead.email && (
                                    <a
                                      href={`mailto:${lead.email}`}
                                      className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                      title="Email"
                                    >
                                      <Mail className="w-3.5 h-3.5" />
                                    </a>
                                  )}
                                </div>
                              </td>

                              {/* Leads Owner */}
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-red-100 text-red-700 text-[10px] font-bold flex items-center justify-center">
                                    {(lead.name || "U").substring(0, 1).toUpperCase()}
                                  </div>
                                  <span className="text-slate-600 text-xs">Assigned Agent</span>
                                </div>
                              </td>

                              {/* First Name */}
                              <td className="p-3 font-bold text-slate-900 group-hover:text-red-600 transition-colors">
                                {lead.name}
                              </td>

                              {/* Mobile Number */}
                              <td className="p-3 font-mono text-slate-800">{lead.phone}</td>

                              {/* Company */}
                              <td className="p-3 text-slate-600">{lead.company_name || "Individual"}</td>

                              {/* Stage Selector Dropdown (Interactive Table Cell) */}
                              <td className="p-3" onClick={(e) => e.stopPropagation()}>
                                <select
                                  value={lead.stage}
                                  onChange={(e) => handleStageChange(lead.id, e.target.value)}
                                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-red-50 text-red-700 border border-red-200 cursor-pointer focus:outline-none focus:ring-1 focus:ring-red-500"
                                >
                                  <option value="New Lead">New Lead</option>
                                  <option value="Contacted / Follow-up">Contacted</option>
                                  <option value="Proposal Sent">Proposal Sent</option>
                                  <option value="Closed / Won">Closed / Won</option>
                                  <option value="Lost">Lost</option>
                                </select>
                              </td>

                              {/* Deal Value */}
                              <td className="p-3 text-right font-bold text-slate-900">
                                {formatCurrency(lead.deal_value || 0)}
                              </td>

                              {/* Actions: [Edit] [View] [Delete] */}
                              <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => setEditingLead(lead)}
                                    className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                    title="Edit Lead"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setSelectedLead(lead)}
                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                    title="View Details"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={(e) => handleDeleteLead(e, lead)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                    title="Delete Lead"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
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

                {/* Pagination */}
                {paginatedLeads.length > 0 && (
                  <div className="p-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                    <span>Showing Page {currentPage} of {totalPages} ({filteredLeads.length} records)</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        disabled={currentPage <= 1}
                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 disabled:opacity-30 cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        disabled={currentPage >= totalPages}
                        onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 disabled:opacity-30 cursor-pointer"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VIEW 2: KANBAN VIEW (Independent columns, Red Theme, Horizontal Scrollbar, Individual Column Scrollbars) */}
          {viewMode === "kanban" && (
            <div className="w-full overflow-x-auto pb-4 pt-1">
              <div className="flex items-start gap-4 w-max min-w-full">
                {KANBAN_STAGES.map((stage) => {
                  const stageLeads = filteredLeads.filter(
                    (l) =>
                      l.stage === stage.id ||
                      (stage.id === "Attempted to Contact" && (l.stage as any) === "New Lead") ||
                      (stage.id === "Contacted" && (l.stage as any) === "Contacted / Follow-up")
                  );

                  return (
                    <div
                      key={stage.id}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const leadId = e.dataTransfer.getData("leadId");
                        if (leadId) handleStageChange(leadId, stage.id);
                      }}
                      className="w-[280px] sm:w-[305px] shrink-0 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col h-[calc(100vh-215px)] min-h-[500px] max-h-[700px] transition-all"
                    >
                      {/* Column Header: [Dot] [Grip] [Title] [Count Pill] [Chevron] */}
                      <div className="p-3.5 border-b border-slate-100 flex items-center justify-between select-none shrink-0 bg-white rounded-t-2xl">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${stage.dot} shrink-0`} />
                          <GripVertical className="w-3.5 h-3.5 text-slate-300" />
                          <h3 className="text-[13px] font-bold text-slate-800 tracking-tight truncate max-w-[150px]">
                            {stage.label}
                          </h3>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-semibold flex items-center justify-center">
                            {stageLeads.length}
                          </span>
                          <button
                            type="button"
                            className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                            title="Toggle column"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Column Body: Individual Vertical Scrollbar for leads */}
                      <div className="flex-1 p-3 space-y-2.5 overflow-y-auto custom-scrollbar flex flex-col">
                        {stageLeads.length === 0 ? (
                          <div className="flex-1 flex flex-col items-center justify-center py-16 px-4 text-center select-none">
                            <p className="text-xs text-slate-500 font-medium mb-3">
                              No Columns found
                            </p>
                            <button
                              type="button"
                              onClick={() => setShowAddLead(true)}
                              className="px-4 py-1.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs font-semibold rounded-full shadow-xs transition-all cursor-pointer"
                            >
                              Create Leads
                            </button>
                          </div>
                        ) : (
                          stageLeads.map((lead) => (
                            <div
                              key={lead.id}
                              draggable
                              onDragStart={(e) => e.dataTransfer.setData("leadId", String(lead.id))}
                              onClick={() => setSelectedLead(lead)}
                              className="p-3.5 bg-white rounded-xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-red-300 transition-all cursor-grab active:cursor-grabbing space-y-2.5 group shrink-0"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <h4 className="text-xs font-bold text-slate-900 group-hover:text-red-600 transition-colors">
                                    {lead.name}
                                  </h4>
                                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                                    {lead.company_name || "Individual Client"}
                                  </p>
                                </div>
                                <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                  {lead.ad_source || "Inbound"}
                                </span>
                              </div>

                              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                                <span className="font-bold text-slate-900">
                                  {formatCurrency(lead.deal_value || 0)}
                                </span>

                                {/* Quick Actions */}
                                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    onClick={() => setEditingLead(lead)}
                                    className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                                    title="Edit Lead"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={(e) => handleDeleteLead(e, lead)}
                                    className="p-1 hover:bg-rose-50 rounded text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                    title="Delete Lead"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Lead Details Drawer */}
      {selectedLead && (
        <LeadDetailsDrawer
          lead={selectedLead}
          isOpen={!!selectedLead}
          onClose={() => setSelectedLead(null)}
          onLeadUpdated={fetchLeads}
        />
      )}

      {/* Add Lead Modal */}
      {showAddLead && (
        <AddLeadModal
          isOpen={showAddLead}
          onClose={() => {
            setShowAddLead(false);
            fetchLeads();
          }}
          onLeadAdded={fetchLeads}
        />
      )}

      {/* Edit Lead Modal */}
      {editingLead && (
        <EditLeadModal
          lead={editingLead}
          isOpen={!!editingLead}
          onClose={() => setEditingLead(null)}
          onLeadUpdated={fetchLeads}
        />
      )}
    </div>
  );
}
