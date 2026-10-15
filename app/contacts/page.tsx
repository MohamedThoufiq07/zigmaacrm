"use client";

import { useState, useEffect, useMemo } from "react";
import {
  UserCheck,
  Plus,
  Search,
  Phone,
  Mail,
  MessageSquare,
  Building2,
  Trash2,
  X,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Tag,
  Handshake,
  User,
  Sliders,
  MoreVertical,
  MoreHorizontal,
  Edit2,
  Upload,
  Menu,
  ArrowUp,
  ArrowDown
} from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import ContactSlideDrawer from "@/components/contacts/ContactSlideDrawer";
import NewContactDrawer from "@/components/contacts/NewContactDrawer";
import BulkUploadContactsModal from "@/components/contacts/BulkUploadContactsModal";
import ManageCustomFieldsModal from "@/components/common/ManageCustomFieldsModal";
import MoreViewsDropdown from "@/components/common/MoreViewsDropdown";
import FilterSelect from "@/components/common/FilterSelect";
import { api } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Contact } from "@/lib/mockData";
import { useToast } from "@/components/common/ToastProvider";

const LIFECYCLE_STAGES = [
  "New",
  "Contacted",
  "Interested",
  "Qualified",
  "Customer"
];

const SOURCES = [
  "All Sources",
  "Meta Ads",
  "Google Ads",
  "Website Form",
  "Referral",
  "Cold Outreach",
  "WhatsApp",
  "Instagram",
  "LinkedIn Ads",
  "YouTube",
  "Advertisement",
  "Manual"
];

const CONTACTS_MORE_VIEWS = [
  "Customers",
  "With Open Deals",
  "Without Deals",
  "Untouched Enquiries (> 24h)",
  "Converted / Won",
  "Junk / Disqualified",
  "Recently modified",
  "Recently created"
];

export type SmartViewTab =
  | "All Contacts"
  | "My Contacts"
  | "New Leads"
  | "Today's Leads"
  | "Customers"
  | "With Open Deals"
  | "Without Deals"
  | "Untouched Enquiries (> 24h)"
  | "Converted / Won"
  | "Junk / Disqualified"
  | "Recently modified"
  | "Recently created";

