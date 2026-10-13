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
  GripVertical
} from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import FilterSelect from "@/components/common/FilterSelect";
import MoreViewsDropdown from "@/components/common/MoreViewsDropdown";
import { api } from "@/lib/api";
import { Contact } from "@/lib/mockData";
import { useToast } from "@/components/common/ToastProvider";

const CONTACTS_MORE_VIEWS = [
  "All Contacts",
  "My Contacts",
  "Active Contacts",
  "Customers",
  "Leads",
  "Recently Created Contacts",
  "Recently Modified Contacts",
  "Today's Contacts",
  "Archived Contacts"
];

const CONTACT_STATUSES = [
  "Active",
  "Lead",
  "Customer",
  "Archived"
];

const CONTACT_STAGES = [
  { id: "Active", label: "Active", color: "border-emerald-200 bg-emerald-50/60 text-emerald-700", dot: "bg-emerald-500" },
  { id: "Lead", label: "Lead", color: "border-indigo-200 bg-indigo-50/60 text-indigo-700", dot: "bg-indigo-500" },
  { id: "Customer", label: "Customer", color: "border-rose-200 bg-rose-50/60 text-rose-700", dot: "bg-rose-500" },
  { id: "Archived", label: "Archived", color: "border-slate-200 bg-slate-100 text-slate-600", dot: "bg-slate-400" }
];

