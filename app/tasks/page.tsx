"use client";

import { useState, useEffect, useMemo } from "react";
import {
  CheckSquare,
  Plus,
  Clock,
  Trash2,
  CheckCircle2,
  X,
  AlertCircle,
  Filter,
  Search,
  SlidersHorizontal,
  RotateCw,
  MoreVertical,
  Square,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  ArrowLeft,
  Calendar,
  UserCheck
} from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import FilterSelect from "@/components/common/FilterSelect";
import MoreViewsDropdown from "@/components/common/MoreViewsDropdown";
import NewTaskDrawer from "@/components/tasks/NewTaskDrawer";
import ContactSlideDrawer from "@/components/contacts/ContactSlideDrawer";
import {
  Phone,
  MessageSquare,
  Mail,
  Users,
  CheckSquare as ToDoIcon,
  PhoneCall
} from "lucide-react";
import { api } from "@/lib/api";
import { Task, Contact } from "@/lib/mockData";
import { useToast } from "@/components/common/ToastProvider";




const TASKS_MORE_VIEWS = [
  "All Tasks",
  "My Tasks",
  "To Do",
  "In Progress",
  "Completed",
  "Overdue Tasks",
  "Recently Created Tasks",
  "Recently Modified Tasks",
  "Today's Tasks"
];

const TASK_STATUSES = [
  "To Do",
  "In Progress",
  "Completed"
];

