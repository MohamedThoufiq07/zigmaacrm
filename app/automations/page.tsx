"use client";

import { useState, useEffect } from "react";
import {
  Zap,
  Plus,
  Play,
  CheckCircle2,
  Clock,
  MessageSquare,
  Mail,
  Users,
  AlertCircle,
  ArrowRight,
  Search,
  X,
  ShieldCheck,
  Activity,
  Sliders,
  Trash2,
  Sparkles,
  RefreshCw,
  Send,
  Check,
  Layers,
  ChevronRight
} from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

interface WorkflowRule {
  id: string;
  name: string;
  description: string;
  trigger: string;
  condition?: string;
  action: string;
  channel: "WhatsApp" | "System" | "Task/Alert" | "Email";
  active: boolean;
  executionsCount: number;
}

interface ExecutionLog {
  id: string;
  timestamp: string;
  workflowName: string;
  targetLead: string;
  actionPerformed: string;
  channel: "WhatsApp" | "System" | "Task/Alert" | "Email";
  status: "Success" | "Pending" | "Failed";
}

const DEFAULT_RULES: WorkflowRule[] = [
  {
    id: "rule-1",
    name: "Instant Meta Ads Lead Response",
    description: "Automatically engage prospects the second they submit a Facebook or Instagram lead form.",
    trigger: "When a new lead arrives via Meta/Facebook Ads",
    condition: "Source = Meta / Facebook Ads",
    action: "Dispatch WhatsApp Welcome Template immediately with digital catalog",
    channel: "WhatsApp",
    active: true,
    executionsCount: 68
  },
  {
    id: "rule-2",
    name: "Lead Auto-Assignment (Round Robin)",
    description: "Equally distribute high-intent leads among active sales development reps.",
    trigger: "Any new unassigned lead created",
    condition: "Assignee is Unassigned",
    action: "Distribute evenly among active Sales Reps & notify on mobile",
    channel: "System",
    active: true,
    executionsCount: 42
  },
  {
    id: "rule-3",
    name: "No-Activity Follow-up Nudge",
    description: "Prevent lead drop-off when leads sit untouched in the pipeline for too long.",
    trigger: "Lead status remains 'New' for more than 24 hours",
    condition: "Status = 'New' AND Last Activity > 24h",
    action: "Create high-priority task for assigned agent & escalate to manager",
    channel: "Task/Alert",
    active: true,
    executionsCount: 24
  },
  {
    id: "rule-4",
    name: "Post-Demo Review Email",
    description: "Send automated follow-up proposal materials right after a product demonstration.",
    trigger: "Deal moved to 'Demo Completed' stage",
    condition: "Stage = 'Demo Completed'",
    action: "Send automated follow-up proposal email with pricing sheet after 2 hours",
    channel: "Email",
    active: false,
    executionsCount: 14
  }
];

const INITIAL_LOGS: ExecutionLog[] = [
  {
    id: "log-1",
    timestamp: "2 mins ago",
    workflowName: "Instant Meta Ads Lead Response",
    targetLead: "Priya Sharma",
    actionPerformed: "Sent WhatsApp Welcome Template with PDF brochure",
    channel: "WhatsApp",
    status: "Success"
  },
  {
    id: "log-2",
    timestamp: "14 mins ago",
    workflowName: "Lead Auto-Assignment (Round Robin)",
    targetLead: "Vikram Malhotra",
    actionPerformed: "Assigned to Senior Account Exec: Rajesh Verma",
    channel: "System",
    status: "Success"
  },
  {
    id: "log-3",
    timestamp: "45 mins ago",
    workflowName: "No-Activity Follow-up Nudge",
    targetLead: "Sneha Reddy",
    actionPerformed: "Generated High-Priority Task: 'Urgent Call Needed'",
    channel: "Task/Alert",
    status: "Success"
  },
  {
    id: "log-4",
    timestamp: "1 hour ago",
    workflowName: "Post-Demo Review Email",
    targetLead: "Arjun Patel",
    actionPerformed: "Dispatched Custom Proposal & SLA Deck",
    channel: "Email",
    status: "Success"
  },
  {
    id: "log-5",
    timestamp: "2 hours ago",
    workflowName: "Instant Meta Ads Lead Response",
    targetLead: "Anita Desai",
    actionPerformed: "Queued WhatsApp greeting via Cloud API",
    channel: "WhatsApp",
    status: "Pending"
  }
];

