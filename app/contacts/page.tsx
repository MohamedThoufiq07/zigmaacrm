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
  Filter,
  SlidersHorizontal,
  RotateCw,
  MoreVertical,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Tag,
  Handshake,
  User,
  Sliders
} from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import FilterSelect from "@/components/common/FilterSelect";
import ContactSlideDrawer from "@/components/contacts/ContactSlideDrawer";
import ManageCustomFieldsModal from "@/components/common/ManageCustomFieldsModal";
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
  "Meta Ads",
  "Google Ads",
  "Website",
  "Manual"
];

export default function ContactsPage() {
  const { toast, confirm } = useToast();
  const [contacts, setContacts] = useState<Contact[]>([]);

  // Top Filter Tabs: [ All Contacts | New Leads | In Progress | Customers ]
  const [activeTab, setActiveTab] = useState<"All Contacts" | "New Leads" | "In Progress" | "Customers">("All Contacts");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<number | string>>(new Set());
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showCustomFields, setShowCustomFields] = useState(false);
  const [customFields, setCustomFields] = useState<any[]>([]);
  const [customData, setCustomData] = useState<Record<string, any>>({});

  // Quick Deal Modal from Actions
  const [dealModalContact, setDealModalContact] = useState<Contact | null>(null);
  const [dealTitle, setDealTitle] = useState("");
  const [dealValue, setDealValue] = useState("");
  const [dealStage, setDealStage] = useState("Discovery");
  const [savingDeal, setSavingDeal] = useState(false);

  // Form Fields for Add Contact
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [source, setSource] = useState("Manual");
  const [lifecycleStage, setLifecycleStage] = useState("New");

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
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;

    const newContactData: Partial<Contact> = {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      company_name: companyName.trim(),
      job_title: jobTitle.trim(),
      source: source as any,
      status: lifecycleStage as any,
      lifecycle_stage: lifecycleStage as any,
      custom_data: customData
    };

    // Optimistic Update
    const temp: Contact = {
      id: Date.now(),
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      company_name: companyName.trim(),
      job_title: jobTitle.trim(),
      source: source as any,
      status: lifecycleStage as any,
      lifecycle_stage: lifecycleStage as any,
      assigned_to: "Mohamed Thoufiq",
      custom_data: customData,
      total_deals: 0,
      lifetime_value: 0,
      created_at: new Date().toISOString()
    };
    setContacts((prev) => [temp, ...prev]);

    await api.createContact(newContactData);
    setName("");
    setEmail("");
    setPhone("");
    setCompanyName("");
    setJobTitle("");
    setSource("Manual");
    setLifecycleStage("New");
    setCustomData({});
    setShowAddModal(false);
    toast.success("Contact Created", `${newContactData.name} was added successfully.`);
    loadContacts();
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

  // Filtered contacts based on tabs & search
  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      const stage = (c.lifecycle_stage || c.status || "New").toLowerCase();

      // Top Tabs Filter: [ All Contacts | New Leads | In Progress | Customers ]
      if (activeTab === "New Leads") {
        if (stage !== "new" && stage !== "lead") return false;
      } else if (activeTab === "In Progress") {
        if (!["contacted", "interested", "qualified", "active"].includes(stage)) return false;
      } else if (activeTab === "Customers") {
        if (stage !== "customer" && stage !== "won") return false;
      }

      // Status dropdown filter
      if (selectedStatus !== "ALL" && c.status !== selectedStatus && c.lifecycle_stage !== selectedStatus) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q) ||
          (c.email && c.email.toLowerCase().includes(q)) ||
          (c.company_name && c.company_name.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [contacts, activeTab, selectedStatus, searchQuery]);

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

  const totalPages = Math.ceil(filteredContacts.length / pageSize) || 1;
  const paginatedContacts = filteredContacts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Helper for source badge
  const renderSourceBadge = (src?: string) => {
    const s = (src || "Manual").toUpperCase();
    if (s.includes("META")) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
          Meta Ads
        </span>
      );
    }
    if (s.includes("GOOGLE")) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          Google Ads
        </span>
      );
    }
    if (s.includes("WEB")) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
          Website
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
        Manual
      </span>
    );
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] text-slate-900 font-sans overflow-hidden select-none">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />

        <main className="flex-1 overflow-y-auto p-5 lg:p-7 space-y-5 custom-scrollbar">
          {/* Controls: ONE Straight Row Above Table */}
          <div className="flex flex-wrap lg:flex-nowrap items-center justify-between gap-3">
            {/* Left: Top Filter Tabs [ All Contacts | New Leads | In Progress | Customers ] */}
            <div className="flex items-center gap-1.5 text-sm flex-wrap sm:flex-nowrap">
              {(["All Contacts", "New Leads", "In Progress", "Customers"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab);
                    setCurrentPage(1);
                  }}
                  className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap text-xs border ${
                    activeTab === tab
                      ? "bg-red-50 text-red-600 border-red-200 shadow-2xs"
                      : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Right Actions: [Search] [Status Filter] [Add Contact] [Export] [Fields] */}
            <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
              {/* Search Box */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search contacts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 w-44 lg:w-56"
                />
              </div>

              {/* Status Filter */}
              <FilterSelect
                placeholder="Stage"
                value={selectedStatus}
                options={LIFECYCLE_STAGES}
                onChange={(val) => {
                  setSelectedStatus(val);
                  setCurrentPage(1);
                }}
              />

              {/* Add Contact Button */}
              <button
                onClick={() => setShowAddModal(true)}
                className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Contact</span>
              </button>

              <button
                onClick={handleExportCsv}
                className="px-3.5 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer"
              >
                Export
              </button>

              {/* Manage Custom Fields Button */}
              <button
                type="button"
                onClick={() => setShowCustomFields(true)}
                className="px-3 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
                title="Manage Custom Attributes"
              >
                <Sliders className="w-3.5 h-3.5 text-slate-500" />
                <span>Fields</span>
              </button>
            </div>
          </div>

          {/* TABLE VIEW (Single Source of Truth Table) */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-xs font-bold text-slate-700 uppercase tracking-wider">
                    <th className="py-3 px-3 w-12 text-center border-r border-slate-200/80">
                      <div className="flex items-center justify-center">
                        <button
                          onClick={toggleSelectAll}
                          className="flex items-center justify-center cursor-pointer text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          {selectedIds.size > 0 && selectedIds.size === paginatedContacts.length ? (
                            <CheckSquare className="w-4 h-4 text-red-600" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </th>
                    <th className="px-4 py-3.5 border-r border-slate-200/80">Contact Name</th>
                    <th className="px-4 py-3.5 border-r border-slate-200/80">Mobile Number</th>
                    <th className="px-4 py-3.5 border-r border-slate-200/80">Company</th>
                    <th className="px-4 py-3.5 border-r border-slate-200/80">Source</th>
                    <th className="px-4 py-3.5 border-r border-slate-200/80">Lifecycle Stage</th>
                    <th className="px-4 py-3.5 border-r border-slate-200/80">Owner</th>
                    <th className="px-4 py-3.5 border-r border-slate-200/80">Created At</th>
                    <th className="px-4 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium text-xs">
                  {paginatedContacts.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-24 text-center">
                        <div className="max-w-md mx-auto space-y-1.5">
                          <p className="text-base font-bold text-slate-900">No contacts found</p>
                          <p className="text-xs text-slate-500">Inbound enquiries and verified clients will appear in this unified directory.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedContacts.map((contact) => {
                      const isSelected = selectedIds.has(contact.id);
                      const currentStage = contact.lifecycle_stage || contact.status || "New";
                      const createdDateStr = contact.created_at ? formatDate(contact.created_at) : "—";

                      return (
                        <tr
                          key={contact.id}
                          onClick={() => setSelectedContact(contact)}
                          className={`hover:bg-slate-50/80 transition-colors cursor-pointer group ${
                            isSelected ? "bg-red-50/40" : ""
                          }`}
                        >
                          <td
                            className="py-3 px-3 text-center"
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

                          {/* Contact Name (Avatar fallback + Designation) */}
                          <td className="p-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-red-100 text-red-700 text-xs font-bold flex items-center justify-center shrink-0">
                                {(contact.name || "C").substring(0, 1).toUpperCase()}
                              </div>
                              <div>
                                <span className="font-bold text-slate-900 group-hover:text-red-600 transition-colors block text-xs">
                                  {contact.name}
                                </span>
                                {contact.job_title && (
                                  <span className="text-[11px] text-slate-400 font-normal block">
                                    {contact.job_title}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Mobile Number (Inline click-to-call & WhatsApp chat) */}
                          <td className="p-3 font-mono text-slate-800">
                            <div className="flex items-center gap-2">
                              <span>{contact.phone || "—"}</span>
                              {contact.phone && (
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <a
                                    href={`tel:${contact.phone}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="p-1 rounded text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                                    title="Call"
                                  >
                                    <Phone className="w-3 h-3" />
                                  </a>
                                  <a
                                    href={`https://wa.me/${contact.phone.replace(/[^0-9]/g, "")}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="p-1 rounded text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                                    title="WhatsApp"
                                  >
                                    <MessageSquare className="w-3 h-3" />
                                  </a>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Company */}
                          <td className="p-3 text-slate-700 font-semibold">
                            {contact.company_name || "—"}
                          </td>

                          {/* Source Tag */}
                          <td className="p-3">
                            {renderSourceBadge(contact.source)}
                          </td>

                          {/* Lifecycle Stage Dropdown */}
                          <td className="p-3" onClick={(e) => e.stopPropagation()}>
                            <select
                              value={currentStage}
                              onChange={(e) => handleStageChange(contact.id, e.target.value)}
                              className="bg-white border border-slate-200 text-slate-800 text-[11px] font-bold py-1 px-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer shadow-2xs"
                            >
                              {LIFECYCLE_STAGES.map((st) => (
                                <option key={st} value={st}>{st}</option>
                              ))}
                            </select>
                          </td>

                          {/* Assigned Owner */}
                          <td className="p-3">
                            <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                              <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                              <span>{contact.assigned_to || "Mohamed Thoufiq"}</span>
                            </div>
                          </td>

                          {/* Created At */}
                          <td className="p-3 text-slate-500 font-mono text-[11px]">
                            {createdDateStr}
                          </td>

                          {/* Actions: Quick "+ Deal", Delete */}
                          <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenDealModal(contact)}
                                className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg font-bold text-[11px] transition-colors cursor-pointer flex items-center gap-1 border border-red-200/80"
                                title="Add Deal for this contact"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Deal</span>
                              </button>
                              <button
                                onClick={() => handleDelete(contact.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Delete Contact"
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
            {paginatedContacts.length > 0 && (
              <div className="p-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Showing Page {currentPage} of {totalPages} ({filteredContacts.length} records)</span>
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
        </main>
      </div>

      {/* ADD CONTACT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Add New Contact</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Contact Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full bg-slate-50 text-slate-900 text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mobile Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full bg-slate-50 text-slate-900 text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="client@company.com"
                    className="w-full bg-slate-50 text-slate-900 text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Company</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Acme Corp"
                    className="w-full bg-slate-50 text-slate-900 text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Designation</label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="VP Operations"
                    className="w-full bg-slate-50 text-slate-900 text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Source Tag</label>
                  <select
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className="w-full bg-slate-50 text-slate-900 text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 font-medium"
                  >
                    {SOURCES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Lifecycle Stage</label>
                  <select
                    value={lifecycleStage}
                    onChange={(e) => setLifecycleStage(e.target.value)}
                    className="w-full bg-slate-50 text-slate-900 text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 font-medium"
                  >
                    {LIFECYCLE_STAGES.map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dynamic Custom Fields in Contact Modal */}
              {customFields.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Custom Attributes
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    {customFields.map((cf) => (
                      <div key={cf.id}>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          {cf.label} {cf.is_required && <span className="text-red-500">*</span>}
                        </label>
                        {cf.field_type === "SELECT" ? (
                          <select
                            value={customData[cf.field_key] || ""}
                            onChange={(e) => setCustomData({ ...customData, [cf.field_key]: e.target.value })}
                            required={cf.is_required}
                            className="w-full bg-slate-50 text-slate-900 text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                          >
                            <option value="">Select option</option>
                            {(cf.options || []).map((opt: string) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        ) : cf.field_type === "BOOLEAN" ? (
                          <label className="flex items-center gap-2 pt-2 text-xs font-semibold text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!!customData[cf.field_key]}
                              onChange={(e) => setCustomData({ ...customData, [cf.field_key]: e.target.checked })}
                              className="w-4 h-4 rounded text-red-600 focus:ring-red-500 border-slate-300"
                            />
                            <span>Yes / Enabled</span>
                          </label>
                        ) : (
                          <input
                            type={cf.field_type === "NUMBER" ? "number" : cf.field_type === "DATE" ? "date" : "text"}
                            value={customData[cf.field_key] || ""}
                            onChange={(e) => setCustomData({ ...customData, [cf.field_key]: e.target.value })}
                            required={cf.is_required}
                            placeholder={cf.label}
                            className="w-full bg-slate-50 text-slate-900 text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
                  Save Contact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK CREATE DEAL ACTION MODAL */}
      {dealModalContact && (
        <div className="fixed inset-0 z-60 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
                  <Handshake className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Create Deal for {dealModalContact.name}</h3>
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
                  className="w-full bg-slate-50 text-slate-900 text-xs px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 font-medium"
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
                    className="w-full bg-slate-50 text-slate-900 text-xs px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Pipeline Stage
                  </label>
                  <select
                    value={dealStage}
                    onChange={(e) => setDealStage(e.target.value)}
                    className="w-full bg-slate-50 text-slate-900 text-xs px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 font-medium"
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
        onClose={() => setSelectedContact(null)}
        onUpdated={loadContacts}
        onOpenCreateDeal={(c) => handleOpenDealModal(c)}
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
