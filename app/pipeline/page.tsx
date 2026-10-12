"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Handshake,
  Plus,
  Search,
  Building2,
  Trash2,
  X,
  Filter,
  SlidersHorizontal,
  RotateCw,
  LayoutGrid,
  Columns3,
  MoreVertical,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ArrowRight,
  ArrowLeft,
  DollarSign,
  Calendar,
  Sparkles
} from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import FilterSelect from "@/components/common/FilterSelect";
import MoreViewsDropdown from "@/components/common/MoreViewsDropdown";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { Deal } from "@/lib/mockData";

const DEALS_MORE_VIEWS = [
  "All Deals",
  "Closing This Month",
  "Lost Deals",
  "My Deals",
  "Open Deals",
  "Recently Created Deals",
  "Recently Modified Deals",
  "Today's Deals",
  "Won Deals"
];

const PIPELINE_STAGES = [
  "Qualification",
  "Demo Scheduled",
  "Proposal Sent",
  "Negotiation",
  "Closed Won"
];

const DEAL_STAGES = [
  { id: "Qualification", label: "Qualification", color: "border-indigo-200 bg-indigo-50/60 text-indigo-700", dot: "bg-indigo-500" },
  { id: "Demo Scheduled", label: "Demo Scheduled", color: "border-blue-200 bg-blue-50/60 text-blue-700", dot: "bg-blue-500" },
  { id: "Proposal Sent", label: "Proposal Sent", color: "border-rose-200 bg-rose-50/60 text-rose-700", dot: "bg-rose-500" },
  { id: "Negotiation", label: "Negotiation", color: "border-amber-200 bg-amber-50/60 text-amber-700", dot: "bg-amber-500" },
  { id: "Closed Won", label: "Closed Won", color: "border-emerald-200 bg-emerald-50/60 text-emerald-700", dot: "bg-emerald-500" }
];