export default function TasksPage() {
  const { toast, confirm } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);

  const [activeTab, setActiveTab] = useState<string>("All Tasks");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [selectedContactForDrawer, setSelectedContactForDrawer] = useState<Contact | null>(null);
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<number | string>>(new Set());

  const loadTasks = async () => {
    try {
      const data = await api.getTasks();
      if (Array.isArray(data)) {
        // Deduplicate tasks by id to prevent duplicate key console errors
        const seen = new Set<string>();
        const uniqueTasks: Task[] = [];
        for (const t of data) {
          const key = String(t.id);
          if (!seen.has(key)) {
            seen.add(key);
            uniqueTasks.push(t);
          }
        }
        setTasks(uniqueTasks);
      } else {
        setTasks([]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const handleCreateTaskDrawer = async (taskData: Partial<Task>) => {
    try {
      const created = await api.createTask(taskData);
      setTasks((prev) => {
        const withoutDup = prev.filter((t) => String(t.id) !== String(created.id));
        return [created, ...withoutDup];
      });
      toast.success("Task Created", `"${taskData.title}" was added.`);
    } catch {
      toast.error("Error", "Could not create task.");
    }
    loadTasks();
  };

  const handleDelete = async (id: number | string) => {
    const task = tasks.find((t) => String(t.id) === String(id));
    const confirmed = await confirm({
      title: "Delete Task",
      message: `Are you sure you want to delete ${task ? `"${task.title}"` : "this task"}?`,
      confirmText: "Delete",
      cancelText: "Cancel",
      variant: "danger"
    });

    if (confirmed) {
      setTasks((prev) => prev.filter((t) => String(t.id) !== String(id)));
      await api.deleteTask(id);
      toast.success("Task Deleted", "The task was removed.");
    }
  };

  const handleToggleStatus = async (task: Task) => {
    const isComp = task.status === "Completed" || task.status === "COMPLETED";
    const nextStatus = isComp ? "PENDING" : "COMPLETED";
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t))
    );
    try {
      await api.toggleTaskStatus(task.id);
      toast.info("Task Updated", `Marked as ${nextStatus === "COMPLETED" ? "Completed" : "Pending"}`);
    } catch {
      await api.updateTask(task.id, { status: nextStatus });
    }
  };

  const handleOpenContactDrawer = async (contactId?: string | number, fallbackName?: string) => {
    if (contactId) {
      try {
        const c = await api.getContactDetail(contactId);
        if (c) {
          setSelectedContactForDrawer(c);
          return;
        }
      } catch {}
    }
    // Fallback lightweight contact
    setSelectedContactForDrawer({
      id: contactId || `temp-${Date.now()}`,
      name: fallbackName || "Contact Details",
      email: "",
      phone: "",
      company_name: "",
      status: "NEW"
    } as any);
  };

  const handleStageChange = async (taskId: number | string, newStatus: string) => {
    setTasks((prev) =>
      prev.map((t) => (String(t.id) === String(taskId) ? { ...t, status: newStatus as any } : t))
    );
    await api.updateTask(taskId, { status: newStatus as any });
    toast.info("Status Changed", `Task moved to "${newStatus}"`);
  };

  const handleExportCsv = () => {
    if (tasks.length === 0) {
      toast.warning("Export Warning", "No tasks available to export.");
      return;
    }
    const headers = ["Subject", "Due Date", "Priority", "Status", "Related To"];
    const rows = tasks.map((t) => [
      `"${t.title}"`,
      `"${t.due_date}"`,
      `"${t.priority}"`,
      `"${t.status}"`,
      `"${t.related_to || ""}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `zigmaa_tasks_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Export Complete", `Exported ${tasks.length} tasks.`);
  };


  // Filtered Tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      // Tab filter
      if (activeTab === "To Do" && t.status !== "To Do") return false;
      if (activeTab === "In Progress" && t.status !== "In Progress") return false;
      if (activeTab === "Completed" && t.status !== "Completed") return false;

      // Status dropdown filter
      if (selectedStatus !== "ALL" && t.status !== selectedStatus) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          t.title.toLowerCase().includes(q) ||
          (t.related_to && t.related_to.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [tasks, activeTab, selectedStatus, searchQuery]);

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedTasks.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedTasks.map((t) => t.id)));
    }
  };

  const toggleSelectOne = (id: number | string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const totalPages = Math.ceil(filteredTasks.length / pageSize) || 1;
  const paginatedTasks = filteredTasks.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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
              {["All Tasks", "My Tasks", "To Do", "In Progress", "Completed"].map((tab) => (
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
                views={TASKS_MORE_VIEWS}
                activeView={activeTab}
                onSelect={(view) => {
                  setActiveTab(view);
                  setCurrentPage(1);
                }}
              />
            </div>

            {/* Right Actions: [Status ▾] [Add Task ▾] [Export] [ ⊞ | ▥ ] */}
            <div className="flex items-center gap-2.5 shrink-0">
              {/* Custom Status Dropdown */}
              <FilterSelect
                placeholder="Status"
                value={selectedStatus}
                options={TASK_STATUSES}
                onChange={(val) => {
                  setSelectedStatus(val);
                  setCurrentPage(1);
                }}
              />

              {/* Right Action Buttons */}
              <button
                type="button"
                onClick={() => setShowAddDrawer(true)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Add Task</span>
              </button>

              <button
                onClick={handleExportCsv}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-sm font-semibold shadow-2xs transition-colors cursor-pointer"
              >
                Export
              </button>
            </div>
          </div>

          {/* Main Card Container */}
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
                              {selectedIds.size > 0 && selectedIds.size === paginatedTasks.length ? (
                                <CheckSquare className="w-4 h-4 text-red-600" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </th>
                        <th className="px-4 py-3.5 border-r border-slate-200/80 w-28">
                          <span>Activities</span>
                        </th>
                        <th className="px-4 py-3.5 border-r border-slate-200/80">
                          <span>Subject</span>
                        </th>
                        <th className="px-4 py-3.5 border-r border-slate-200/80">
                          <span>Related Contact</span>
                        </th>
                        <th className="px-4 py-3.5 border-r border-slate-200/80">
                          <span>Assigned To</span>
                        </th>
                        <th className="px-4 py-3.5 border-r border-slate-200/80">
                          <span>Due Date</span>
                        </th>
                        <th className="px-4 py-3.5 border-r border-slate-200/80">
                          <span>Priority</span>
                        </th>
                        <th className="px-4 py-3.5 border-r border-slate-200/80">
                          <span>Status</span>
                        </th>
                        <th className="px-4 py-3.5 text-right w-28">Actions</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 text-slate-700 font-medium text-sm">
                      {paginatedTasks.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-24 text-center">
                            <div className="max-w-md mx-auto space-y-1.5">
                              <p className="text-base font-bold text-slate-900">No tasks yet</p>
                              <p className="text-sm text-slate-500">Tasks you create will show up here.</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        paginatedTasks.map((task, idx) => {
                          const isSelected = selectedIds.has(task.id);
                          const isCompleted = task.status === "Completed" || task.status === "COMPLETED";

                          // Determine activity icon & badge style
                          const actType = (task.activity_type || "To-Do").toLowerCase();
                          let ActivityIcon = ToDoIcon;
                          let iconColor = "text-slate-600 bg-slate-100";
                          if (actType.includes("call")) {
                            ActivityIcon = Phone;
                            iconColor = "text-blue-600 bg-blue-50";
                          } else if (actType.includes("whatsapp")) {
                            ActivityIcon = MessageSquare;
                            iconColor = "text-emerald-600 bg-emerald-50";
                          } else if (actType.includes("email")) {
                            ActivityIcon = Mail;
                            iconColor = "text-purple-600 bg-purple-50";
                          } else if (actType.includes("meeting")) {
                            ActivityIcon = Users;
                            iconColor = "text-indigo-600 bg-indigo-50";
                          }

                          // Due date color logic (overdue, today, future)
                          const todayStr = new Date().toISOString().split("T")[0];
                          const isOverdue = task.due_date && task.due_date < todayStr && !isCompleted;
                          const isToday = task.due_date === todayStr && !isCompleted;

                          const contactDisplayName = task.contact_name || task.related_to;

                          return (
                            <tr
                              key={`table-task-${task.id}-${idx}`}
                              className={`hover:bg-slate-50/80 transition-colors cursor-pointer group ${
                                isSelected ? "bg-red-50/40" : ""
                              }`}
                            >
                              <td
                                className="py-3 px-3 text-center"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleSelectOne(task.id);
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

                              {/* Activities Column with Specific Icon & Toggle Checkbox */}
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleStatus(task)}
                                    className="cursor-pointer text-slate-400 hover:text-emerald-600 transition-colors p-0.5"
                                    title={isCompleted ? "Mark pending" : "Mark completed"}
                                  >
                                    {isCompleted ? (
                                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                    ) : (
                                      <Square className="w-4 h-4 text-slate-300 hover:text-slate-400" />
                                    )}
                                  </button>
                                  <span className={`p-1.5 rounded-lg inline-flex items-center justify-center ${iconColor}`} title={task.activity_type || "To-Do"}>
                                    <ActivityIcon className="w-3.5 h-3.5" />
                                  </span>
                                  <span className="text-xs text-slate-500 font-medium">
                                    {task.activity_type || "To-Do"}
                                  </span>
                                </div>
                              </td>

                              {/* Subject */}
                              <td className="p-3 font-medium text-slate-900 group-hover:text-red-600 transition-colors">
                                <div className="flex flex-col">
                                  <span className={`text-[13px] ${isCompleted ? "line-through text-slate-400" : ""}`}>
                                    {task.title}
                                  </span>
                                  {task.description && (
                                    <span className="text-[11px] text-slate-400 truncate max-w-xs font-normal">
                                      {task.description}
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Related Contact Column (with clickable drawer trigger) */}
                              <td className="p-3" onClick={(e) => e.stopPropagation()}>
                                {contactDisplayName ? (
                                  <div
                                    onClick={() => handleOpenContactDrawer(task.contact_id, contactDisplayName)}
                                    className="inline-flex items-center gap-2 hover:bg-slate-100 p-1 px-2 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-slate-200"
                                    title="View Contact Details"
                                  >
                                    <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold flex items-center justify-center shrink-0 border border-slate-200">
                                      {contactDisplayName.substring(0, 1).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                      <span className="text-xs font-semibold text-slate-800 hover:text-red-600 block truncate max-w-[130px]">
                                        {contactDisplayName}
                                      </span>
                                      {task.contact_company && (
                                        <span className="text-[10px] text-slate-400 block truncate max-w-[130px]">
                                          {task.contact_company}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-xs text-slate-400 font-normal">—</span>
                                )}
                              </td>

                              {/* Assigned To */}
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-red-50 text-red-700 text-[10px] font-bold flex items-center justify-center border border-red-200 shrink-0">
                                    {(task.assigned_to || "M").substring(0, 1).toUpperCase()}
                                  </div>
                                  <span className="text-slate-700 text-xs font-medium truncate max-w-[120px]">
                                    {task.assigned_to || "Mohamed Thoufiq"}
                                  </span>
                                </div>
                              </td>

                              {/* Due Date with Overdue/Today color alerts */}
                              <td className="p-3 font-mono text-xs">
                                <div className="flex flex-col">
                                  <span className={`font-semibold ${
                                    isOverdue
                                      ? "text-rose-600 font-bold"
                                      : isToday
                                      ? "text-amber-600 font-bold"
                                      : "text-slate-600"
                                  }`}>
                                    {task.due_date || "—"}
                                  </span>
                                  {task.due_time && (
                                    <span className="text-[10px] text-slate-400 font-sans">
                                      {task.due_time}
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Priority */}
                              <td className="p-3">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                    task.priority === "Urgent"
                                      ? "bg-rose-100 text-rose-800 border-rose-300 font-extrabold"
                                      : task.priority === "High"
                                      ? "bg-rose-50 text-rose-700 border-rose-200"
                                      : task.priority === "Medium"
                                      ? "bg-amber-50 text-amber-700 border-amber-200"
                                      : "bg-slate-100 text-slate-600 border-slate-200"
                                  }`}
                                >
                                  {task.priority || "Medium"}
                                </span>
                              </td>

                              {/* Status */}
                              <td className="p-3">
                                <span
                                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                    isCompleted
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                      : task.status === "In Progress"
                                      ? "bg-blue-50 text-blue-700 border-blue-200"
                                      : "bg-slate-100 text-slate-700 border-slate-200"
                                  }`}
                                >
                                  {isCompleted ? "Completed" : task.status === "In Progress" ? "In Progress" : "Pending"}
                                </span>
                              </td>

                              {/* Actions: Quick triggers for Call/WhatsApp + Delete */}
                              <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-end gap-1">
                                  {task.contact_phone && (
                                    <>
                                      <a
                                        href={`tel:${task.contact_phone}`}
                                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        title={`Call ${task.contact_name || ""}`}
                                      >
                                        <Phone className="w-3.5 h-3.5" />
                                      </a>
                                      <a
                                        href={`https://wa.me/${task.contact_phone.replace(/[^0-9]/g, "")}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                        title={`WhatsApp ${task.contact_name || ""}`}
                                      >
                                        <MessageSquare className="w-3.5 h-3.5" />
                                      </a>
                                    </>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleDelete(task.id)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                    title="Delete Task"
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
                {paginatedTasks.length > 0 && (
                  <div className="p-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                    <span>Showing Page {currentPage} of {totalPages} ({filteredTasks.length} records)</span>
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

      {/* Add Task Slide-Over Drawer */}
      <NewTaskDrawer
        isOpen={showAddDrawer}
        onClose={() => setShowAddDrawer(false)}
        onSubmit={handleCreateTaskDrawer}
      />

      {/* Contact Details Drawer (When Related Contact is Clicked) */}
      <ContactSlideDrawer
        contact={selectedContactForDrawer}
        isOpen={!!selectedContactForDrawer}
        onClose={() => setSelectedContactForDrawer(null)}
      />
    </div>
  );
}
