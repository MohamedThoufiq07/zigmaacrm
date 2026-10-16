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
  Sparkles,
  GripVertical
} from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import FilterSelect from "@/components/common/FilterSelect";
import MoreViewsDropdown from "@/components/common/MoreViewsDropdown";
import ManageCustomFieldsModal from "@/components/common/ManageCustomFieldsModal";
import NewDealDrawer from "@/components/deals/NewDealDrawer";
import DealDetailsDrawer from "@/components/deals/DealDetailsDrawer";
import { Sliders, ArrowUpDown } from "lucide-react";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { Deal } from "@/lib/mockData";
import { useToast } from "@/components/common/ToastProvider";


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
  "New Deal",
  "Discovery",
  "Proposal Sent",
  "Negotiation",
  "Won",
  "Lost"
];

const DEAL_STAGES = [
  { id: "New Deal", label: "New Deal", color: "border-slate-200 bg-slate-50/60 text-slate-700", dot: "bg-slate-500" },
  { id: "Discovery", label: "Discovery", color: "border-blue-200 bg-blue-50/60 text-blue-700", dot: "bg-blue-500" },
  { id: "Proposal Sent", label: "Proposal Sent", color: "border-indigo-200 bg-indigo-50/60 text-indigo-700", dot: "bg-indigo-500" },
  { id: "Negotiation", label: "Negotiation", color: "border-amber-200 bg-amber-50/60 text-amber-700", dot: "bg-amber-500" },
  { id: "Won", label: "Won", color: "border-emerald-200 bg-emerald-50/60 text-emerald-700", dot: "bg-emerald-500" },
  { id: "Lost", label: "Lost", color: "border-rose-200 bg-rose-50/60 text-rose-700", dot: "bg-rose-500" }
];