export default function AutomationsPage() {
  const [rules, setRules] = useState<WorkflowRule[]>(DEFAULT_RULES);
  const [logs, setLogs] = useState<ExecutionLog[]>(INITIAL_LOGS);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchLogQuery, setSearchLogQuery] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New rule form states
  const [ruleName, setRuleName] = useState("");
  const [ruleTrigger, setRuleTrigger] = useState("When a new lead arrives via Meta/Facebook Ads");
  const [ruleCondition, setRuleCondition] = useState("All inbound leads");
  const [ruleAction, setRuleAction] = useState("Dispatch WhatsApp Welcome Template");
  const [ruleChannel, setRuleChannel] = useState<"WhatsApp" | "System" | "Task/Alert" | "Email">("WhatsApp");
  const [ruleDescription, setRuleDescription] = useState("");

  // Load persisted rules if any
  useEffect(() => {
    try {
      const saved = localStorage.getItem("zigmaa_workflow_rules");
      if (saved) {
        setRules(JSON.parse(saved));
      }
    } catch {}
  }, []);

  const saveRulesToStorage = (updated: WorkflowRule[]) => {
    setRules(updated);
    try {
      localStorage.setItem("zigmaa_workflow_rules", JSON.stringify(updated));
    } catch {}
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Toggle active/inactive rule
  const handleToggleRule = (id: string) => {
    const updated = rules.map((r) => {
      if (r.id === id) {
        const nextState = !r.active;
        showToast(`Workflow "${r.name}" is now ${nextState ? "Active" : "Paused"}`);
        return { ...r, active: nextState };
      }
      return r;
    });
    saveRulesToStorage(updated);
  };

  // Create custom rule
  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleName.trim()) return;

    const newRule: WorkflowRule = {
      id: `rule-${Date.now()}`,
      name: ruleName.trim(),
      description: ruleDescription.trim() || `Automated workflow trigger for ${ruleChannel}.`,
      trigger: ruleTrigger,
      condition: ruleCondition.trim() || "Default condition",
      action: ruleAction,
      channel: ruleChannel,
      active: true,
      executionsCount: 0
    };

    const updated = [newRule, ...rules];
    saveRulesToStorage(updated);

    // Add a simulated execution log
    const newLog: ExecutionLog = {
      id: `log-${Date.now()}`,
      timestamp: "Just now",
      workflowName: newRule.name,
      targetLead: "System Verification",
      actionPerformed: `Activated workflow rule [${newRule.channel}]`,
      channel: newRule.channel,
      status: "Success"
    };
    setLogs((prev) => [newLog, ...prev]);

    // Reset form
    setRuleName("");
    setRuleDescription("");
    setRuleCondition("All inbound leads");
    setShowCreateModal(false);
    showToast(`Created workflow rule: "${newRule.name}"`);
  };

  // Delete a rule
  const handleDeleteRule = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete workflow "${name}"?`)) {
      const updated = rules.filter((r) => r.id !== id);
      saveRulesToStorage(updated);
      showToast(`Deleted rule "${name}"`);
    }
  };

  // Filter logs
  const filteredLogs = logs.filter(
    (l) =>
      l.workflowName.toLowerCase().includes(searchLogQuery.toLowerCase()) ||
      l.targetLead.toLowerCase().includes(searchLogQuery.toLowerCase()) ||
      l.actionPerformed.toLowerCase().includes(searchLogQuery.toLowerCase())
  );

  const activeWorkflowsCount = rules.filter((r) => r.active).length;

  const getChannelBadge = (channel: WorkflowRule["channel"]) => {
    switch (channel) {
      case "WhatsApp":
        return {
          badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
          icon: MessageSquare,
          dot: "bg-emerald-500"
        };
      case "System":
        return {
          badge: "bg-indigo-50 text-indigo-700 border-indigo-200",
          icon: Users,
          dot: "bg-indigo-500"
        };
      case "Task/Alert":
        return {
          badge: "bg-amber-50 text-amber-700 border-amber-200",
          icon: AlertCircle,
          dot: "bg-amber-500"
        };
      case "Email":
      default:
        return {
          badge: "bg-blue-50 text-blue-700 border-blue-200",
          icon: Mail,
          dot: "bg-blue-500"
        };
    }
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] text-slate-900 font-sans overflow-hidden select-none">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />

        <main className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6 custom-scrollbar">
          {/* Breadcrumb & Header Row */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-1">
                <span>Operations & Automation</span>
                <ChevronRight className="w-3.5 h-3.5" />
                <span className="text-[#6941C6] font-bold">Workflows</span>
              </div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Automations & Workflows
                </h1>
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-[#6941C6] border border-purple-200 text-xs font-bold shadow-2xs">
                  <Zap className="w-3.5 h-3.5 fill-[#6941C6]" />
                  HubSpot & Meta Engine Ready
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Automate lead responses, sales assignments, and WhatsApp follow-up triggers.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#6941C6] hover:bg-[#5833af] text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Create Custom Rule</span>
              </button>
            </div>
          </div>

          {/* Toast Notification */}
          {toastMessage && (
            <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl text-xs font-semibold flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-bottom-3 duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Top Metric KPI Cards (Grid 1x4) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Active Workflows */}
            <div className="p-4 rounded-xl bg-white border border-slate-200 border-t-[3px] border-t-emerald-500 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Workflows</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-2xl font-bold text-slate-900">{activeWorkflowsCount}</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {activeWorkflowsCount} Running
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">Live trigger listeners</p>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
                <Play className="w-5 h-5 fill-emerald-600" />
              </div>
            </div>

            {/* Card 2: Executions Today */}
            <div className="p-4 rounded-xl bg-white border border-slate-200 border-t-[3px] border-t-purple-600 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Executions Today</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">148 runs</p>
                <p className="text-[10px] text-purple-700 font-semibold mt-0.5">+24% vs yesterday</p>
              </div>
              <div className="p-2.5 rounded-xl bg-purple-50 text-[#6941C6]">
                <Zap className="w-5 h-5 fill-[#6941C6]" />
              </div>
            </div>

            {/* Card 3: Messages Triggered */}
            <div className="p-4 rounded-xl bg-white border border-slate-200 border-t-[3px] border-t-blue-500 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Messages Triggered</p>
                <p className="text-xl font-bold text-slate-900 mt-1">112 WA / 36 Email</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Multi-channel auto-dispatch</p>
              </div>
              <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                <MessageSquare className="w-5 h-5" />
              </div>
            </div>

            {/* Card 4: Automation Health */}
            <div className="p-4 rounded-xl bg-white border border-slate-200 border-t-[3px] border-t-indigo-500 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Automation Health</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">99.4% Success</p>
                <p className="text-[10px] text-slate-400 mt-0.5">0 critical API failures</p>
              </div>
              <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Workflow Rules Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Configured Workflow Rules</h2>
                <p className="text-xs text-slate-500 font-medium">
                  Trigger actions instantly when leads convert or pipeline stages update
                </p>
              </div>
              <span className="text-xs font-semibold text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
                {rules.length} Rules Defined
              </span>
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rules.map((rule) => {
                const channelConfig = getChannelBadge(rule.channel);
                const ChannelIcon = channelConfig.icon;

                return (
                  <div
                    key={rule.id}
                    className={`p-5 rounded-2xl bg-white border transition-all duration-200 shadow-xs flex flex-col justify-between ${
                      rule.active
                        ? "border-slate-200 hover:border-purple-300 hover:shadow-sm"
                        : "border-slate-200/60 bg-slate-50/40 opacity-75"
                    }`}
                  >
                    <div>
                      {/* Top Row: Channel Badge & Active Toggle */}
                      <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${channelConfig.badge}`}
                        >
                          <ChannelIcon className="w-3.5 h-3.5" />
                          <span>{rule.channel}</span>
                        </span>

                        <div className="flex items-center gap-2.5">
                          <span
                            className={`text-[11px] font-bold ${
                              rule.active ? "text-emerald-600" : "text-slate-400"
                            }`}
                          >
                            {rule.active ? "Active" : "Inactive"}
                          </span>

                          {/* Toggle Switch */}
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={rule.active}
                              onChange={() => handleToggleRule(rule.id)}
                              className="sr-only peer"
                            />
                            <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                          </label>
                        </div>
                      </div>

                      {/* Rule Title & Description */}
                      <div className="mt-3 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-sm font-bold text-slate-900 leading-snug">{rule.name}</h3>
                          {rule.id.startsWith("rule-") && !["rule-1", "rule-2", "rule-3", "rule-4"].includes(rule.id) && (
                            <button
                              onClick={() => handleDeleteRule(rule.id, rule.name)}
                              className="text-slate-300 hover:text-rose-500 p-1 rounded-md transition-colors cursor-pointer"
                              title="Delete rule"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">{rule.description}</p>
                      </div>

                      {/* Logic Block: Trigger -> Action */}
                      <div className="mt-4 p-3 bg-slate-50/80 rounded-xl border border-slate-200/70 space-y-2 text-xs">
                        <div className="flex items-start gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-100/70 px-1.5 py-0.5 rounded shrink-0">
                            Trigger
                          </span>
                          <span className="font-medium text-slate-700 leading-tight">{rule.trigger}</span>
                        </div>

                        <div className="flex items-start gap-2 pt-1 border-t border-slate-200/50">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded shrink-0">
                            Action
                          </span>
                          <span className="font-semibold text-slate-800 leading-tight">{rule.action}</span>
                        </div>
                      </div>
                    </div>

                    {/* Footer Info */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Executions: <strong className="text-slate-700 font-bold">{rule.executionsCount} runs</strong></span>
                      <span className="flex items-center gap-1 text-[#6941C6] font-semibold">
                        <Sparkles className="w-3 h-3" />
                        Live Automation
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Live Automation Execution Logs (Bottom Table) */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#6941C6]" />
                  <h3 className="text-sm font-bold text-slate-900">Live Automation Execution Logs</h3>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Real-time audit trail of triggers, dispatch statuses, and recipient outcomes
                </p>
              </div>

              {/* Search filter for logs */}
              <div className="relative">
                <input
                  type="text"
                  value={searchLogQuery}
                  onChange={(e) => setSearchLogQuery(e.target.value)}
                  placeholder="Filter logs by lead or workflow..."
                  className="bg-slate-50 text-slate-900 text-xs pl-8 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#6941C6] focus:bg-white w-64 font-medium"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                {searchLogQuery && (
                  <button
                    onClick={() => setSearchLogQuery("")}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                    <th className="pb-3 font-bold">Timestamp</th>
                    <th className="pb-3 font-bold">Workflow Name</th>
                    <th className="pb-3 font-bold">Target Lead Name</th>
                    <th className="pb-3 font-bold">Action Performed</th>
                    <th className="pb-3 font-bold">Channel</th>
                    <th className="pb-3 font-bold text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No logs match your filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => {
                      const channelConfig = getChannelBadge(log.channel);
                      const ChannelIcon = channelConfig.icon;

                      return (
                        <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 font-medium text-slate-500 whitespace-nowrap">
                            <span className="flex items-center gap-1.5">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {log.timestamp}
                            </span>
                          </td>
                          <td className="py-3.5 font-bold text-slate-900 whitespace-nowrap">
                            {log.workflowName}
                          </td>
                          <td className="py-3.5 font-semibold text-purple-700 whitespace-nowrap">
                            {log.targetLead}
                          </td>
                          <td className="py-3.5 text-slate-600 max-w-xs truncate">
                            {log.actionPerformed}
                          </td>
                          <td className="py-3.5 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${channelConfig.badge}`}
                            >
                              <ChannelIcon className="w-3 h-3" />
                              {log.channel}
                            </span>
                          </td>
                          <td className="py-3.5 text-right whitespace-nowrap">
                            {log.status === "Success" ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" />
                                Success
                              </span>
                            ) : log.status === "Pending" ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                <Clock className="w-3 h-3" />
                                Pending
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                <AlertCircle className="w-3 h-3" />
                                Failed
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* CREATE CUSTOM RULE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-50 text-[#6941C6]">
                  <Zap className="w-5 h-5 fill-[#6941C6]" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Create Custom Workflow Rule</h3>
                  <p className="text-xs text-slate-500">Configure automated trigger conditions & actions</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRule} className="space-y-3.5">
              {/* Rule Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Workflow Name *</label>
                <input
                  type="text"
                  required
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  placeholder="e.g. Inbound Demo Auto-Confirmation WhatsApp"
                  className="w-full bg-slate-50 text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#6941C6] focus:bg-white font-medium"
                />
              </div>

              {/* Trigger Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Trigger Event *</label>
                <select
                  value={ruleTrigger}
                  onChange={(e) => setRuleTrigger(e.target.value)}
                  className="w-full bg-slate-50 text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#6941C6] font-medium"
                >
                  <option value="When a new lead arrives via Meta/Facebook Ads">
                    When a new lead arrives via Meta/Facebook Ads
                  </option>
                  <option value="Any new unassigned lead created">
                    Any new unassigned lead created (All Sources)
                  </option>
                  <option value="Lead status remains 'New' for more than 24 hours">
                    Lead status remains 'New' for more than 24 hours
                  </option>
                  <option value="Deal moved to 'Demo Completed' stage">
                    Deal moved to 'Demo Completed' stage
                  </option>
                  <option value="Deal moved to 'Closed Won' stage">
                    Deal moved to 'Closed Won' stage
                  </option>
                  <option value="Contact added to VIP or Enterprise List">
                    Contact added to VIP or Enterprise List
                  </option>
                </select>
              </div>

              {/* Condition */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Filter Condition</label>
                <input
                  type="text"
                  value={ruleCondition}
                  onChange={(e) => setRuleCondition(e.target.value)}
                  placeholder="e.g. Source = 'Meta Ads' AND Deal Value > $1,000"
                  className="w-full bg-slate-50 text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#6941C6] font-medium"
                />
              </div>

              {/* Action Type & Channel */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Channel</label>
                  <select
                    value={ruleChannel}
                    onChange={(e) => setRuleChannel(e.target.value as any)}
                    className="w-full bg-slate-50 text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#6941C6] font-medium"
                  >
                    <option value="WhatsApp">WhatsApp (Emerald)</option>
                    <option value="System">System Round Robin (Indigo)</option>
                    <option value="Task/Alert">Task / Alert (Amber)</option>
                    <option value="Email">Email (Blue)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Action Type</label>
                  <select
                    value={ruleAction}
                    onChange={(e) => setRuleAction(e.target.value)}
                    className="w-full bg-slate-50 text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#6941C6] font-medium"
                  >
                    <option value="Dispatch WhatsApp Welcome Template immediately">
                      Dispatch WhatsApp Welcome Template
                    </option>
                    <option value="Distribute evenly among active Sales Reps">
                      Assign Round-Robin Rep
                    </option>
                    <option value="Create high-priority task for assigned agent">
                      Create High-Priority Task
                    </option>
                    <option value="Send automated follow-up proposal email">
                      Send Automated Email Template
                    </option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  value={ruleDescription}
                  onChange={(e) => setRuleDescription(e.target.value)}
                  placeholder="Explain the business objective of this rule..."
                  className="w-full bg-slate-50 text-slate-900 text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#6941C6]"
                />
              </div>

              {/* Modal Actions */}
              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#6941C6] hover:bg-[#5833af] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  Save & Activate Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