export default function ContactsPage() {
  const { toast, confirm } = useToast();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Smart Views Tabs system
  const [activeTab, setActiveTab] = useState<SmartViewTab>("All Contacts");
  const [showMoreViewsDropdown, setShowMoreViewsDropdown] = useState(false);
  const [selectedSource, setSelectedSource] = useState<string>("All Sources");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Sleek Slide-Over Drawer for New Contact & Bulk Import Modal
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [showContactDropdown, setShowContactDropdown] = useState(false);
  
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<number | string>>(new Set());
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [openDrawerInEditMode, setOpenDrawerInEditMode] = useState(false);
  const [showCustomFields, setShowCustomFields] = useState(false);
  const [customFields, setCustomFields] = useState<any[]>([]);

  // Active action menu row ID for 3-dots
  const [activeActionMenuId, setActiveActionMenuId] = useState<number | string | null>(null);

  // Column Sorting state (Asc / Desc popup triggered by the 3-horizontal lines menu button)
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [activeSortMenuColumn, setActiveSortMenuColumn] = useState<string | null>(null);

  // Quick Deal Drawer/Modal State
  const [dealModalContact, setDealModalContact] = useState<Contact | null>(null);
  const [dealTitle, setDealTitle] = useState("");
  const [dealValue, setDealValue] = useState("");
  const [dealStage, setDealStage] = useState("Discovery");
  const [savingDeal, setSavingDeal] = useState(false);

  const loadContacts = async () => {
    try {
      const data = await api.getContacts();
      setContacts(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadCustomFields = async () => {
    try {
      const cfs = await api.getCustomFields("CONTACT");
      setCustomFields(cfs || []);
    } catch {}
  };

  useEffect(() => {
    loadContacts();
    loadCustomFields();
    try {
      const u = api.getCurrentUser();
      if (u) setCurrentUser(u);
    } catch {}

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const q = params.get("search");
      if (q) {
        setSearchQuery(q);
      }
    }
  }, []);

  const handleCreateContact = async (contactData: Partial<Contact>) => {
    await api.createContact(contactData);
    toast.success("Contact Created", `${contactData.name} was saved successfully to database.`);
    await loadContacts();
  };

  const handleDelete = async (id: number | string) => {
    const contact = contacts.find((c) => String(c.id) === String(id));
    const confirmed = await confirm({
      title: "Delete Contact",
      message: `Are you sure you want to delete ${contact ? `"${contact.name}"` : "this contact"}?`,
      confirmText: "Delete",
      cancelText: "Cancel",
      variant: "danger"
    });

    if (confirmed) {
      setContacts((prev) => prev.filter((c) => String(c.id) !== String(id)));
      await api.deleteContact(id);
      toast.success("Contact Deleted", "The contact record was deleted.");
    }
  };

  const handleStageChange = async (contactId: number | string, newStatus: string) => {
    setContacts((prev) =>
      prev.map((c) =>
        String(c.id) === String(contactId)
          ? { ...c, status: newStatus as any, lifecycle_stage: newStatus as any }
          : c
      )
    );
    toast.info("Status Changed", `Contact status updated to "${newStatus}"`);
    try {
      await api.updateContact(contactId, {
        status: newStatus,
        lifecycle_stage: newStatus
      });
    } catch {}
  };

  const handleOpenDealModal = (contact: Contact) => {
    setDealModalContact(contact);
    setDealTitle(`${contact.company_name || contact.name} - Deal`);
    setDealValue("");
    setDealStage("Discovery");
  };

  const handleSaveDealModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dealModalContact || !dealTitle.trim() || !dealValue) {
      toast.warning("Validation", "Please provide a deal title and amount.");
      return;
    }

    setSavingDeal(true);
    try {
      await api.createDeal({
        title: dealTitle.trim(),
        company_name: dealModalContact.company_name || dealModalContact.name,
        contact_name: dealModalContact.name,
        contact_id: dealModalContact.id,
        value: Number(dealValue) || 0,
        stage: dealStage,
        probability: 50,
        close_date: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0]
      });

      toast.success("Deal Created", `New deal attached to ${dealModalContact.name}.`);
      setDealModalContact(null);
      loadContacts();
    } catch (err: any) {
      toast.error("Error", err.message || "Failed to create deal.");
    } finally {
      setSavingDeal(false);
    }
  };

  const handleExportCsv = () => {
    if (contacts.length === 0) {
      toast.warning("Export Warning", "No contacts available to export.");
      return;
    }
    const headers = ["Name", "Job Title", "Company", "Mobile", "Email", "Source", "Lifecycle Stage", "Owner"];
    const rows = contacts.map((c) => [
      `"${c.name}"`,
      `"${c.job_title || ""}"`,
      `"${c.company_name || ""}"`,
      `"${c.phone}"`,
      `"${c.email || ""}"`,
      `"${c.source || "Manual"}"`,
      `"${c.lifecycle_stage || c.status || "New"}"`,
      `"${c.assigned_to || "Mohamed Thoufiq"}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `zigmaa_contacts_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Export Complete", `Exported ${contacts.length} contacts.`);
  };


  // Filtered contacts based on Smart Views tabs, Source dropdown, and Search query
  const filteredContacts = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    return contacts.filter((c) => {
      const rawStage = c.lifecycle_stage || c.status || "New";
      const stageLower = rawStage.toLowerCase();
      const contactOwner = (c.assigned_to || (c as any).assigned_user_name || "").toLowerCase();
      const currentUserName = (currentUser?.full_name || currentUser?.name || "Mohamed Thoufiq").toLowerCase();

      // 1. Smart Views Tab Filtering
      if (activeTab === "My Contacts") {
        if (!contactOwner.includes(currentUserName) && !currentUserName.includes(contactOwner)) {
          return false;
        }
      } else if (activeTab === "New Leads") {
        if (stageLower !== "new" && stageLower !== "lead") return false;
      } else if (activeTab === "Today's Leads") {
        const createdAtTime = c.created_at ? new Date(c.created_at).getTime() : 0;
        if (createdAtTime < todayStart) return false;
      } else if (activeTab === "Customers") {
        if (stageLower !== "customer" && stageLower !== "won") return false;
      } else if (activeTab === "With Open Deals") {
        const hasDeals = (c.deals && c.deals.length > 0) || (typeof c.total_deals === "number" && c.total_deals > 0);
        if (!hasDeals) return false;
      } else if (activeTab === "Without Deals") {
        const hasDeals = (c.deals && c.deals.length > 0) || (typeof c.total_deals === "number" && c.total_deals > 0);
        if (hasDeals) return false;
      } else if (activeTab === "Untouched Enquiries (> 24h)") {
        const createdAtTime = c.created_at ? new Date(c.created_at).getTime() : 0;
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        const isUntouched = (stageLower === "new" || stageLower === "lead") && createdAtTime > 0 && createdAtTime < oneDayAgo;
        if (!isUntouched) return false;
      } else if (activeTab === "Converted / Won") {
        if (stageLower !== "customer" && stageLower !== "won" && stageLower !== "qualified") return false;
      } else if (activeTab === "Junk / Disqualified") {
        if (stageLower !== "junk" && stageLower !== "lost" && stageLower !== "disqualified" && stageLower !== "archived") return false;
      } else if (activeTab === "Recently created") {
        const createdAtTime = c.created_at ? new Date(c.created_at).getTime() : 0;
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        if (createdAtTime < sevenDaysAgo) return false;
      } else if (activeTab === "Recently modified") {
        const updatedTime = c.updated_at ? new Date(c.updated_at).getTime() : (c.created_at ? new Date(c.created_at).getTime() : 0);
        const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
        if (updatedTime < threeDaysAgo) return false;
      }

      // 2. Source Selector Filtering
      if (selectedSource && selectedSource !== "All Sources") {
        const contactSrc = (c.source || "Manual").toLowerCase().trim();
        const targetSrc = selectedSource.toLowerCase().trim();
        if (targetSrc.includes("meta") && !contactSrc.includes("meta")) return false;
        else if (targetSrc.includes("google") && !contactSrc.includes("google")) return false;
        else if (targetSrc.includes("web") && !contactSrc.includes("web")) return false;
        else if (targetSrc.includes("referral") && !contactSrc.includes("referral")) return false;
        else if (targetSrc.includes("cold") && !contactSrc.includes("cold")) return false;
        else if (targetSrc.includes("whatsapp") && !contactSrc.includes("whatsapp")) return false;
        else if (targetSrc.includes("instagram") && !contactSrc.includes("instagram")) return false;
        else if (targetSrc.includes("linkedin") && !contactSrc.includes("linkedin")) return false;
        else if (targetSrc.includes("youtube") && !contactSrc.includes("youtube")) return false;
        else if (targetSrc.includes("advertisement") && !contactSrc.includes("advert")) return false;
        else if (targetSrc.includes("manual") && !contactSrc.includes("manual")) return false;
        else if (!contactSrc.includes(targetSrc) && !targetSrc.includes(contactSrc)) return false;
      }

      // 3. Instant Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q) ||
          (c.email && c.email.toLowerCase().includes(q)) ||
          (c.company_name && c.company_name.toLowerCase().includes(q)) ||
          (c.assigned_to && c.assigned_to.toLowerCase().includes(q))
        );
      }

      return true;
    });
  }, [contacts, activeTab, selectedSource, searchQuery, currentUser]);

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedContacts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedContacts.map((c) => c.id)));
    }
  };

  const toggleSelectOne = (id: number | string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  // Sorted contacts based on sortField & sortOrder
  const sortedContacts = useMemo(() => {
    if (!sortField) return filteredContacts;
    const sorted = [...filteredContacts].sort((a, b) => {
      let aVal = (a as any)[sortField] ?? "";
      let bVal = (b as any)[sortField] ?? "";
      if (sortField === "lifecycle_stage") {
        aVal = a.lifecycle_stage || a.status || "";
        bVal = b.lifecycle_stage || b.status || "";
      }
      const strA = String(aVal).toLowerCase();
      const strB = String(bVal).toLowerCase();
      if (strA < strB) return sortOrder === "asc" ? -1 : 1;
      if (strA > strB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredContacts, sortField, sortOrder]);

  const totalPages = Math.ceil(sortedContacts.length / pageSize) || 1;
  const paginatedContacts = sortedContacts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const startRecordIndex = sortedContacts.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRecordIndex = Math.min(currentPage * pageSize, sortedContacts.length);

  // Quick stats summary for Twozo-style footer
  const contactsWithDealsCount = useMemo(() => {
    return filteredContacts.filter(
      (c) => (c.deals && c.deals.length > 0) || (typeof c.total_deals === "number" && c.total_deals > 0)
    ).length;
  }, [filteredContacts]);

  const contactsWithoutDealsCount = useMemo(() => {
    return filteredContacts.length - contactsWithDealsCount;
  }, [filteredContacts, contactsWithDealsCount]);

  const untouchedContactsCount = useMemo(() => {
    return filteredContacts.filter((c) => {
      const st = (c.lifecycle_stage || c.status || "").toLowerCase();
      return st === "new" || st === "lead";
    }).length;
  }, [filteredContacts]);

  // Helper for source badge
  const renderSourceBadge = (src?: string) => {
    const s = (src || "Manual").toUpperCase();
    if (s.includes("META")) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          Meta Ads
        </span>
      );
    }
    if (s.includes("GOOGLE")) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          Google Ads
        </span>
      );
    }
    if (s.includes("WEB")) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
          Website Form
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
        Manual
      </span>
    );
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] text-slate-900 font-sans overflow-hidden select-none">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />

        <main className="flex-1 flex flex-col min-h-0 bg-[#F8FAFC] overflow-hidden p-4 lg:p-6 pb-2">
          {/* Controls: ONE Clean Row Above Table (Matches second image: Tabs on Left | Actions on Right in a single row) */}
          <div className="flex items-center justify-between gap-3 pb-3 shrink-0">
            {/* Left: Navigation Tabs + More Views (···) */}
            <div className="flex items-center gap-1.5 text-sm shrink-0">
              {(
                [
                  "All Contacts",
                  "My Contacts",
                  "New Leads",
                  "Today's Leads"
                ] as const
              ).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={(e) => {
                    setActiveTab(tab);
                    setCurrentPage(1);
                    e.currentTarget.blur();
                  }}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap text-xs sm:text-sm outline-none! focus:outline-none! focus-visible:outline-none! ring-0! focus:ring-0! focus-visible:ring-0! border select-none ${
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
                views={CONTACTS_MORE_VIEWS}
                activeView={activeTab}
                onSelect={(view) => {
                  setActiveTab(view as SmartViewTab);
                  setCurrentPage(1);
                }}
              />
            </div>

            {/* Right Actions: [Search] [Source ▾] [+ Add Contact] [Export] [Fields Icon] in one row */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Search Box */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-8.5 pr-3 h-9 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 w-32 md:w-36 lg:w-40 shadow-2xs transition-all"
                />
              </div>

              {/* Standard FilterSelect Source Dropdown */}
              <FilterSelect
                placeholder="Source"
                value={selectedSource === "All Sources" ? "" : selectedSource}
                options={SOURCES.filter((s) => s !== "All Sources")}
                onChange={(val) => {
                  setSelectedSource(val === "ALL" ? "All Sources" : val);
                  setCurrentPage(1);
                }}
                className="shrink-0 [&>button]:h-9 [&>button]:py-0 [&>button]:px-3 [&>button]:text-xs sm:[&>button]:text-sm"
              />

              {/* Add Contact with Split Dropdown */}
              <div className="relative inline-block shrink-0">
                <div className="inline-flex rounded-xl shadow-xs overflow-hidden bg-red-600 hover:bg-red-700 transition-colors h-9">
                  <button
                    type="button"
                    onClick={() => setShowAddDrawer(true)}
                    className="px-3 text-white text-xs sm:text-sm font-semibold cursor-pointer flex items-center gap-1.5 hover:bg-red-700 active:bg-red-800 transition-colors whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Contact</span>
                  </button>

                  <div className="w-[1px] bg-red-500/80 my-1 shrink-0" />

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowContactDropdown((prev) => !prev);
                    }}
                    className="px-2 text-white text-xs sm:text-sm font-semibold cursor-pointer flex items-center justify-center hover:bg-red-700 active:bg-red-800 transition-colors"
                    title="More options"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Dropdown Menu */}
                {showContactDropdown && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowContactDropdown(false)}
                    />
                    <div className="absolute right-0 top-full mt-1.5 w-52 bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-100 text-left">
                      <button
                        type="button"
                        onClick={() => {
                          setShowContactDropdown(false);
                          setShowAddDrawer(true);
                        }}
                        className="w-full px-3.5 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer font-medium text-xs"
                      >
                        <Plus className="w-4 h-4 text-red-600 shrink-0" />
                        <span>Add Single Contact</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowContactDropdown(false);
                          setShowBulkUpload(true);
                        }}
                        className="w-full px-3.5 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer font-medium text-xs"
                      >
                        <Upload className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Bulk Import (CSV / Excel)</span>
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Export Button */}
              <button
                type="button"
                onClick={handleExportCsv}
                className="h-9 px-3.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs sm:text-sm font-semibold shadow-2xs transition-colors cursor-pointer flex items-center justify-center shrink-0 whitespace-nowrap"
              >
                Export
              </button>

              {/* Manage Custom Fields Icon Button with Tooltip */}
              <div className="relative group/fields shrink-0">
                <button
                  type="button"
                  onClick={() => setShowCustomFields(true)}
                  className="w-9 h-9 bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl shadow-2xs transition-colors cursor-pointer flex items-center justify-center"
                  aria-label="Fields"
                >
                  <Sliders className="w-4 h-4" />
                </button>
                {/* Sleek Tooltip on Hover */}
                <div className="absolute right-0 top-full mt-1.5 pointer-events-none opacity-0 group-hover/fields:opacity-100 transition-opacity duration-150 z-30">
                  <div className="bg-slate-800 text-white text-[11px] font-medium py-1 px-2.5 rounded-lg shadow-md whitespace-nowrap">
                    Fields
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* TABLE CONTAINER: Stretches full remaining height so footer is strictly anchored at the bottom */}
          <div className="bg-white border border-slate-200/80 rounded-xl shadow-xs flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Scrollable table body area */}
            <div className="flex-1 overflow-auto custom-scrollbar">
              <table className="w-full border-separate border-spacing-0 text-left text-sm min-w-[950px]">
                <thead className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_#f1f5f9]">
                  <tr className="bg-white text-[12px] font-medium text-slate-500 tracking-normal capitalize select-none">
                    <th className="py-3 px-3 w-10 text-center border-b border-r border-slate-200/70">
                      <div className="flex items-center justify-center">
                        <button
                          type="button"
                          onClick={toggleSelectAll}
                          className="flex items-center justify-center cursor-pointer text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          {selectedIds.size > 0 && selectedIds.size === paginatedContacts.length ? (
                            <CheckSquare className="w-4 h-4 text-red-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300 hover:text-slate-400" />
                          )}
                        </button>
                      </div>
                    </th>
                    {/* Contact Name Header */}
                    <th className="py-3 px-4 border-b border-r border-slate-200/70 min-w-[200px]">
                      <div className="flex items-center justify-between relative">
                        <span className="font-medium text-slate-700">Contact Name</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveSortMenuColumn(activeSortMenuColumn === "name" ? null : "name");
                          }}
                          className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors cursor-pointer ${
                            sortField === "name" ? "bg-red-50 text-red-600" : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                          }`}
                          title="Sort Contact Name"
                        >
                          <Menu className="w-3.5 h-3.5" />
                        </button>

                        {/* Asc / Desc Popover Menu */}
                        {activeSortMenuColumn === "name" && (
                          <>
                            <div
                              className="fixed inset-0 z-30"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveSortMenuColumn(null);
                              }}
                            />
                            <div className="absolute left-0 top-full mt-1 w-32 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-40 text-xs animate-in fade-in zoom-in-95 duration-100 font-normal text-slate-700">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSortField("name");
                                  setSortOrder("asc");
                                  setActiveSortMenuColumn(null);
                                }}
                                className={`w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-50 cursor-pointer ${
                                  sortField === "name" && sortOrder === "asc" ? "text-red-600 font-bold bg-red-50/50" : ""
                                }`}
                              >
                                <ArrowUp className="w-3.5 h-3.5 text-slate-500" />
                                <span>Asc</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSortField("name");
                                  setSortOrder("desc");
                                  setActiveSortMenuColumn(null);
                                }}
                                className={`w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-50 cursor-pointer ${
                                  sortField === "name" && sortOrder === "desc" ? "text-red-600 font-bold bg-red-50/50" : ""
                                }`}
                              >
                                <ArrowDown className="w-3.5 h-3.5 text-slate-500" />
                                <span>Desc</span>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </th>

                    {/* Email Header */}
                    <th className="py-3 px-4 border-b border-r border-slate-200/70 min-w-[200px]">
                      <div className="flex items-center justify-between relative">
                        <span className="font-medium text-slate-700">Email</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveSortMenuColumn(activeSortMenuColumn === "email" ? null : "email");
                          }}
                          className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors cursor-pointer ${
                            sortField === "email" ? "bg-red-50 text-red-600" : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                          }`}
                          title="Sort Email"
                        >
                          <Menu className="w-3.5 h-3.5" />
                        </button>

                        {activeSortMenuColumn === "email" && (
                          <>
                            <div
                              className="fixed inset-0 z-30"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveSortMenuColumn(null);
                              }}
                            />
                            <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-40 text-xs animate-in fade-in zoom-in-95 duration-100 font-normal text-slate-700">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSortField("email");
                                  setSortOrder("asc");
                                  setActiveSortMenuColumn(null);
                                }}
                                className={`w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-50 cursor-pointer ${
                                  sortField === "email" && sortOrder === "asc" ? "text-red-600 font-bold bg-red-50/50" : ""
                                }`}
                              >
                                <ArrowUp className="w-3.5 h-3.5 text-slate-500" />
                                <span>Asc</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSortField("email");
                                  setSortOrder("desc");
                                  setActiveSortMenuColumn(null);
                                }}
                                className={`w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-50 cursor-pointer ${
                                  sortField === "email" && sortOrder === "desc" ? "text-red-600 font-bold bg-red-50/50" : ""
                                }`}
                              >
                                <ArrowDown className="w-3.5 h-3.5 text-slate-500" />
                                <span>Desc</span>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </th>

                    {/* Phone Header */}
                    <th className="py-3 px-4 border-b border-r border-slate-200/70 min-w-[160px]">
                      <div className="flex items-center justify-between relative">
                        <span className="font-medium text-slate-700">Phone</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveSortMenuColumn(activeSortMenuColumn === "phone" ? null : "phone");
                          }}
                          className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors cursor-pointer ${
                            sortField === "phone" ? "bg-red-50 text-red-600" : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                          }`}
                          title="Sort Phone"
                        >
                          <Menu className="w-3.5 h-3.5" />
                        </button>

                        {activeSortMenuColumn === "phone" && (
                          <>
                            <div
                              className="fixed inset-0 z-30"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveSortMenuColumn(null);
                              }}
                            />
                            <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-40 text-xs animate-in fade-in zoom-in-95 duration-100 font-normal text-slate-700">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSortField("phone");
                                  setSortOrder("asc");
                                  setActiveSortMenuColumn(null);
                                }}
                                className={`w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-50 cursor-pointer ${
                                  sortField === "phone" && sortOrder === "asc" ? "text-red-600 font-bold bg-red-50/50" : ""
                                }`}
                              >
                                <ArrowUp className="w-3.5 h-3.5 text-slate-500" />
                                <span>Asc</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSortField("phone");
                                  setSortOrder("desc");
                                  setActiveSortMenuColumn(null);
                                }}
                                className={`w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-50 cursor-pointer ${
                                  sortField === "phone" && sortOrder === "desc" ? "text-red-600 font-bold bg-red-50/50" : ""
                                }`}
                              >
                                <ArrowDown className="w-3.5 h-3.5 text-slate-500" />
                                <span>Desc</span>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </th>

                    {/* Company Header */}
                    <th className="py-3 px-4 border-b border-r border-slate-200/70 min-w-[150px]">
                      <div className="flex items-center justify-between relative">
                        <span className="font-medium text-slate-700">Company</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveSortMenuColumn(activeSortMenuColumn === "company_name" ? null : "company_name");
                          }}
                          className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors cursor-pointer ${
                            sortField === "company_name" ? "bg-red-50 text-red-600" : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                          }`}
                          title="Sort Company"
                        >
                          <Menu className="w-3.5 h-3.5" />
                        </button>

                        {activeSortMenuColumn === "company_name" && (
                          <>
                            <div
                              className="fixed inset-0 z-30"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveSortMenuColumn(null);
                              }}
                            />
                            <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-40 text-xs animate-in fade-in zoom-in-95 duration-100 font-normal text-slate-700">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSortField("company_name");
                                  setSortOrder("asc");
                                  setActiveSortMenuColumn(null);
                                }}
                                className={`w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-50 cursor-pointer ${
                                  sortField === "company_name" && sortOrder === "asc" ? "text-red-600 font-bold bg-red-50/50" : ""
                                }`}
                              >
                                <ArrowUp className="w-3.5 h-3.5 text-slate-500" />
                                <span>Asc</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSortField("company_name");
                                  setSortOrder("desc");
                                  setActiveSortMenuColumn(null);
                                }}
                                className={`w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-50 cursor-pointer ${
                                  sortField === "company_name" && sortOrder === "desc" ? "text-red-600 font-bold bg-red-50/50" : ""
                                }`}
                              >
                                <ArrowDown className="w-3.5 h-3.5 text-slate-500" />
                                <span>Desc</span>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </th>

                    {/* Source Header */}
                    <th className="py-3 px-4 border-b border-r border-slate-200/70 min-w-[130px]">
                      <div className="flex items-center justify-between relative">
                        <span className="font-medium text-slate-700">Source</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveSortMenuColumn(activeSortMenuColumn === "source" ? null : "source");
                          }}
                          className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors cursor-pointer ${
                            sortField === "source" ? "bg-red-50 text-red-600" : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                          }`}
                          title="Sort Source"
                        >
                          <Menu className="w-3.5 h-3.5" />
                        </button>

                        {activeSortMenuColumn === "source" && (
                          <>
                            <div
                              className="fixed inset-0 z-30"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveSortMenuColumn(null);
                              }}
                            />
                            <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-40 text-xs animate-in fade-in zoom-in-95 duration-100 font-normal text-slate-700">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSortField("source");
                                  setSortOrder("asc");
                                  setActiveSortMenuColumn(null);
                                }}
                                className={`w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-50 cursor-pointer ${
                                  sortField === "source" && sortOrder === "asc" ? "text-red-600 font-bold bg-red-50/50" : ""
                                }`}
                              >
                                <ArrowUp className="w-3.5 h-3.5 text-slate-500" />
                                <span>Asc</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSortField("source");
                                  setSortOrder("desc");
                                  setActiveSortMenuColumn(null);
                                }}
                                className={`w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-50 cursor-pointer ${
                                  sortField === "source" && sortOrder === "desc" ? "text-red-600 font-bold bg-red-50/50" : ""
                                }`}
                              >
                                <ArrowDown className="w-3.5 h-3.5 text-slate-500" />
                                <span>Desc</span>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </th>

                    {/* Lifecycle Stage Header */}
                    <th className="py-3 px-4 border-b border-r border-slate-200/70 min-w-[150px]">
                      <div className="flex items-center justify-between relative">
                        <span className="font-medium text-slate-700">Lifecycle Stage</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveSortMenuColumn(activeSortMenuColumn === "lifecycle_stage" ? null : "lifecycle_stage");
                          }}
                          className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors cursor-pointer ${
                            sortField === "lifecycle_stage" ? "bg-red-50 text-red-600" : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                          }`}
                          title="Sort Stage"
                        >
                          <Menu className="w-3.5 h-3.5" />
                        </button>

                        {activeSortMenuColumn === "lifecycle_stage" && (
                          <>
                            <div
                              className="fixed inset-0 z-30"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveSortMenuColumn(null);
                              }}
                            />
                            <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-40 text-xs animate-in fade-in zoom-in-95 duration-100 font-normal text-slate-700">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSortField("lifecycle_stage");
                                  setSortOrder("asc");
                                  setActiveSortMenuColumn(null);
                                }}
                                className={`w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-50 cursor-pointer ${
                                  sortField === "lifecycle_stage" && sortOrder === "asc" ? "text-red-600 font-bold bg-red-50/50" : ""
                                }`}
                              >
                                <ArrowUp className="w-3.5 h-3.5 text-slate-500" />
                                <span>Asc</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSortField("lifecycle_stage");
                                  setSortOrder("desc");
                                  setActiveSortMenuColumn(null);
                                }}
                                className={`w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-50 cursor-pointer ${
                                  sortField === "lifecycle_stage" && sortOrder === "desc" ? "text-red-600 font-bold bg-red-50/50" : ""
                                }`}
                              >
                                <ArrowDown className="w-3.5 h-3.5 text-slate-500" />
                                <span>Desc</span>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </th>

                    {/* Owner Header */}
                    <th className="py-3 px-4 border-b border-r border-slate-200/70 min-w-[150px]">
                      <div className="flex items-center justify-between relative">
                        <span className="font-medium text-slate-700">Owner</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveSortMenuColumn(activeSortMenuColumn === "assigned_to" ? null : "assigned_to");
                          }}
                          className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors cursor-pointer ${
                            sortField === "assigned_to" ? "bg-red-50 text-red-600" : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                          }`}
                          title="Sort Owner"
                        >
                          <Menu className="w-3.5 h-3.5" />
                        </button>

                        {activeSortMenuColumn === "assigned_to" && (
                          <>
                            <div
                              className="fixed inset-0 z-30"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveSortMenuColumn(null);
                              }}
                            />
                            <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-40 text-xs animate-in fade-in zoom-in-95 duration-100 font-normal text-slate-700">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSortField("assigned_to");
                                  setSortOrder("asc");
                                  setActiveSortMenuColumn(null);
                                }}
                                className={`w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-50 cursor-pointer ${
                                  sortField === "assigned_to" && sortOrder === "asc" ? "text-red-600 font-bold bg-red-50/50" : ""
                                }`}
                              >
                                <ArrowUp className="w-3.5 h-3.5 text-slate-500" />
                                <span>Asc</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSortField("assigned_to");
                                  setSortOrder("desc");
                                  setActiveSortMenuColumn(null);
                                }}
                                className={`w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-50 cursor-pointer ${
                                  sortField === "assigned_to" && sortOrder === "desc" ? "text-red-600 font-bold bg-red-50/50" : ""
                                }`}
                              >
                                <ArrowDown className="w-3.5 h-3.5 text-slate-500" />
                                <span>Desc</span>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </th>

                    <th className="py-3 px-3 text-right border-b border-slate-100 w-28">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {paginatedContacts.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-24 text-center">
                        <div className="max-w-md mx-auto space-y-1.5">
                          <p className="text-sm font-semibold text-slate-800">No contacts found</p>
                          <p className="text-xs text-slate-400">Inbound enquiries and verified clients will appear in this unified directory.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedContacts.map((contact) => {
                      const isSelected = selectedIds.has(contact.id);
                      const currentStage = contact.lifecycle_stage || contact.status || "New";
                      const isMenuOpen = activeActionMenuId === contact.id;
                      // Clean initials for avatar
                      const initials = (contact.name || "C")
                        .trim()
                        .split(/\s+/)
                        .map((part) => part[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase();

                      return (
                        <tr
                          key={contact.id}
                          onClick={() => {
                            setOpenDrawerInEditMode(false);
                            setSelectedContact(contact);
                          }}
                          className={`hover:bg-slate-50/70 transition-colors cursor-pointer group ${
                            isSelected ? "bg-red-50/30" : ""
                          }`}
                        >
                          {/* Checkbox */}
                          <td
                            className="py-3.5 px-3 text-center border-b border-slate-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSelectOne(contact.id);
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

                          {/* Contact Name (Single Column with Initials Circle Avatar) */}
                          <td className="py-3.5 px-4 border-b border-slate-100">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center shrink-0 border border-slate-200/80">
                                {initials || "C"}
                              </div>
                              <span className="font-medium text-slate-800 group-hover:text-red-600 transition-colors text-[13px] truncate">
                                {contact.name || "—"}
                              </span>
                            </div>
                          </td>

                          {/* Email (Clean slate styling, no red) */}
                          <td className="py-3.5 px-4 border-b border-slate-100" onClick={(e) => e.stopPropagation()}>
                            {contact.email ? (
                              <a
                                href={`mailto:${contact.email}`}
                                className="text-[12px] font-normal text-slate-600 hover:text-slate-900 hover:underline block truncate"
                              >
                                {contact.email}
                              </a>
                            ) : (
                              <span className="text-[12px] text-slate-400 font-normal">—</span>
                            )}
                          </td>

                          {/* Phones (Strict single line, clean straight alignment) */}
                          <td className="py-3.5 px-4 border-b border-slate-100" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-2 text-[13px] text-slate-800 font-sans whitespace-nowrap">
                              <span className="font-mono tracking-tight select-text">{contact.phone || "—"}</span>
                              {contact.phone && (
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <a
                                    href={`tel:${contact.phone}`}
                                    className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                    title="Call"
                                  >
                                    <Phone className="w-3 h-3" />
                                  </a>
                                  <a
                                    href={`https://wa.me/${contact.phone.replace(/[^0-9]/g, "")}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1 rounded text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                                    title="WhatsApp"
                                  >
                                    <MessageSquare className="w-3 h-3" />
                                  </a>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Company */}
                          <td className="py-3.5 px-4 border-b border-slate-100 text-[13px] text-slate-600">
                            {contact.company_name ? (
                              <span className="inline-flex items-center gap-1.5 truncate">
                                <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="truncate">{contact.company_name}</span>
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>

                          {/* Source Tag */}
                          <td className="py-3.5 px-4 border-b border-slate-100">
                            {renderSourceBadge(contact.source)}
                          </td>

                          {/* Lifecycle Stage */}
                          <td className="py-3.5 px-4 border-b border-slate-100" onClick={(e) => e.stopPropagation()}>
                            <div className="relative inline-block">
                              <select
                                value={currentStage}
                                onChange={(e) => handleStageChange(contact.id, e.target.value)}
                                className="appearance-none bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-medium py-1 pl-2.5 pr-6 rounded-full focus:outline-none focus:ring-1 focus:ring-red-400 cursor-pointer transition-colors shadow-2xs"
                              >
                                {LIFECYCLE_STAGES.map((st) => (
                                  <option key={st} value={st}>{st}</option>
                                ))}
                              </select>
                              <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                          </td>

                          {/* Owner */}
                          <td className="py-3.5 px-4 border-b border-slate-100">
                            <div className="flex items-center gap-2 text-[13px] text-slate-700">
                              <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-semibold flex items-center justify-center shrink-0 border border-slate-200">
                                {(contact.assigned_to || "M").substring(0, 1).toUpperCase()}
                              </div>
                              <span className="truncate">{contact.assigned_to || "Mohamed Thoufiq"}</span>
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-3 border-b border-slate-100 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5 relative">
                              <button
                                type="button"
                                onClick={() => handleOpenDealModal(contact)}
                                className="text-red-600 border border-red-200/90 hover:bg-red-50 hover:border-red-300 text-[11px] px-2 py-0.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                                title="Attach Deal"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Deal</span>
                              </button>

                              {/* Three-dots menu */}
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={() => setActiveActionMenuId(isMenuOpen ? null : contact.id)}
                                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                  title="Options"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </button>

                                {isMenuOpen && (
                                  <>
                                    <div
                                      className="fixed inset-0 z-30"
                                      onClick={() => setActiveActionMenuId(null)}
                                    />
                                    <div className="absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-40 text-xs animate-in fade-in zoom-in-95 duration-100 text-left">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveActionMenuId(null);
                                          setOpenDrawerInEditMode(false);
                                          setSelectedContact(contact);
                                        }}
                                        className="w-full px-3.5 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer font-medium"
                                      >
                                        <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                                        <span>View Details</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveActionMenuId(null);
                                          setOpenDrawerInEditMode(true);
                                          setSelectedContact(contact);
                                        }}
                                        className="w-full px-3.5 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer font-medium"
                                      >
                                        <Edit2 className="w-3.5 h-3.5 text-red-600" />
                                        <span className="font-semibold text-slate-900">Edit Contact</span>
                                      </button>
                                      <div className="my-1 border-t border-slate-100" />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveActionMenuId(null);
                                          handleDelete(contact.id);
                                        }}
                                        className="w-full px-3.5 py-2 text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer font-medium"
                                      >
                                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                        <span>Delete Contact</span>
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* CLEAN BOTTOM PAGINATION FOOTER BAR: Docked at the bottom, no clutter */}
            <div className="shrink-0 bg-white border-t border-slate-100 px-5 py-3 flex items-center justify-between text-xs text-slate-600 font-medium flex-wrap gap-4">
              {/* Left: Showing 1-X of Y + Page Chevrons */}
              <div className="flex items-center gap-3">
                <span className="text-slate-500 font-normal">
                  Showing <strong className="font-semibold text-slate-700">{startRecordIndex}-{endRecordIndex}</strong> of <strong className="font-semibold text-slate-700">{filteredContacts.length}</strong>
                </span>

                <div className="flex items-center gap-1.5 ml-2">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 hover:bg-slate-50 text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                    title="Previous Page"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>

                  <div className="w-7 h-7 flex items-center justify-center rounded bg-red-600 text-white font-semibold text-xs shadow-2xs">
                    {currentPage}
                  </div>

                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 hover:bg-slate-50 text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                    title="Next Page"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {selectedIds.size > 0 && (
                  <span className="ml-3 text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                    {selectedIds.size} selected
                  </span>
                )}
              </div>

              {/* Right: Per Page Select Dropdown with clean spacing */}
              <div className="flex items-center gap-3 pr-2">
                <div className="relative inline-block">
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="appearance-none bg-white border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900 text-xs font-medium py-1.5 pl-3.5 pr-8 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500 cursor-pointer transition-colors shadow-2xs"
                  >
                    <option value={10}>Showing 10 Per Page</option>
                    <option value={20}>Showing 20 Per Page</option>
                    <option value={25}>Showing 25 Per Page</option>
                    <option value={50}>Showing 50 Per Page</option>
                    <option value={100}>Showing 100 Per Page</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* NEW CONTACT SLIDE-OVER DRAWER */}
      <NewContactDrawer
        isOpen={showAddDrawer}
        onClose={() => setShowAddDrawer(false)}
        onSubmit={handleCreateContact}
        customFields={customFields}
        currentUser={currentUser}
      />

      {/* BULK UPLOAD CONTACTS MODAL */}
      <BulkUploadContactsModal
        isOpen={showBulkUpload}
        onClose={() => setShowBulkUpload(false)}
        onSuccess={() => {
          loadContacts();
          toast.success("Import Complete", "Contacts imported successfully.");
        }}
      />

      {/* QUICK CREATE DEAL ACTION DRAWER / POPUP */}
      {dealModalContact && (
        <div className="fixed inset-0 z-60 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
                  <Handshake className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Create Deal</h3>
                  <p className="text-[11px] text-slate-500">For {dealModalContact.name}</p>
                </div>
              </div>
              <button
                onClick={() => setDealModalContact(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDealModal} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Deal Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={dealTitle}
                  onChange={(e) => setDealTitle(e.target.value)}
                  className="w-full bg-slate-50 text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Deal Value (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    placeholder="e.g. 50000"
                    value={dealValue}
                    onChange={(e) => setDealValue(e.target.value)}
                    className="w-full bg-slate-50 text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Pipeline Stage
                  </label>
                  <select
                    value={dealStage}
                    onChange={(e) => setDealStage(e.target.value)}
                    className="w-full bg-slate-50 text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 font-medium"
                  >
                    <option value="New Deal">New Deal</option>
                    <option value="Discovery">Discovery</option>
                    <option value="Proposal Sent">Proposal Sent</option>
                    <option value="Negotiation">Negotiation</option>
                    <option value="Won">Won</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDealModalContact(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingDeal}
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {savingDeal ? "Saving..." : "Create Deal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Twozo Style Slide-over Profile Drawer */}
      <ContactSlideDrawer
        contact={selectedContact}
        isOpen={!!selectedContact}
        onClose={() => {
          setSelectedContact(null);
          setOpenDrawerInEditMode(false);
        }}
        onUpdated={loadContacts}
        onOpenCreateDeal={(c) => handleOpenDealModal(c)}
        initialEditMode={openDrawerInEditMode}
      />

      {/* Manage Custom Fields Modal */}
      <ManageCustomFieldsModal
        entityType="CONTACT"
        isOpen={showCustomFields}
        onClose={() => setShowCustomFields(false)}
        onFieldsChanged={() => {
          loadCustomFields();
          loadContacts();
        }}
      />
    </div>
  );
}