export default function ContactsPage() {
  const { toast, confirm } = useToast();
  const [contacts, setContacts] = useState<Contact[]>([]);

  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");
  const [activeTab, setActiveTab] = useState<string>("All Contacts");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<number | string>>(new Set());

  // Form Fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [status, setStatus] = useState<"Active" | "Lead" | "Customer" | "Archived">("Active");

  const loadContacts = async () => {
    try {
      const data = await api.getContacts();
      setContacts(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadContacts();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;

    const newContact: Partial<Contact> = {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      company_name: companyName.trim(),
      job_title: jobTitle.trim(),
      status: status as any
    };

    // Optimistic Update
    const temp: Contact = {
      id: Date.now(),
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      company_name: companyName.trim(),
      job_title: jobTitle.trim(),
      status: status as any,
      created_at: new Date().toISOString()
    };
    setContacts((prev) => [temp, ...prev]);

    await api.createContact(newContact);
    setName("");
    setEmail("");
    setPhone("");
    setCompanyName("");
    setJobTitle("");
    setStatus("Active");
    setShowAddModal(false);
    toast.success("Contact Created", `${newContact.name} was added successfully.`);
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
      prev.map((c) => (String(c.id) === String(contactId) ? { ...c, status: newStatus as any } : c))
    );
    toast.info("Status Changed", `Contact status updated to "${newStatus}"`);
    // Persist in localStorage
    try {
      const saved = localStorage.getItem("zigmaa_contacts");
      if (saved) {
        const parsed: Contact[] = JSON.parse(saved);
        const updated = parsed.map((c) => (String(c.id) === String(contactId) ? { ...c, status: newStatus as any } : c));
        localStorage.setItem("zigmaa_contacts", JSON.stringify(updated));
      }
    } catch {}
  };

  const handleExportCsv = () => {
    if (contacts.length === 0) {
      toast.warning("Export Warning", "No contacts available to export.");
      return;
    }
    const headers = ["First Name", "Company", "Job Title", "Mobile", "Email", "Status"];
    const rows = contacts.map((c) => [
      `"${c.name}"`,
      `"${c.company_name || ""}"`,
      `"${c.job_title || ""}"`,
      `"${c.phone}"`,
      `"${c.email || ""}"`,
      `"${c.status}"`
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

  // Filtered contacts
  const filteredContacts = useMemo(() => {

    return contacts.filter((c) => {
      // Tab filter
      if (activeTab === "Active Contacts" && c.status !== "Active") return false;
      if (activeTab === "Customers" && c.status !== "Customer") return false;
      if (activeTab === "Leads" && c.status !== "Lead") return false;

      // Status dropdown filter
      if (selectedStatus !== "ALL" && c.status !== selectedStatus) return false;

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
              {["All Contacts", "My Contacts", "Active Contacts", "Customers", "Leads"].map((tab) => (
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
                views={CONTACTS_MORE_VIEWS}
                activeView={activeTab}
                onSelect={(view) => {
                  setActiveTab(view);
                  setCurrentPage(1);
                }}
              />
            </div>

            {/* Right Actions: [Status ▾] [Add Contact ▾] [Export] [ ⊞ | ▥ ] */}
            <div className="flex items-center gap-2.5 shrink-0">
              {/* Custom Status Dropdown */}
              <FilterSelect
                placeholder="Status"
                value={selectedStatus}
                options={CONTACT_STATUSES}
                onChange={(val) => {
                  setSelectedStatus(val);
                  setCurrentPage(1);
                }}
              />

              {/* Right Action Buttons */}
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>Add Contact</span>
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
                              {selectedIds.size > 0 && selectedIds.size === paginatedContacts.length ? (
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
                          <span>Contact Owner</span>
                        </th>
                        <th className="px-4 py-3.5 border-r border-slate-200/80">
                          <span>First Name</span>
                        </th>
                        <th className="px-4 py-3.5 border-r border-slate-200/80">
                          <span>Mobile</span>
                        </th>
                        <th className="px-4 py-3.5 border-r border-slate-200/80">
                          <span>Email</span>
                        </th>
                        <th className="px-4 py-3.5 border-r border-slate-200/80">
                          <span>Company</span>
                        </th>
                        <th className="px-4 py-3.5 border-r border-slate-200/80">
                          <span>Status</span>
                        </th>
                        <th className="px-4 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 text-slate-700 font-medium text-sm">
                      {paginatedContacts.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-24 text-center">
                            <div className="max-w-md mx-auto space-y-1.5">
                              <p className="text-base font-bold text-slate-900">No contacts yet</p>
                              <p className="text-sm text-slate-500">Contacts you add will show up here.</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        paginatedContacts.map((contact) => {
                          const isSelected = selectedIds.has(contact.id);

                          return (
                            <tr
                              key={contact.id}
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

                              {/* Activities Quick Icons */}
                              <td className="p-3">
                                <div className="flex items-center gap-1.5">
                                  {contact.phone && (
                                    <a
                                      href={`tel:${contact.phone}`}
                                      className="p-1 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                                      title="Call"
                                    >
                                      <Phone className="w-3.5 h-3.5" />
                                    </a>
                                  )}
                                  {contact.phone && (
                                    <a
                                      href={`https://wa.me/${contact.phone.replace(/[^0-9]/g, "")}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="p-1 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                                      title="WhatsApp"
                                    >
                                      <MessageSquare className="w-3.5 h-3.5" />
                                    </a>
                                  )}
                                  {contact.email && (
                                    <a
                                      href={`mailto:${contact.email}`}
                                      className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                      title="Email"
                                    >
                                      <Mail className="w-3.5 h-3.5" />
                                    </a>
                                  )}
                                </div>
                              </td>

                              {/* Contact Owner */}
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-red-100 text-red-700 text-[10px] font-bold flex items-center justify-center">
                                    {(contact.name || "C").substring(0, 1).toUpperCase()}
                                  </div>
                                  <span className="text-slate-600 text-xs">Default Account</span>
                                </div>
                              </td>

                              {/* First Name */}
                              <td className="p-3 font-bold text-slate-900 group-hover:text-red-600 transition-colors">
                                {contact.name}
                              </td>

                              {/* Mobile */}
                              <td className="p-3 font-mono text-slate-800">{contact.phone}</td>

                              {/* Email */}
                              <td className="p-3 text-slate-500">{contact.email || "—"}</td>

                              {/* Company */}
                              <td className="p-3 text-slate-700 font-semibold">{contact.company_name || "—"}</td>

                              {/* Status */}
                              <td className="p-3">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                    contact.status === "Active"
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                      : contact.status === "Customer"
                                      ? "bg-rose-50 text-rose-700 border-rose-200"
                                      : "bg-indigo-50 text-indigo-700 border-indigo-200"
                                  }`}
                                >
                                  {contact.status}
                                </span>
                              </td>

                              {/* Actions */}
                              <td className="p-3 text-right">
                                <button
                                  onClick={() => handleDelete(contact.id)}
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
          )}

          {/* VIEW 2: KANBAN VIEW (Matching Leads: Independent Columns, Red Theme, Horizontal Board Scroll, Individual Column Scroll) */}
          {viewMode === "kanban" && (
            <div className="w-full overflow-x-auto pb-4 pt-1">
              <div className="flex items-start gap-4 w-max min-w-full">
                {CONTACT_STAGES.map((stage) => {
                  const stageContacts = filteredContacts.filter((c) => c.status === stage.id);

                  return (
                    <div
                      key={stage.id}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const contactId = e.dataTransfer.getData("contactId");
                        if (contactId) handleStageChange(contactId, stage.id);
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
                            {stageContacts.length}
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
                        {stageContacts.length === 0 ? (
                          <div className="flex-1 flex flex-col items-center justify-center py-16 px-4 text-center select-none">
                            <p className="text-xs text-slate-500 font-medium mb-3">
                              No Columns found
                            </p>
                            <button
                              type="button"
                              onClick={() => setShowAddModal(true)}
                              className="px-4 py-1.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs font-semibold rounded-full shadow-xs transition-all cursor-pointer"
                            >
                              Create Contact
                            </button>
                          </div>
                        ) : (
                          stageContacts.map((contact) => (
                            <div
                              key={contact.id}
                              draggable
                              onDragStart={(e) => e.dataTransfer.setData("contactId", String(contact.id))}
                              className="p-3.5 bg-white rounded-xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-red-300 transition-all cursor-grab active:cursor-grabbing space-y-2.5 group shrink-0"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <h4 className="text-xs font-bold text-slate-900 group-hover:text-red-600 transition-colors leading-tight">
                                    {contact.name}
                                  </h4>
                                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                                    {contact.job_title ? `${contact.job_title} • ` : ""}{contact.company_name || "Direct Client"}
                                  </p>
                                </div>
                                <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                  {contact.status}
                                </span>
                              </div>

                              <div className="text-[11px] text-slate-600 space-y-1">
                                <div className="font-mono text-slate-700">{contact.phone}</div>
                                {contact.email && <div className="text-slate-400 truncate">{contact.email}</div>}
                              </div>

                              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                                <div className="flex items-center gap-1.5">
                                  {contact.phone && (
                                    <a
                                      href={`https://wa.me/${contact.phone.replace(/[^0-9]/g, "")}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="p-1 rounded text-slate-400 hover:text-emerald-600"
                                      title="WhatsApp"
                                    >
                                      <MessageSquare className="w-3.5 h-3.5" />
                                    </a>
                                  )}
                                  {contact.email && (
                                    <a
                                      href={`mailto:${contact.email}`}
                                      onClick={(e) => e.stopPropagation()}
                                      className="p-1 rounded text-slate-400 hover:text-red-600"
                                      title="Email"
                                    >
                                      <Mail className="w-3.5 h-3.5" />
                                    </a>
                                  )}
                                </div>

                                <div className="flex items-center gap-1">
                                  {stage.id !== "Active" && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const idx = CONTACT_STAGES.findIndex((s) => s.id === stage.id);
                                        if (idx > 0) handleStageChange(contact.id, CONTACT_STAGES[idx - 1].id);
                                      }}
                                      className="p-1 text-slate-400 hover:text-slate-700 rounded"
                                      title="Move back"
                                    >
                                      <ArrowLeft className="w-3 h-3" />
                                    </button>
                                  )}
                                  {stage.id !== "Archived" && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const idx = CONTACT_STAGES.findIndex((s) => s.id === stage.id);
                                        if (idx < CONTACT_STAGES.length - 1) handleStageChange(contact.id, CONTACT_STAGES[idx + 1].id);
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
        </main>
      </div>

      {/* Add Contact Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Add New Contact</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sarah Jenkins"
                  className="w-full bg-slate-50 text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Number *</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98401 23456"
                    className="w-full bg-slate-50 text-slate-900 text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="sarah@company.com"
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">Job Title</label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="VP Operations"
                    className="w-full bg-slate-50 text-slate-900 text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Lifecycle Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full bg-slate-50 text-slate-900 text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 font-medium"
                >
                  <option value="Active">Active</option>
                  <option value="Lead">Lead</option>
                  <option value="Customer">Customer</option>
                  <option value="Archived">Archived</option>
                </select>
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
                  Save Contact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
