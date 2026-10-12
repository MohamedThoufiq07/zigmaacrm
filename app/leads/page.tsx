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
  Building2
} from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import LeadDetailsDrawer from "@/components/leads/LeadDetailsDrawer";
import AddLeadModal from "@/components/leads/AddLeadModal";
import FilterSelect from "@/components/common/FilterSelect";
import MoreViewsDropdown from "@/components/common/MoreViewsDropdown";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { Lead } from "@/lib/mockData";

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
  { id: "New Lead", label: "New Lead", color: "border-indigo-200 bg-indigo-50/60 text-indigo-700", dot: "bg-indigo-500" },
  { id: "Contacted / Follow-up", label: "Contacted / Follow-up", color: "border-amber-200 bg-amber-50/60 text-amber-700", dot: "bg-amber-500" },
  { id: "Proposal Sent", label: "Proposal Sent", color: "border-purple-200 bg-purple-50/60 text-purple-700", dot: "bg-purple-500" },
  { id: "Closed / Won", label: "Closed / Won", color: "border-emerald-200 bg-emerald-50/60 text-emerald-700", dot: "bg-emerald-500" }
];

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");
  const [activeTab, setActiveTab] = useState<string>("All Leads");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [selectedSource, setSelectedSource] = useState("ALL");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
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
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [searchQuery, selectedSource]);

  // Tab Filtering
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      if (activeTab === "My Leads") return true; // In multi-user could filter by assigned agent
      if (activeTab === "Open Leads") return lead.stage !== "Closed / Won";
      if (activeTab === "Converted Leads") return lead.stage === "Closed / Won";
      if (activeTab === "Today's Leads") {
        const todayStr = new Date().toISOString().slice(0, 10);
        return (lead.created_at || "").startsWith(todayStr);
      }
      return true;
    });
  }, [leads, activeTab]);

  const handleDeleteLead = async (e: React.MouseEvent, id: number | string) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this lead?")) {
      await api.deleteLead(id);
      fetchLeads();
    }
  };

  const handleStageChange = async (leadId: number | string, newStage: string) => {
    setLeads((prev) =>
      prev.map((l) => (String(l.id) === String(leadId) ? { ...l, stage: newStage as any } : l))
    );
    try {
      await api.updateLeadStage(leadId, newStage);
    } catch (e) {
      console.error(e);
    }
  };

  const handleExportCsv = () => {
    if (leads.length === 0) {
      alert("No leads to export.");
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
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none text-sm">
              {["All Leads", "My Leads", "Open Leads", "Converted Leads", "Today's Leads"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap text-sm ${
                    activeTab === tab
                      ? "bg-purple-100/70 text-[#6941C6] font-bold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
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
                    className="px-4 py-2 bg-[#6941C6] hover:bg-[#5833af] text-white text-sm font-semibold rounded-l-xl transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Add Lead</span>
                  </button>
                  <button
                    onClick={() => setShowAddMenu(!showAddMenu)}
                    className="px-2.5 py-2 bg-[#5e38b5] hover:bg-[#502e9e] text-white text-sm rounded-r-xl transition-all cursor-pointer border-l border-purple-400/30"
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
                      className="w-full text-left px-3 py-2 hover:bg-purple-50 text-slate-700 hover:text-[#6941C6] rounded-lg font-medium flex items-center gap-2 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Create Single Lead</span>
                    </button>
                    <Link
                      href="/leads/import"
                      className="w-full text-left px-3 py-2 hover:bg-purple-50 text-slate-700 hover:text-[#6941C6] rounded-lg font-medium flex items-center gap-2 cursor-pointer"
                    >
                      <Upload className="w-4 h-4 text-[#6941C6]" />
                      <span>Bulk CSV Import</span>
                    </Link>
                  </div>
                )}
              </div>

              {/* Export Button */}
              <button
                onClick={handleExportCsv}
                className="px-4 py-2 bg-white border border-purple-200 text-purple-700 hover:bg-purple-50 rounded-xl text-sm font-semibold shadow-2xs transition-colors cursor-pointer"
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
                      ? "bg-white text-[#6941C6] shadow-2xs font-bold"
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
                      ? "bg-white text-[#6941C6] shadow-2xs font-bold"
                      : "text-slate-400 hover:text-slate-700"
                  }`}
                >
                  <Columns3 className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Main Card Container */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            {/* VIEW 1: TABLE VIEW */}
            {viewMode === "table" && (
              <div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-[#F8F7FD] border-b border-slate-200/80 text-sm font-semibold text-slate-800">
                        <th className="py-3.5 px-3 w-12 text-center border-r border-slate-200/80">
                          <div className="flex items-center justify-center">
                            <button
                              onClick={toggleSelectAll}
                              className="flex items-center justify-center cursor-pointer text-slate-400 hover:text-slate-600 transition-colors"
                            >
                              {selectedIds.size > 0 && selectedIds.size === paginatedLeads.length ? (
                                <CheckSquare className="w-4 h-4 text-[#6941C6]" />
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
                                isSelected ? "bg-purple-50/30" : ""
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
                                    <CheckSquare className="w-4 h-4 text-[#6941C6]" />
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
                                      className="p-1 rounded-md text-slate-400 hover:text-purple-600 hover:bg-purple-50 transition-colors"
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
                                  <div className="w-6 h-6 rounded-full bg-purple-100 text-[#6941C6] text-[10px] font-bold flex items-center justify-center">
                                    {(lead.name || "U").substring(0, 1).toUpperCase()}
                                  </div>
                                  <span className="text-slate-600 text-xs">Assigned Agent</span>
                                </div>
                              </td>

                              {/* First Name */}
                              <td className="p-3 font-bold text-slate-900 group-hover:text-[#6941C6] transition-colors">
                                {lead.name}
                              </td>

                              {/* Mobile Number */}
                              <td className="p-3 font-mono text-slate-800">{lead.phone}</td>

                              {/* Company */}
                              <td className="p-3 text-slate-600">{lead.company_name || "Individual"}</td>

                              {/* Stage */}
                              <td className="p-3">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-[#6941C6] border border-purple-200">
                                  {lead.stage}
                                </span>
                              </td>

                              {/* Deal Value */}
                              <td className="p-3 text-right font-bold text-slate-900">
                                {formatCurrency(lead.deal_value || 0)}
                              </td>

                              {/* Actions */}
                              <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    onClick={() => setSelectedLead(lead)}
                                    className="p-1 text-slate-400 hover:text-purple-600 rounded"
                                    title="View Details"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={(e) => handleDeleteLead(e, lead.id)}
                                    className="p-1 text-slate-400 hover:text-rose-600 rounded"
                                    title="Delete"
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
            )}

            {/* VIEW 2: KANBAN VIEW */}
            {viewMode === "kanban" && (
              <div className="p-4 overflow-x-auto">
                <div className="flex items-start gap-4 min-w-[900px]">
                  {KANBAN_STAGES.map((stage) => {
                    const stageLeads = filteredLeads.filter((l) => l.stage === stage.id);

                    return (
                      <div
                        key={stage.id}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          const leadId = e.dataTransfer.getData("leadId");
                          if (leadId) handleStageChange(leadId, stage.id);
                        }}
                        className="w-72 shrink-0 bg-slate-50/70 rounded-2xl p-3 border border-slate-200/80 space-y-3"
                      >
                        {/* Stage Column Header */}
                        <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${stage.dot}`} />
                            <h3 className="text-xs font-bold text-slate-800">{stage.label}</h3>
                          </div>
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600 shadow-2xs">
                            {stageLeads.length}
                          </span>
                        </div>

                        {/* Cards List */}
                        <div className="space-y-2.5 min-h-[300px]">
                          {stageLeads.length === 0 ? (
                            <div className="h-28 border-2 border-dashed border-slate-200/80 rounded-xl flex items-center justify-center text-slate-400 text-xs">
                              + Drop leads here
                            </div>
                          ) : (
                            stageLeads.map((lead) => (
                              <div
                                key={lead.id}
                                draggable
                                onDragStart={(e) => e.dataTransfer.setData("leadId", String(lead.id))}
                                onClick={() => setSelectedLead(lead)}
                                className="p-3.5 bg-white rounded-xl border border-slate-200/90 shadow-2xs hover:shadow-xs hover:border-purple-300 transition-all cursor-grab active:cursor-grabbing space-y-2"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <h4 className="text-xs font-bold text-slate-900 leading-tight">
                                      {lead.name}
                                    </h4>
                                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                                      {lead.company_name || "Individual"}
                                    </p>
                                  </div>
                                  <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                                    {lead.ad_source}
                                  </span>
                                </div>

                                <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
                                  <span className="font-bold text-[#6941C6]">
                                    {formatCurrency(lead.deal_value || 0)}
                                  </span>

                                  {/* Quick Stage Movers */}
                                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                    {stage.id !== "New Lead" && (
                                      <button
                                        onClick={() => {
                                          const currentIndex = KANBAN_STAGES.findIndex((s) => s.id === stage.id);
                                          if (currentIndex > 0) {
                                            handleStageChange(lead.id, KANBAN_STAGES[currentIndex - 1].id);
                                          }
                                        }}
                                        className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700"
                                        title="Move back"
                                      >
                                        <ArrowLeft className="w-3 h-3" />
                                      </button>
                                    )}
                                    {stage.id !== "Closed / Won" && (
                                      <button
                                        onClick={() => {
                                          const currentIndex = KANBAN_STAGES.findIndex((s) => s.id === stage.id);
                                          if (currentIndex < KANBAN_STAGES.length - 1) {
                                            handleStageChange(lead.id, KANBAN_STAGES[currentIndex + 1].id);
                                          }
                                        }}
                                        className="p-1 hover:bg-purple-100 rounded text-purple-600"
                                        title="Advance stage"
                                      >
                                        <ArrowRight className="w-3 h-3" />
                                      </button>
                                    )}
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
          </div>
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
    </div>
  );
}
