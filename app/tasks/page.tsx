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
  LayoutGrid,
  Columns3,
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
import { api } from "@/lib/api";
import { Task } from "@/lib/mockData";

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

const TASK_STAGES = [
  { id: "To Do", label: "To Do", color: "border-indigo-200 bg-indigo-50/60 text-indigo-700", dot: "bg-indigo-500" },
  { id: "In Progress", label: "In Progress", color: "border-amber-200 bg-amber-50/60 text-amber-700", dot: "bg-amber-500" },
  { id: "Completed", label: "Completed", color: "border-emerald-200 bg-emerald-50/60 text-emerald-700", dot: "bg-emerald-500" }
];

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");
  const [activeTab, setActiveTab] = useState<string>("All Tasks");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<number | string>>(new Set());

  // Form Fields
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<"High" | "Medium" | "Low">("Medium");
  const [relatedTo, setRelatedTo] = useState("");
  const [taskStatus, setTaskStatus] = useState<"To Do" | "In Progress" | "Completed">("To Do");

  const loadTasks = async () => {
    try {
      const data = await api.getTasks();
      setTasks(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadTasks();
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    setDueDate(tomorrow);
  }, []);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newTask: Partial<Task> = {
      title: title.trim(),
      due_date: dueDate,
      priority,
      status: taskStatus,
      related_to: relatedTo.trim() || "Inbound Sales"
    };

    // Optimistic Update
    const temp: Task = {
      id: Date.now(),
      title: title.trim(),
      due_date: dueDate,
      priority,
      status: taskStatus,
      related_to: relatedTo.trim() || "Inbound Sales",
      created_at: new Date().toISOString()
    };
    setTasks((prev) => [temp, ...prev]);

    await api.createTask(newTask);
    setTitle("");
    setRelatedTo("");
    setShowAddModal(false);
    loadTasks();
  };

  const handleDelete = async (id: number | string) => {
    if (confirm("Are you sure you want to delete this task?")) {
      setTasks((prev) => prev.filter((t) => String(t.id) !== String(id)));
      await api.deleteTask(id);
    }
  };

  const handleToggleStatus = async (task: Task) => {
    const nextStatus = task.status === "Completed" ? "To Do" : "Completed";
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t))
    );
    await api.updateTask(task.id, { status: nextStatus });
  };

  const handleStageChange = async (taskId: number | string, newStatus: string) => {
    setTasks((prev) =>
      prev.map((t) => (String(t.id) === String(taskId) ? { ...t, status: newStatus as any } : t))
    );
    await api.updateTask(taskId, { status: newStatus as any });
  };

  const handleExportCsv = () => {
    if (tasks.length === 0) {
      alert("No tasks to export.");
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
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none text-sm">
              {["All Tasks", "My Tasks", "To Do", "In Progress", "Completed"].map((tab) => (
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
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-[#6941C6] hover:bg-[#5833af] text-white text-sm font-semibold rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>Add Task</span>
                <ChevronDown className="w-4 h-4" />
              </button>

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
                              {selectedIds.size > 0 && selectedIds.size === paginatedTasks.length ? (
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
                          <span>AssignTo</span>
                        </th>
                        <th className="px-4 py-3.5 border-r border-slate-200/80">
                          <span>Subject</span>
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
                        <th className="px-4 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 text-slate-700 font-medium text-sm">
                      {paginatedTasks.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-24 text-center">
                            <div className="max-w-md mx-auto space-y-1.5">
                              <p className="text-base font-bold text-slate-900">No tasks yet</p>
                              <p className="text-sm text-slate-500">Tasks you create will show up here.</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        paginatedTasks.map((task) => {
                          const isSelected = selectedIds.has(task.id);
                          const isCompleted = task.status === "Completed";

                          return (
                            <tr
                              key={task.id}
                              className={`hover:bg-slate-50/80 transition-colors cursor-pointer group ${
                                isSelected ? "bg-purple-50/30" : ""
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
                                    <CheckSquare className="w-4 h-4 text-[#6941C6]" />
                                  ) : (
                                    <Square className="w-4 h-4 text-slate-300 group-hover:text-slate-400" />
                                  )}
                                </div>
                              </td>

                              {/* Activities Toggle Status */}
                              <td className="p-3">
                                <button
                                  onClick={() => handleToggleStatus(task)}
                                  className="p-1 text-slate-400 hover:text-emerald-600 rounded transition-colors"
                                  title={isCompleted ? "Mark incomplete" : "Mark completed"}
                                >
                                  {isCompleted ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                  ) : (
                                    <Clock className="w-4 h-4 text-amber-500" />
                                  )}
                                </button>
                              </td>

                              {/* AssignTo */}
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-purple-100 text-[#6941C6] text-[10px] font-bold flex items-center justify-center">
                                    {(task.related_to || "S").substring(0, 1).toUpperCase()}
                                  </div>
                                  <span className="text-slate-600 text-xs">Assigned Rep</span>
                                </div>
                              </td>

                              {/* Subject */}
                              <td className="p-3 font-bold text-slate-900 group-hover:text-[#6941C6] transition-colors">
                                <span className={isCompleted ? "line-through text-slate-400" : ""}>
                                  {task.title}
                                </span>
                              </td>

                              {/* Due Date */}
                              <td className="p-3 font-mono text-slate-600">{task.due_date}</td>

                              {/* Priority */}
                              <td className="p-3">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                    task.priority === "High"
                                      ? "bg-rose-50 text-rose-700 border-rose-200"
                                      : task.priority === "Medium"
                                      ? "bg-amber-50 text-amber-700 border-amber-200"
                                      : "bg-slate-100 text-slate-600 border-slate-200"
                                  }`}
                                >
                                  {task.priority}
                                </span>
                              </td>

                              {/* Status */}
                              <td className="p-3">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                    task.status === "Completed"
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                      : task.status === "In Progress"
                                      ? "bg-blue-50 text-blue-700 border-blue-200"
                                      : "bg-indigo-50 text-indigo-700 border-indigo-200"
                                  }`}
                                >
                                  {task.status}
                                </span>
                              </td>

                              {/* Actions */}
                              <td className="p-3 text-right">
                                <button
                                  onClick={() => handleDelete(task.id)}
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
            )}

            {/* VIEW 2: KANBAN VIEW */}
            {viewMode === "kanban" && (
              <div className="p-4 overflow-x-auto">
                <div className="flex items-start gap-4 min-w-[800px]">
                  {TASK_STAGES.map((stage) => {
                    const stageTasks = filteredTasks.filter((t) => t.status === stage.id);

                    return (
                      <div
                        key={stage.id}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          const taskId = e.dataTransfer.getData("taskId");
                          if (taskId) handleStageChange(taskId, stage.id);
                        }}
                        className="w-72 shrink-0 bg-slate-50/70 rounded-2xl p-3 border border-slate-200/80 space-y-3"
                      >
                        {/* Header */}
                        <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${stage.dot}`} />
                            <h3 className="text-xs font-bold text-slate-800">{stage.label}</h3>
                          </div>
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600 shadow-2xs">
                            {stageTasks.length}
                          </span>
                        </div>

                        {/* Cards */}
                        <div className="space-y-2.5 min-h-[300px]">
                          {stageTasks.length === 0 ? (
                            <div className="h-28 border-2 border-dashed border-slate-200/80 rounded-xl flex items-center justify-center text-slate-400 text-xs">
                              + Drop tasks here
                            </div>
                          ) : (
                            stageTasks.map((task) => (
                              <div
                                key={task.id}
                                draggable
                                onDragStart={(e) => e.dataTransfer.setData("taskId", String(task.id))}
                                className="p-3.5 bg-white rounded-xl border border-slate-200/90 shadow-2xs hover:shadow-xs hover:border-purple-300 transition-all cursor-grab active:cursor-grabbing space-y-2"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <h4 className="text-xs font-bold text-slate-900 leading-tight">
                                    {task.title}
                                  </h4>
                                  <span
                                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                                      task.priority === "High"
                                        ? "bg-rose-50 text-rose-700"
                                        : task.priority === "Medium"
                                        ? "bg-amber-50 text-amber-700"
                                        : "bg-slate-100 text-slate-600"
                                    }`}
                                  >
                                    {task.priority}
                                  </span>
                                </div>

                                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                                  <span className="flex items-center gap-1 font-mono">
                                    <Calendar className="w-3 h-3 text-slate-400" />
                                    {task.due_date}
                                  </span>
                                  <span className="truncate max-w-[100px] text-slate-400 text-[10px]">
                                    {task.related_to || "Sales"}
                                  </span>
                                </div>

                                <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
                                  <button
                                    onClick={() => handleToggleStatus(task)}
                                    className="text-[10px] text-purple-700 font-semibold hover:underline"
                                  >
                                    {task.status === "Completed" ? "Reopen" : "Complete"}
                                  </button>

                                  {/* Quick Stage Mover */}
                                  <div className="flex items-center gap-1">
                                    {stage.id !== "To Do" && (
                                      <button
                                        onClick={() => {
                                          const idx = TASK_STAGES.findIndex((s) => s.id === stage.id);
                                          if (idx > 0) handleStageChange(task.id, TASK_STAGES[idx - 1].id);
                                        }}
                                        className="p-1 text-slate-400 hover:text-slate-700 rounded"
                                        title="Move back"
                                      >
                                        <ArrowLeft className="w-3 h-3" />
                                      </button>
                                    )}
                                    {stage.id !== "Completed" && (
                                      <button
                                        onClick={() => {
                                          const idx = TASK_STAGES.findIndex((s) => s.id === stage.id);
                                          if (idx < TASK_STAGES.length - 1) handleStageChange(task.id, TASK_STAGES[idx + 1].id);
                                        }}
                                        className="p-1 text-purple-600 hover:bg-purple-50 rounded"
                                        title="Advance status"
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

      {/* Add Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Create New Task</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Subject / Task Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Follow up on Enterprise Proposal"
                  className="w-full bg-slate-50 text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#6941C6] focus:bg-white font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Due Date *</label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-slate-50 text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#6941C6]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full bg-slate-50 text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#6941C6] font-medium"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                  <select
                    value={taskStatus}
                    onChange={(e) => setTaskStatus(e.target.value as any)}
                    className="w-full bg-slate-50 text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#6941C6] font-medium"
                  >
                    <option value="To Do">To Do</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Related To</label>
                  <input
                    type="text"
                    value={relatedTo}
                    onChange={(e) => setRelatedTo(e.target.value)}
                    placeholder="e.g. Acme Corp Lead"
                    className="w-full bg-slate-50 text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#6941C6]"
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
                  className="px-5 py-2 bg-[#6941C6] hover:bg-[#5833af] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
