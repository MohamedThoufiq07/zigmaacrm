"use client";

import { useState, useEffect, useCallback } from "react";
import {
  X,
  Zap,
  MessageSquare,
  Mail,
  Briefcase,
  CheckSquare,
  UserCheck,
  Info,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/components/common/ToastProvider";

interface NewWorkflowDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const MODULE_OPTIONS = [
  { id: "CONTACT", label: "Contacts & Leads", sub: "Trigger on client actions" },
  { id: "DEAL", label: "Deals Pipeline", sub: "Trigger on deal stages" },
];

const TRIGGER_OPTIONS: Record<string, { id: string; label: string; desc: string }[]> = {
  CONTACT: [
    {
      id: "CONTACT_CREATED",
      label: "New Contact / Enquiry Created",
      desc: "Triggers the second a new lead arrives via Meta Ads, Website, or Manual input",
    },
    {
      id: "LIFECYCLE_CHANGED",
      label: "Lifecycle Stage Progressed",
      desc: "Triggers when contact status changes to Contacted, Qualified, or Customer",
    },
  ],
  DEAL: [
    {
      id: "STAGE_CHANGED",
      label: "Deal Pipeline Stage Changed",
      desc: "Triggers when a deal is dragged or moved between stages",
    },
    {
      id: "DEAL_WON",
      label: "Deal Closed & Won",
      desc: "Triggers when deal enters Won stage",
    },
  ],
};

const ACTION_OPTIONS = [
  {
    id: "SEND_WHATSAPP",
    emoji: "💬",
    title: "Send Instant WhatsApp Message",
    desc: "Dispatches welcome template or product brochure directly via WhatsApp",
    icon: MessageSquare,
    badge: "WhatsApp",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  {
    id: "SEND_EMAIL",
    emoji: "✉️",
    title: "Send Automated Welcome Email",
    desc: "Delivers a personalized email notification or onboarding introduction",
    icon: Mail,
    badge: "Email Sync",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
  },
  {
    id: "CREATE_DEAL",
    emoji: "💼",
    title: "Create Pipeline Deal",
    desc: "Generates an associated deal in the pipeline with custom stage and value",
    icon: Briefcase,
    badge: "Deals Module",
    badgeColor: "bg-violet-50 text-violet-700 border-violet-200",
  },
  {
    id: "CREATE_TASK",
    emoji: "📞",
    title: "Create High-Priority Follow-up Task",
    desc: "Automatically schedules a callback or demo task for the assigned agent",
    icon: CheckSquare,
    badge: "Task Automation",
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
  },
  {
    id: "ROUND_ROBIN_ASSIGN",
    emoji: "👥",
    title: "Round-Robin Lead Assignment",
    desc: "Evenly distributes newly arrived contacts across available sales reps",
    icon: UserCheck,
    badge: "Auto-Assign",
    badgeColor: "bg-slate-100 text-slate-700 border-slate-200",
  },
];

const DEFAULT_FORM = {
  name: "",
  module: "CONTACT" as "CONTACT" | "DEAL",
  triggerEvent: "CONTACT_CREATED",
  selectedAction: "SEND_WHATSAPP",
  whatsappTemplate: "Welcome Brochure & Intro",
  whatsappMessagePreview:
    "Hello {{contact_name}}, thank you for reaching out to Zigmaa! We have received your inquiry for {{company}} and our team will get in touch shortly.",
  emailSubject: "Welcome to Zigmaa – Let's get started!",
  emailBody:
    "Hi {{contact_name}},\n\nThank you for connecting with us regarding {{company}}. We're excited to partner with you.\n\nBest regards,\nThe Zigmaa Team",
  dealValue: "50000",
  dealStage: "New Deal",
  taskType: "Call" as "Call" | "Meeting",
  taskDueWithin: "15 Minutes",
};

export default function NewWorkflowDrawer({ isOpen, onClose, onCreated }: NewWorkflowDrawerProps) {
  const { toast } = useToast();
  const [form, setForm] = useState(DEFAULT_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [visible, setVisible] = useState(false);

  // Animate in
  useEffect(() => {
    if (isOpen) setVisible(true);
  }, [isOpen]);

  // Reset form on every open
  useEffect(() => {
    if (isOpen) setForm(DEFAULT_FORM);
  }, [isOpen]);

  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(onClose, 300);
  }, [onClose]);

  // ESC key
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, handleClose]);

  const set = <K extends keyof typeof DEFAULT_FORM>(key: K, value: (typeof DEFAULT_FORM)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const insertVar = (field: "whatsappMessagePreview" | "emailBody", variable: string) =>
    setForm((f) => ({ ...f, [field]: f[field] + ` ${variable}` }));

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.warning("Validation", "Please provide a name for this workflow.");
      return;
    }

    setSubmitting(true);
    try {
      const actions: any[] = [];

      if (form.selectedAction === "SEND_WHATSAPP") {
        actions.push({
          action: "SEND_WHATSAPP",
          template: form.whatsappTemplate,
          preview: form.whatsappMessagePreview,
        });
      } else if (form.selectedAction === "SEND_EMAIL") {
        actions.push({
          action: "SEND_EMAIL",
          subject: form.emailSubject.trim(),
          body: form.emailBody.trim(),
        });
      } else if (form.selectedAction === "CREATE_DEAL") {
        actions.push({
          action: "CREATE_DEAL",
          deal_value: Number(form.dealValue) || 0,
          stage: form.dealStage,
        });
      } else if (form.selectedAction === "CREATE_TASK") {
        actions.push({
          action: "CREATE_TASK",
          priority: "High",
          task_type: form.taskType,
          due_within: form.taskDueWithin,
        });
      } else if (form.selectedAction === "ROUND_ROBIN_ASSIGN") {
        actions.push({ action: "ROUND_ROBIN_ASSIGN" });
      }

      await api.createWorkflow({
        name: form.name.trim(),
        module: form.module,
        trigger_event: form.triggerEvent,
        conditions: form.module === "CONTACT" ? { source: "META_ADS" } : {},
        actions,
        is_active: true,
      });

      toast.success("Workflow Activated", `"${form.name.trim()}" workflow is now live and monitoring.`);
      onCreated();
      handleClose();
    } catch (err: any) {
      toast.error("Failed to Create", err.message || "Could not save workflow. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Create Automation Workflow"
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-slate-900/50 backdrop-blur-[2px] transition-opacity duration-300 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        onClick={handleClose}
      />

      {/* Drawer Panel */}
      <div
        className={`absolute right-0 top-0 bottom-0 w-full max-w-xl bg-white border-l border-slate-200 shadow-2xl flex flex-col overflow-hidden transition-transform duration-300 ease-out ${
          visible ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* ── HEADER ─────────────────────────────────────────── */}
        <div className="shrink-0 p-5 sm:p-6 bg-gradient-to-r from-slate-50 to-white border-b border-slate-200 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 to-rose-500 text-white flex items-center justify-center shadow-md shadow-red-500/25 shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-extrabold text-slate-900 leading-snug">
                Create Automation Workflow
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                Configure automated triggers, multi-channel responses, and pipeline routing rules.
              </p>
            </div>
          </div>
          <button
            id="close-workflow-drawer-btn"
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer shrink-0"
            aria-label="Close drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── SCROLLABLE FORM BODY ───────────────────────────── */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="p-5 sm:p-6 space-y-7">

            {/* ── STEP 1: Workflow Name ─── */}
            <section>
              <StepLabel step={1} label="Workflow Name" required />
              <input
                id="workflow-name-input"
                type="text"
                required
                placeholder="e.g. Instant Meta Ads WhatsApp & Email Welcome"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                className="mt-1.5 w-full bg-slate-50 text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 font-medium transition-all placeholder-slate-400"
              />
            </section>

            {/* ── STEP 2: Target Module ─── */}
            <section>
              <StepLabel step={2} label="Target Module" />
              <div className="mt-1.5 grid grid-cols-2 gap-2.5">
                {MODULE_OPTIONS.map((m) => {
                  const active = form.module === m.id;
                  return (
                    <button
                      id={`module-btn-${m.id.toLowerCase()}`}
                      type="button"
                      key={m.id}
                      onClick={() => {
                        set("module", m.id as any);
                        set("triggerEvent", TRIGGER_OPTIONS[m.id][0].id);
                      }}
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                        active
                          ? "border-red-500 bg-red-50/60 shadow-sm shadow-red-100"
                          : "border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300"
                      }`}
                    >
                      <span className={`text-xs font-bold block ${active ? "text-red-700" : "text-slate-800"}`}>
                        {m.label}
                      </span>
                      <span className="text-[11px] text-slate-500 mt-0.5 block leading-tight">
                        {m.sub}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* ── STEP 3: Trigger Condition ─── */}
            <section>
              <StepLabel step={3} label="Trigger Condition" />
              <div className="mt-1.5 space-y-2">
                {(TRIGGER_OPTIONS[form.module] || []).map((t) => {
                  const active = form.triggerEvent === t.id;
                  return (
                    <label
                      key={t.id}
                      className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                        active
                          ? "border-red-500 bg-red-50/40 shadow-sm shadow-red-100"
                          : "border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="triggerEvent"
                        value={t.id}
                        checked={active}
                        onChange={() => set("triggerEvent", t.id)}
                        className="mt-0.5 accent-red-600 shrink-0"
                      />
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">{t.label}</span>
                        <span className="text-[11px] text-slate-500 block mt-0.5 leading-snug">{t.desc}</span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </section>

            {/* ── STEP 4: Configured Action ─── */}
            <section>
              <StepLabel step={4} label="Configured Action" />
              <div className="mt-1.5 space-y-2">
                {ACTION_OPTIONS.map((act) => {
                  const isSelected = form.selectedAction === act.id;
                  return (
                    <div
                      key={act.id}
                      className={`rounded-xl border transition-all overflow-hidden ${
                        isSelected
                          ? "border-red-400 bg-red-50/20 shadow-sm shadow-red-100"
                          : "border-slate-200 bg-white hover:bg-slate-50/60 hover:border-slate-300"
                      }`}
                    >
                      {/* Action Row */}
                      <label
                        id={`action-label-${act.id.toLowerCase()}`}
                        className="flex items-start gap-3 p-3.5 cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="selectedAction"
                          value={act.id}
                          checked={isSelected}
                          onChange={() => set("selectedAction", act.id)}
                          className="mt-0.5 accent-red-600 shrink-0"
                        />
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-base leading-none ${
                            isSelected ? "bg-red-100" : "bg-slate-100"
                          }`}
                        >
                          {act.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="text-xs font-bold text-slate-900">{act.title}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${act.badgeColor}`}>
                              {act.badge}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500 block mt-0.5 leading-snug">{act.desc}</span>
                        </div>
                      </label>

                      {/* ─ Dynamic Config Inputs ─ */}
                      {isSelected && (
                        <div className="border-t border-red-100/80 bg-white/60 px-4 pb-4 pt-3 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">

                          {/* WhatsApp Config */}
                          {act.id === "SEND_WHATSAPP" && (
                            <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-3.5">
                              <div>
                                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                  WhatsApp Template Selector
                                </label>
                                <select
                                  id="whatsapp-template-select"
                                  value={form.whatsappTemplate}
                                  onChange={(e) => set("whatsappTemplate", e.target.value)}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-red-500 focus:outline-none"
                                >
                                  <option value="Welcome Brochure & Intro">Welcome Brochure & Intro</option>
                                  <option value="Product Catalog & Pricing">Product Catalog & Pricing</option>
                                  <option value="Executive Callback Confirmation">Executive Callback Confirmation</option>
                                  <option value="Custom Message Preview">Custom Message Preview</option>
                                </select>
                              </div>
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <label className="text-[11px] font-bold text-slate-700">
                                    Message Preview & Customization
                                  </label>
                                  <div className="flex items-center gap-1">
                                    <VarChip label="{{contact_name}}" onClick={() => insertVar("whatsappMessagePreview", "{{contact_name}}")} />
                                    <VarChip label="{{company}}" onClick={() => insertVar("whatsappMessagePreview", "{{company}}")} />
                                  </div>
                                </div>
                                <textarea
                                  id="whatsapp-preview-textarea"
                                  rows={3}
                                  value={form.whatsappMessagePreview}
                                  onChange={(e) => set("whatsappMessagePreview", e.target.value)}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-red-500 focus:outline-none font-mono resize-none"
                                  placeholder="Enter message text with {{variables}}..."
                                />
                              </div>
                            </div>
                          )}

                          {/* Email Config */}
                          {act.id === "SEND_EMAIL" && (
                            <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-3.5">
                              <div>
                                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                  Email Subject Line <span className="text-red-500">*</span>
                                </label>
                                <input
                                  id="email-subject-input"
                                  type="text"
                                  value={form.emailSubject}
                                  onChange={(e) => set("emailSubject", e.target.value)}
                                  placeholder="e.g. Welcome to Zigmaa – Let's get started!"
                                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-red-500 focus:outline-none"
                                />
                              </div>
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <label className="text-[11px] font-bold text-slate-700">Email Body</label>
                                  <div className="flex items-center gap-1">
                                    <span className="text-[10px] text-slate-400 mr-0.5">Insert:</span>
                                    <VarChip label="{{contact_name}}" onClick={() => insertVar("emailBody", "{{contact_name}}")} />
                                    <VarChip label="{{company}}" onClick={() => insertVar("emailBody", "{{company}}")} />
                                  </div>
                                </div>
                                <textarea
                                  id="email-body-textarea"
                                  rows={5}
                                  value={form.emailBody}
                                  onChange={(e) => set("emailBody", e.target.value)}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-red-500 focus:outline-none font-mono resize-none"
                                  placeholder="Write the automated email template..."
                                />
                              </div>
                            </div>
                          )}

                          {/* Create Deal Config */}
                          {act.id === "CREATE_DEAL" && (
                            <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-white p-3.5">
                              <div>
                                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                  Default Deal Value (₹)
                                </label>
                                <div className="relative">
                                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold pointer-events-none">
                                    ₹
                                  </span>
                                  <input
                                    id="deal-value-input"
                                    type="number"
                                    min="0"
                                    value={form.dealValue}
                                    onChange={(e) => set("dealValue", e.target.value)}
                                    className="w-full pl-6 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-red-500 focus:outline-none"
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                  Initial Pipeline Stage
                                </label>
                                <select
                                  id="deal-stage-select"
                                  value={form.dealStage}
                                  onChange={(e) => set("dealStage", e.target.value)}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-red-500 focus:outline-none"
                                >
                                  <option value="New Deal">New Deal</option>
                                  <option value="Qualification">Qualification</option>
                                  <option value="Meeting Scheduled">Meeting Scheduled</option>
                                  <option value="Proposal Sent">Proposal Sent</option>
                                  <option value="Negotiation">Negotiation</option>
                                </select>
                              </div>
                            </div>
                          )}

                          {/* Follow-up Task Config */}
                          {act.id === "CREATE_TASK" && (
                            <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-white p-3.5">
                              <div>
                                <label className="block text-[11px] font-bold text-slate-700 mb-1">Task Type</label>
                                <select
                                  id="task-type-select"
                                  value={form.taskType}
                                  onChange={(e) => set("taskType", e.target.value as any)}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-red-500 focus:outline-none"
                                >
                                  <option value="Call">Call</option>
                                  <option value="Meeting">Meeting</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-[11px] font-bold text-slate-700 mb-1">Due Within</label>
                                <select
                                  id="task-due-select"
                                  value={form.taskDueWithin}
                                  onChange={(e) => set("taskDueWithin", e.target.value)}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-red-500 focus:outline-none"
                                >
                                  <option value="15 Minutes">15 Minutes</option>
                                  <option value="1 Hour">1 Hour</option>
                                  <option value="24 Hours">24 Hours</option>
                                </select>
                              </div>
                            </div>
                          )}

                          {/* Round-Robin Info */}
                          {act.id === "ROUND_ROBIN_ASSIGN" && (
                            <div className="rounded-lg border border-slate-200 bg-white p-3.5 flex items-start gap-2.5 text-xs text-slate-600">
                              <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                              <span className="leading-relaxed">
                                Automatically rotates leads across active team members using a fairness algorithm — no manual intervention required.
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* ── Workflow Summary Preview ─── */}
            {form.name.trim() && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 animate-in fade-in duration-200">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Workflow Summary
                </p>
                <div className="flex items-center gap-2 flex-wrap text-xs text-slate-700 font-medium">
                  <span className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-slate-800 font-bold">
                    {form.name.trim()}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  <span className="px-2 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 font-semibold">
                    {TRIGGER_OPTIONS[form.module]?.find((t) => t.id === form.triggerEvent)?.label || form.triggerEvent}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  <span className="px-2 py-1 rounded-lg bg-red-50 border border-red-200 text-red-700 font-semibold">
                    {ACTION_OPTIONS.find((a) => a.id === form.selectedAction)?.title || form.selectedAction}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── STICKY BOTTOM ACTION BAR ──────────────────────── */}
        <div className="shrink-0 p-4 sm:p-5 bg-white border-t border-slate-200 flex items-center justify-between gap-3 shadow-[0_-4px_24px_-4px_rgba(0,0,0,0.08)]">
          <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
            Workflow activates immediately after saving.
          </p>
          <div className="flex items-center gap-2.5 ml-auto">
            <button
              id="cancel-workflow-btn"
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              id="save-workflow-btn"
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="px-5 py-2.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs font-bold rounded-xl shadow-sm shadow-red-600/30 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Activating...</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5" />
                  <span>Save & Activate Workflow</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Helper sub-components ────────────────────────────────────────────────────

function StepLabel({
  step,
  label,
  required,
}: {
  step: number;
  label: string;
  required?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-5 h-5 rounded-full bg-red-600 text-white text-[10px] font-extrabold flex items-center justify-center shrink-0">
        {step}
      </span>
      <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
    </div>
  );
}

function VarChip({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-mono transition-colors cursor-pointer"
    >
      + {label}
    </button>
  );
}