export default function PipelineDealsPage() {
  const { toast, confirm } = useToast();
  const [deals, setDeals] = useState<Deal[]>([]);

  const [viewMode, setViewMode] = useState<"table" | "kanban">("kanban");
  const [activeTab, setActiveTab] = useState<string>("All Deals");
  const [selectedStage, setSelectedStage] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [selectedDealForDetails, setSelectedDealForDetails] = useState<Deal | null>(null);
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<number | string>>(new Set());
  const [showCustomFields, setShowCustomFields] = useState(false);
  const [customFields, setCustomFields] = useState<any[]>([]);
  const [customData, setCustomData] = useState<Record<string, any>>({});
  const [sortBy, setSortBy] = useState<"value" | "close_date" | "none">("none");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const loadDeals = async () => {
    try {
      const data = await api.getDeals();
      setDeals(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadCustomFields = async () => {
    try {
      const cfs = await api.getCustomFields("DEAL");
      setCustomFields(cfs || []);
    } catch {}
  };

  useEffect(() => {
    loadDeals();
    loadCustomFields();
  }, []);

  // Publish real-time UI context for Zigmaa AI Copilot screen sight
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).__ZIGMAA_PAGE_STATE = {
        page: "deals",
        activeTab: activeTab,
        viewMode: viewMode,
        selectedStage: selectedStage,
        totalRecords: deals.length,
        visibleCount: deals.length,
        sampleNames: deals.slice(0, 5).map((d) => d.title)
      };
    }
  }, [activeTab, viewMode, selectedStage, deals]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (selectedDealForDetails) {
        (window as any).__ZIGMAA_ACTIVE_DRAWER = {
          type: "deal",
          id: selectedDealForDetails.id,
          name: selectedDealForDetails.title,
          stage: selectedDealForDetails.stage,
          value: selectedDealForDetails.value,
          company: selectedDealForDetails.company_name
        };
      } else {
        if ((window as any).__ZIGMAA_ACTIVE_DRAWER?.type === "deal") {
          (window as any).__ZIGMAA_ACTIVE_DRAWER = null;
        }
      }
    }
  }, [selectedDealForDetails]);

  const handleCreateDealDrawer = async (dealData: Partial<Deal>) => {
    const temp: Deal = {
      id: Date.now(),
      title: dealData.title || "New Deal",
      company_name: dealData.company_name || "Enterprise Client",
      contact_name: dealData.contact_name || "",
      value: Number(dealData.value) || 0,
      deal_value: Number(dealData.value) || 0,
      stage: dealData.stage || ("New Deal" as any),
      probability: Number(dealData.probability) || 50,
      close_date: dealData.close_date || new Date().toISOString().split("T")[0],
      expected_close_date: dealData.close_date || new Date().toISOString().split("T")[0],
      created_at: new Date().toISOString(),
      custom_data: dealData.custom_data || {}
    };
    setDeals((prev) => [temp, ...prev]);

    await api.createDeal(dealData);
    toast.success("Deal Created", `"${dealData.title}" was added.`);
    loadDeals();
  };

  const handleDelete = async (id: number | string) => {
    const deal = deals.find((d) => String(d.id) === String(id));
    const confirmed = await confirm({
      title: "Delete Deal",
      message: `Are you sure you want to delete ${deal ? `"${deal.title}"` : "this deal"}?`,
      confirmText: "Delete",
      cancelText: "Cancel",
      variant: "danger"
    });

    if (confirmed) {
      setDeals((prev) => prev.filter((d) => String(d.id) !== String(id)));
      await api.deleteDeal(id);
      toast.success("Deal Deleted", "The deal record was removed.");
    }
  };

  const handleStageChange = async (dealId: number | string, newStage: string) => {
    setDeals((prev) =>
      prev.map((d) => (String(d.id) === String(dealId) ? { ...d, stage: newStage as any } : d))
    );
    await api.updateDeal(dealId, { stage: newStage as any });
    toast.info("Pipeline Updated", `Deal moved to "${newStage}"`);
  };

  const handleExportCsv = () => {
    if (deals.length === 0) {
      toast.warning("Export Warning", "No deals available to export.");
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
    toast.success("Export Complete", `Exported ${deals.length} deals.`);
  };

  // Filtered Deals
  const filteredDeals = useMemo(() => {

    const list = deals.filter((d) => {
      // Tab filter
      if (activeTab === "Open Deals" && (d.stage === "Closed Won" || d.stage === "Won")) return false;
      if (activeTab === "Won Deals" && d.stage !== "Closed Won" && d.stage !== "Won") return false;
      if (activeTab === "Closing This Month") {
        const thisMonth = new Date().toISOString().slice(0, 7);
        if (!(d.close_date || d.expected_close_date || "").startsWith(thisMonth)) return false;
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

    if (sortBy === "value") {
      return [...list].sort((a, b) => {
        const va = Number(a.value || a.deal_value || 0);
        const vb = Number(b.value || b.deal_value || 0);
        return sortOrder === "asc" ? va - vb : vb - va;
      });
    }

    if (sortBy === "close_date") {
      return [...list].sort((a, b) => {
        const da = a.close_date || a.expected_close_date || "";
        const db = b.close_date || b.expected_close_date || "";
        return sortOrder === "asc" ? da.localeCompare(db) : db.localeCompare(da);
      });
    }

    return list;
  }, [deals, activeTab, selectedStage, searchQuery, sortBy, sortOrder]);

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
    <div className="flex h-screen bg-[#F8FAFC] dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 font-sans overflow-hidden select-none">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />

        <main className="flex-1 overflow-y-auto p-5 lg:p-7 space-y-5 custom-scrollbar bg-[#F8FAFC] dark:bg-[#0b0f19]">
          {/* Controls: ONE Straight Row Above Table (Tabs on Left | Actions on Right) */}
          <div className="flex flex-wrap lg:flex-nowrap items-center justify-between gap-3">
            {/* Left: Navigation Tabs + More Views (···) */}
            <div className="flex items-center gap-1.5 text-sm flex-wrap sm:flex-nowrap">
              {["All Deals", "My Deals", "Open Deals", "Won Deals", "Closing This Month"].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={(e) => {
                    setActiveTab(tab);
                    setCurrentPage(1);
                    e.currentTarget.blur();
                  }}
                  className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap text-sm outline-none! focus:outline-none! focus-visible:outline-none! ring-0! focus:ring-0! focus-visible:ring-0! border select-none ${
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
                onClick={() => setShowAddDrawer(true)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Add Deal</span>
              </button>

              <button
                onClick={handleExportCsv}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-sm font-semibold shadow-2xs transition-colors cursor-pointer"
              >
                Export
              </button>

              {/* Manage Custom Fields Button */}
              <button
                type="button"
                onClick={() => setShowCustomFields(true)}
                className="px-3.5 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-sm font-semibold shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
                title="Manage Custom Attributes"
              >
                <Sliders className="w-3.5 h-3.5 text-slate-500" />
                <span>Fields</span>
              </button>

              {/* View Toggle: [ ⊞ Table | ▥ Kanban ] */}
              <div className="flex items-center bg-slate-100/90 border border-slate-200 p-0.5 rounded-xl shadow-2xs">
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
              </div>
            </div>
          </div>

          {/* VIEW 1: TABLE VIEW */}
          {viewMode === "table" && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
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
                          <span>Deal Name</span>
                        </th>
                        <th className="px-4 py-3.5 border-r border-slate-200/80">
                          <span>Associated Contact / Company</span>
                        </th>
                        <th className="px-4 py-3.5 border-r border-slate-200/80">
                          <span>Stage</span>
                        </th>
                        <th 
                          onClick={() => {
                            if (sortBy === "value") {
                              setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                            } else {
                              setSortBy("value");
                              setSortOrder("desc");
                            }
                          }}
                          className="px-4 py-3.5 text-right border-r border-slate-200/80 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                        >
                          <div className="flex items-center justify-end gap-1">
                            <span>Amount (₹)</span>
                            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                          </div>
                        </th>
                        <th className="px-4 py-3.5 text-center border-r border-slate-200/80">
                          <span>Probability (%)</span>
                        </th>
                        <th 
                          onClick={() => {
                            if (sortBy === "close_date") {
                              setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                            } else {
                              setSortBy("close_date");
                              setSortOrder("asc");
                            }
                          }}
                          className="px-4 py-3.5 border-r border-slate-200/80 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                        >
                          <div className="flex items-center gap-1">
                            <span>Expected Close Date</span>
                            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                          </div>
                        </th>
                        <th className="px-4 py-3.5 border-r border-slate-200/80">
                          <span>Owner</span>
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

                              {/* Deal Name */}
                              <td className="p-3 font-bold text-slate-900 group-hover:text-red-600 transition-colors">
                                <span className="block text-sm">{deal.title}</span>
                              </td>

                              {/* Associated Contact / Company */}
                              <td className="p-3 text-slate-700">
                                <div>
                                  <span className="font-semibold text-slate-900 block">{deal.company_name || "—"}</span>
                                  {deal.contact_name && (
                                    <span className="text-[11px] text-slate-400 block">{deal.contact_name}</span>
                                  )}
                                </div>
                              </td>

                              {/* Stage (Badge) */}
                              <td className="p-3">
                                <span
                                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                                    deal.stage === "Closed Won" || deal.stage === "Won"
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                      : deal.stage === "Negotiation"
                                      ? "bg-amber-50 text-amber-700 border-amber-200"
                                      : deal.stage === "Proposal Sent"
                                      ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                      : deal.stage === "Discovery"
                                      ? "bg-blue-50 text-blue-700 border-blue-200"
                                      : deal.stage === "Lost" || deal.stage === "Closed Lost"
                                      ? "bg-rose-50 text-rose-700 border-rose-200"
                                      : "bg-slate-100 text-slate-700 border-slate-200"
                                  }`}
                                >
                                  {deal.stage}
                                </span>
                              </td>

                              {/* Amount (₹) */}
                              <td className="p-3 text-right font-extrabold text-slate-900">
                                {formatCurrency(deal.value || deal.deal_value || 0)}
                              </td>

                              {/* Probability (%) */}
                              <td className="p-3 text-center">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                                  {deal.probability || 50}%
                                </span>
                              </td>

                              {/* Expected Close Date */}
                              <td className="p-3 text-xs text-slate-600 font-mono">
                                {deal.close_date || deal.expected_close_date || "—"}
                              </td>

                              {/* Owner */}
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-red-100 text-red-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                                    {(deal.contact_name || deal.company_name || "A").substring(0, 1).toUpperCase()}
                                  </div>
                                  <span className="text-slate-700 text-xs font-medium truncate max-w-[120px]">
                                    {deal.contact_name || "Assigned Agent"}
                                  </span>
                                </div>
                              </td>

                              {/* Actions */}
                              <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => handleDelete(deal.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  title="Delete Deal"
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

          {/* VIEW 2: KANBAN VIEW (Matching Leads: Independent Columns, Red Theme, Horizontal Board Scroll, Individual Column Scroll) */}
          {viewMode === "kanban" && (
            <div className="w-full overflow-x-auto pb-4 pt-1 scrollbar-thin scrollbar-thumb-slate-200">
              <div className="flex items-start gap-4 min-w-max">
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
                      className="w-[280px] shrink-0 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col h-[calc(100vh-215px)] min-h-[500px] max-h-[700px] transition-all"
                    >
                      {/* Column Header: [Dot] [Grip] [Title] [Count Pill] [Chevron] */}
                      <div className="p-3.5 border-b border-slate-100 flex items-center justify-between select-none shrink-0 bg-white rounded-t-2xl">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${st.dot} shrink-0`} />
                          <GripVertical className="w-3.5 h-3.5 text-slate-300" />
                          <div>
                            <h3 className="text-[13px] font-bold text-slate-800 tracking-tight truncate max-w-[140px]">
                              {st.label}
                            </h3>
                            <p className="text-[10px] text-slate-400 font-medium">{formatCurrency(stageTotalValue)}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-semibold flex items-center justify-center">
                            {stageDeals.length}
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

                      {/* Column Body: Individual Vertical Scrollbar */}
                      <div className="flex-1 p-3 space-y-2.5 overflow-y-auto custom-scrollbar flex flex-col">
                        {stageDeals.length === 0 ? (
                          <div className="min-h-[140px] border-2 border-dashed border-slate-200/80 rounded-xl flex items-center justify-center text-slate-400 text-xs font-normal select-none">
                            Drop deal here
                          </div>
                        ) : (
                          stageDeals.map((deal) => (
                            <div
                              key={deal.id}
                              draggable
                              onDragStart={(e) => e.dataTransfer.setData("dealId", String(deal.id))}
                              onClick={() => setSelectedDealForDetails(deal)}
                              className="border border-slate-200/80 rounded-xl shadow-xs hover:shadow-md transition-shadow p-3.5 bg-white cursor-grab active:cursor-grabbing space-y-2.5 group shrink-0"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <h4 className="font-medium text-slate-800 text-sm group-hover:text-red-600 transition-colors leading-snug truncate">
                                    {deal.title}
                                  </h4>
                                  <p className="text-xs text-slate-500 truncate mt-0.5">
                                    {deal.company_name || "Enterprise Account"}
                                    {deal.contact_name ? ` • ${deal.contact_name}` : ""}
                                  </p>
                                </div>
                                <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full shrink-0">
                                  {deal.probability || 50}%
                                </span>
                              </div>

                              <div className="flex items-center justify-between text-xs pt-1">
                                <span className="text-slate-900 font-semibold text-sm">
                                  {formatCurrency(deal.value || deal.deal_value || 0)}
                                </span>
                                <span className="text-[11px] text-slate-500 font-medium">
                                  Due: {deal.close_date || deal.expected_close_date || "Open"}
                                </span>
                              </div>

                              {/* Owner & Stage Progress */}
                              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                                <span className="flex items-center gap-1.5 truncate">
                                  <span className="w-5 h-5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                                    {(deal.contact_name || deal.company_name || "A").substring(0, 1).toUpperCase()}
                                  </span>
                                  <span className="truncate">{deal.contact_name || "Assigned Agent"}</span>
                                </span>
                                <span className="text-[10px] font-semibold text-slate-400">
                                  {deal.probability || 30}%
                                </span>
                              </div>

                              <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                                <div
                                  className="bg-red-600 h-1 rounded-full"
                                  style={{ width: `${deal.probability || 30}%` }}
                                />
                              </div>

                              <div className="flex items-center justify-end pt-2 border-t border-slate-100 text-xs" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center gap-1">
                                  {DEAL_STAGES.findIndex((s) => s.id === st.id) > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const idx = DEAL_STAGES.findIndex((s) => s.id === st.id);
                                        if (idx > 0) handleStageChange(deal.id, DEAL_STAGES[idx - 1].id);
                                      }}
                                      className="p-1 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
                                      title="Move back"
                                    >
                                      <ArrowLeft className="w-3 h-3" />
                                    </button>
                                  )}
                                  {DEAL_STAGES.findIndex((s) => s.id === st.id) < DEAL_STAGES.length - 1 && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const idx = DEAL_STAGES.findIndex((s) => s.id === st.id);
                                        if (idx < DEAL_STAGES.length - 1) handleStageChange(deal.id, DEAL_STAGES[idx + 1].id);
                                      }}
                                      className="p-1 text-red-600 hover:bg-red-50 rounded cursor-pointer"
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
        </main>
      </div>

      {/* Add Deal Slide-Over Drawer */}
      <NewDealDrawer
        isOpen={showAddDrawer}
        onClose={() => setShowAddDrawer(false)}
        onSubmit={handleCreateDealDrawer}
        customFields={customFields}
      />

      {/* Deal Details Overview Drawer */}
      <DealDetailsDrawer
        deal={selectedDealForDetails}
        isOpen={!!selectedDealForDetails}
        onClose={() => setSelectedDealForDetails(null)}
        onStageChange={async (dealId, newStage) => {
          await handleStageChange(dealId, newStage);
          setSelectedDealForDetails((prev) => (prev ? { ...prev, stage: newStage as any } : null));
        }}
        onDelete={async (dealId) => {
          setSelectedDealForDetails(null);
          await handleDelete(dealId);
        }}
      />

      {/* Manage Custom Fields Modal */}
      <ManageCustomFieldsModal
        entityType="DEAL"
        isOpen={showCustomFields}
        onClose={() => setShowCustomFields(false)}
        onFieldsChanged={() => {
          loadCustomFields();
          loadDeals();
        }}
      />
    </div>
  );
}