export default function PipelineDealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");
  const [activeTab, setActiveTab] = useState<string>("All Deals");
  const [selectedStage, setSelectedStage] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<number | string>>(new Set());

  // Form Fields
  const [title, setTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [value, setValue] = useState("");
  const [stage, setStage] = useState("Qualification");
  const [probability, setProbability] = useState("30");
  const [closeDate, setCloseDate] = useState("");

  const loadDeals = async () => {
    try {
      const data = await api.getDeals();
      setDeals(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadDeals();
    const future = new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0];
    setCloseDate(future);
  }, []);

  const handleCreateDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !value) return;

    const newDeal: Partial<Deal> = {
      title: title.trim(),
      company_name: companyName.trim() || "Enterprise Client",
      contact_name: contactName.trim(),
      value: Number(value) || 0,
      stage: stage as any,
      probability: Number(probability) || 50,
      close_date: closeDate || new Date().toISOString().split("T")[0]
    };

    // Optimistic Update
    const temp: Deal = {
      id: Date.now(),
      title: title.trim(),
      company_name: companyName.trim() || "Enterprise Client",
      contact_name: contactName.trim(),
      value: Number(value) || 0,
      stage: stage as any,
      probability: Number(probability) || 50,
      close_date: closeDate || new Date().toISOString().split("T")[0],
      created_at: new Date().toISOString()
    };
    setDeals((prev) => [temp, ...prev]);

    await api.createDeal(newDeal);
    setTitle("");
    setCompanyName("");
    setContactName("");
    setValue("");
    setShowAddModal(false);
    loadDeals();
  };

  const handleDelete = async (id: number | string) => {
    if (confirm("Are you sure you want to delete this deal?")) {
      setDeals((prev) => prev.filter((d) => String(d.id) !== String(id)));
      await api.deleteDeal(id);
    }
  };

  const handleStageChange = async (dealId: number | string, newStage: string) => {
    setDeals((prev) =>
      prev.map((d) => (String(d.id) === String(dealId) ? { ...d, stage: newStage as any } : d))
    );
    await api.updateDeal(dealId, { stage: newStage as any });
  };

  const handleExportCsv = () => {
    if (deals.length === 0) {
      alert("No deals to export.");
      return;
    }
    const headers = ["Deal Name", "Company", "Contact", "Amount", "Stage", "Probability", "Close Date"];
    const rows = deals.map((d) => [
      `"${d.title}"`,
      `"${d.company_name || ""}"`,
      `"${d.contact_name || ""}"`,
      d.value,
      `"${d.stage}"`,
      `${d.probability}%`,
      `"${d.close_date}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `zigmaa_deals_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered Deals
  const filteredDeals = useMemo(() => {
    return deals.filter((d) => {
      // Tab filter
      if (activeTab === "Open Deals" && d.stage === "Closed Won") return false;
      if (activeTab === "Won Deals" && d.stage !== "Closed Won") return false;
      if (activeTab === "Closing This Month") {
        const thisMonth = new Date().toISOString().slice(0, 7);
        if (!(d.close_date || "").startsWith(thisMonth)) return false;
      }

      // Stage dropdown filter
      if (selectedStage !== "ALL" && d.stage !== selectedStage) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          d.title.toLowerCase().includes(q) ||
          (d.company_name && d.company_name.toLowerCase().includes(q)) ||
          (d.contact_name && d.contact_name.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [deals, activeTab, selectedStage, searchQuery]);

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedDeals.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedDeals.map((d) => d.id)));
    }
  };

  const toggleSelectOne = (id: number | string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const totalPages = Math.ceil(filteredDeals.length / pageSize) || 1;
  const paginatedDeals = filteredDeals.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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
              {["All Deals", "My Deals", "Open Deals", "Won Deals", "Closing This Month"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab);
                    setCurrentPage(1);
                  }}
                  className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap text-sm ${
                    activeTab === tab
                      ? "bg-red-50 text-red-600 font-bold border border-red-100"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  {tab}
                </button>
              ))}

              {/* More Views Dropdown (···) */}
              <MoreViewsDropdown
                views={DEALS_MORE_VIEWS}
                activeView={activeTab}
                onSelect={(view) => {
                  setActiveTab(view);
                  setCurrentPage(1);
                }}
              />
            </div>

            {/* Right Actions: [Stage ▾] [Add Deal ▾] [Export] [ ⊞ | ▥ ] */}
            <div className="flex items-center gap-2.5 shrink-0">
              {/* Custom Stage Dropdown */}
              <FilterSelect
                placeholder="Stage"
                value={selectedStage}
                options={PIPELINE_STAGES}
                onChange={(val) => {
                  setSelectedStage(val);
                  setCurrentPage(1);
                }}
              />

              {/* Right Action Buttons */}
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>Add Deal</span>
                <ChevronDown className="w-4 h-4" />
              </button>

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

          {/* Main Card Container */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            {/* VIEW 1: TABLE VIEW */}
            {viewMode === "table" && (
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
                              {selectedIds.size > 0 && selectedIds.size === paginatedDeals.length ? (
                                 <CheckSquare className="w-4 h-4 text-red-600" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </th>
                        <th className="px-4 py-3.5 border-r border-slate-200/80">
                          <span>Deal Owner</span>
                        </th>
                        <th className="px-4 py-3.5 border-r border-slate-200/80">
                          <span>Deal Name</span>
                        </th>
                        <th className="px-4 py-3.5 border-r border-slate-200/80">
                          <span>Type</span>
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
                      {paginatedDeals.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-24 text-center">
                            <div className="max-w-md mx-auto space-y-1.5">
                              <p className="text-base font-bold text-slate-900">No deals yet</p>
                              <p className="text-sm text-slate-500">Deals you create will show up here.</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        paginatedDeals.map((deal) => {
                          const isSelected = selectedIds.has(deal.id);

                          return (
                            <tr
                              key={deal.id}
                              className={`hover:bg-slate-50/80 transition-colors cursor-pointer group ${
                                isSelected ? "bg-red-50/40" : ""
                              }`}
                            >
                              <td
                                className="py-3 px-3 text-center"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleSelectOne(deal.id);
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

                              {/* Deal Owner */}
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-red-100 text-red-700 text-[10px] font-bold flex items-center justify-center">
                                    {(deal.contact_name || deal.title).substring(0, 1).toUpperCase()}
                                  </div>
                                  <span className="text-slate-600 text-xs">Primary Sales Rep</span>
                                </div>
                              </td>

                              {/* Deal Name */}
                              <td className="p-3 font-bold text-slate-900 group-hover:text-red-600 transition-colors">
                                <div>
                                  <p>{deal.title}</p>
                                  <p className="text-[10px] text-slate-400 font-normal">{deal.company_name}</p>
                                </div>
                              </td>

                              {/* Type */}
                              <td className="p-3 text-slate-500">
                                <span className="px-2 py-0.5 rounded bg-slate-100 text-[10px] font-semibold text-slate-600">
                                  B2B Contract
                                </span>
                              </td>

                              {/* Stage */}
                              <td className="p-3">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                    deal.stage === "Closed Won"
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                      : deal.stage === "Negotiation"
                                      ? "bg-amber-50 text-amber-700 border-amber-200"
                                      : "bg-red-50 text-red-700 border-red-200"
                                  }`}
                                >
                                  {deal.stage}
                                </span>
                              </td>

                              {/* Amount */}
                              <td className="p-3 text-right font-bold text-slate-900">
                                {formatCurrency(deal.value)}
                              </td>

                              {/* Actions */}
                              <td className="p-3 text-right">
                                <button
                                  onClick={() => handleDelete(deal.id)}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {paginatedDeals.length > 0 && (
                  <div className="p-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                    <span>Showing Page {currentPage} of {totalPages} ({filteredDeals.length} records)</span>
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
                <div className="flex items-start gap-4 min-w-[1000px]">
                  {DEAL_STAGES.map((st) => {
                    const stageDeals = filteredDeals.filter((d) => d.stage === st.id);
                    const stageTotalValue = stageDeals.reduce((sum, d) => sum + (d.value || 0), 0);

                    return (
                      <div
                        key={st.id}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          const dealId = e.dataTransfer.getData("dealId");
                          if (dealId) handleStageChange(dealId, st.id);
                        }}
                        className="w-72 shrink-0 bg-slate-50/70 rounded-2xl p-3 border border-slate-200/80 space-y-3"
                      >
                        {/* Header */}
                        <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${st.dot}`} />
                              <h3 className="text-xs font-bold text-slate-800">{st.label}</h3>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-0.5">{formatCurrency(stageTotalValue)}</p>
                          </div>
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600 shadow-2xs">
                            {stageDeals.length}
                          </span>
                        </div>

                        {/* Cards */}
                        <div className="space-y-2.5 min-h-[300px]">
                          {stageDeals.length === 0 ? (
                            <div className="h-28 border-2 border-dashed border-slate-200/80 rounded-xl flex items-center justify-center text-slate-400 text-xs">
                              + Drop deals here
                            </div>
                          ) : (
                            stageDeals.map((deal) => (
                              <div
                                key={deal.id}
                                draggable
                                onDragStart={(e) => e.dataTransfer.setData("dealId", String(deal.id))}
                                className="p-3.5 bg-white rounded-xl border border-slate-200/90 shadow-2xs hover:shadow-xs hover:border-red-300 transition-all cursor-grab active:cursor-grabbing space-y-2"
                              >
                                <div>
                                  <h4 className="text-xs font-bold text-slate-900 leading-tight">
                                    {deal.title}
                                  </h4>
                                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                                    {deal.company_name} {deal.contact_name ? `• ${deal.contact_name}` : ""}
                                  </p>
                                </div>

                                <div className="flex items-center justify-between text-xs pt-1">
                                  <span className="font-bold text-red-600 text-xs">
                                    {formatCurrency(deal.value)}
                                  </span>
                                  <span className="text-[10px] font-semibold text-slate-400">
                                    {deal.probability}% Prob.
                                  </span>
                                </div>

                                {/* Stage Progress Bar */}
                                <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                                  <div
                                    className="bg-red-600 h-1 rounded-full"
                                    style={{ width: `${deal.probability || 30}%` }}
                                  />
                                </div>

                                <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
                                  <span className="text-[10px] text-slate-400">
                                    Close: {deal.close_date || "Open"}
                                  </span>

                                  {/* Quick Stage Movers */}
                                  <div className="flex items-center gap-1">
                                    {st.id !== "Qualification" && (
                                      <button
                                        onClick={() => {
                                          const idx = DEAL_STAGES.findIndex((s) => s.id === st.id);
                                          if (idx > 0) handleStageChange(deal.id, DEAL_STAGES[idx - 1].id);
                                        }}
                                        className="p-1 text-slate-400 hover:text-slate-700 rounded"
                                        title="Move back"
                                      >
                                        <ArrowLeft className="w-3 h-3" />
                                      </button>
                                    )}
                                    {st.id !== "Closed Won" && (
                                      <button
                                        onClick={() => {
                                          const idx = DEAL_STAGES.findIndex((s) => s.id === st.id);
                                          if (idx < DEAL_STAGES.length - 1) handleStageChange(deal.id, DEAL_STAGES[idx + 1].id);
                                        }}
                                        className="p-1 text-red-600 hover:bg-red-50 rounded"
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

      {/* Add Deal Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Create New Deal</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateDeal} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Deal Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Enterprise Cloud Migration Contract"
                  className="w-full bg-slate-50 text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Company Name</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Acme Global Inc"
                    className="w-full bg-slate-50 text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Robert Smith"
                    className="w-full bg-slate-50 text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Deal Value (₹ / $) *</label>
                  <input
                    type="number"
                    required
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="250000"
                    className="w-full bg-slate-50 text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Stage</label>
                  <select
                    value={stage}
                    onChange={(e) => setStage(e.target.value)}
                    className="w-full bg-slate-50 text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 font-medium"
                  >
                    <option value="Qualification">Qualification</option>
                    <option value="Demo Scheduled">Demo Scheduled</option>
                    <option value="Proposal Sent">Proposal Sent</option>
                    <option value="Negotiation">Negotiation</option>
                    <option value="Closed Won">Closed Won</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Probability (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={probability}
                    onChange={(e) => setProbability(e.target.value)}
                    className="w-full bg-slate-50 text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Target Close Date</label>
                  <input
                    type="date"
                    value={closeDate}
                    onChange={(e) => setCloseDate(e.target.value)}
                    className="w-full bg-slate-50 text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  Create Deal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
