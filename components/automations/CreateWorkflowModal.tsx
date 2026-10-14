"use client";

import { useState } from "react";
import { X, Sparkles, Zap, ArrowRight, CheckCircle2, MessageSquare, UserCheck, CheckSquare, Layers } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/components/common/ToastProvider";

interface CreateWorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const MODULE_OPTIONS = [
  { id: "CONTACT", label: "Contacts (Inbound Enquiries & Verified Clients)" },
  { id: "DEAL", label: "Deals & Sales Pipeline" }
];

const TRIGGER_OPTIONS: Record<string, { id: string; label: string; desc: string }[]> = {
  CONTACT: [
    { id: "CONTACT_CREATED", label: "New Contact / Enquiry Created", desc: "Triggers the second a new lead arrives via Meta Ads, Website, or Manual input" },
    { id: "LIFECYCLE_CHANGED", label: "Lifecycle Stage Progressed", desc: "Triggers when contact status changes to Contacted, Qualified, or Customer" }
  ],
  DEAL: [
    { id: "STAGE_CHANGED", label: "Deal Pipeline Stage Changed", desc: "Triggers when a deal is dragged or moved between stages" },
    { id: "DEAL_WON", label: "Deal Closed & Won", desc: "Triggers when deal enters Won stage" }
  ]
};

const ACTION_OPTIONS = [
  {
    id: "SEND_WHATSAPP",
    title: "Send Instant WhatsApp Message",
    desc: "Dispatches welcome template or product brochure directly via WhatsApp",
    icon: MessageSquare,
    badge: "WhatsApp"
  },
  {
    id: "ROUND_ROBIN_ASSIGN",
    title: "Round-Robin Lead Assignment",
    desc: "Evenly distributes newly arrived contacts across available sales reps",
    icon: UserCheck,
    badge: "Auto-Assign"
  },
  {
    id: "CREATE_TASK",
    title: "Create High-Priority Follow-up Task",
    desc: "Automatically schedules a callback or demo task for the assigned agent",
    icon: CheckSquare,
    badge: "Task Automation"
  }
];

export default function CreateWorkflowModal({
  isOpen,
  onClose,
  onCreated
}: CreateWorkflowModalProps) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [module, setModule] = useState<"CONTACT" | "DEAL">("CONTACT");
  const [triggerEvent, setTriggerEvent] = useState("CONTACT_CREATED");
  const [selectedAction, setSelectedAction] = useState("SEND_WHATSAPP");
  const [whatsappTemplate, setWhatsappTemplate] = useState("welcome_catalog");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.warning("Validation", "Please provide a name for this workflow.");
      return;
    }

    setSubmitting(true);
    try {
      const actions = [];
      if (selectedAction === "SEND_WHATSAPP") {
        actions.push({ action: "SEND_WHATSAPP", template: whatsappTemplate });
      } else if (selectedAction === "ROUND_ROBIN_ASSIGN") {
        actions.push({ action: "ROUND_ROBIN_ASSIGN" });
      } else {
        actions.push({ action: "CREATE_TASK", priority: "High" });
      }

      await api.createWorkflow({
        name: name.trim(),
        module,
        trigger_event: triggerEvent,
        conditions: module === "CONTACT" ? { source: "META_ADS" } : {},
        actions,
        is_active: true
      });

      toast.success("Workflow Activated", `"${name}" workflow created and live.`);
      onCreated();
      onClose();
    } catch (err: any) {
      toast.error("Failed to Create", err.message || "Could not save workflow");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-100">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Create Automation Workflow
              </h3>
              <p className="text-xs text-slate-500">
                Twozo-style trigger, condition, and action builder
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
          {/* Step 1: Workflow Name */}
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
              1. Workflow Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Instant Meta Ads WhatsApp Welcome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-50 text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 font-medium"
            />
          </div>

          {/* Step 2: Target Module */}
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
              2. Target Module
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {MODULE_OPTIONS.map((m) => (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => {
                    setModule(m.id as any);
                    setTriggerEvent(TRIGGER_OPTIONS[m.id][0].id);
                  }}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    module === m.id
                      ? "border-red-500 bg-red-50/50 shadow-2xs"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <span className={`text-xs font-bold block ${module === m.id ? "text-red-700" : "text-slate-800"}`}>
                    {m.id === "CONTACT" ? "Contacts & Leads" : "Deals Pipeline"}
                  </span>
                  <span className="text-[11px] text-slate-500 mt-0.5 block leading-tight">
                    {m.id === "CONTACT" ? "Trigger on client actions" : "Trigger on deal stages"}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Step 3: Trigger Condition */}
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
              3. Trigger Condition
            </label>
            <div className="space-y-2">
              {(TRIGGER_OPTIONS[module] || []).map((t) => (
                <label
                  key={t.id}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    triggerEvent === t.id
                      ? "border-red-500 bg-red-50/40"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="triggerEvent"
                    value={t.id}
                    checked={triggerEvent === t.id}
                    onChange={() => setTriggerEvent(t.id)}
                    className="mt-0.5 text-red-600 focus:ring-red-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">{t.label}</span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">{t.desc}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Step 4: Action Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
              4. Configured Action
            </label>
            <div className="space-y-2">
              {ACTION_OPTIONS.map((act) => {
                const Icon = act.icon;
                const isSelected = selectedAction === act.id;
                return (
                  <label
                    key={act.id}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? "border-red-500 bg-red-50/40"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="selectedAction"
                      value={act.id}
                      checked={isSelected}
                      onChange={() => setSelectedAction(act.id)}
                      className="mt-0.5 text-red-600 focus:ring-red-500"
                    />
                    <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700 shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">{act.title}</span>
                        <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-slate-100 text-slate-600">
                          {act.badge}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 block mt-0.5">{act.desc}</span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              {submitting ? "Activating..." : "Save & Activate Workflow"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
