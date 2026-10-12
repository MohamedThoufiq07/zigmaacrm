"use client";

import { useState } from "react";
import {
  X,
  Phone,
  Mail,
  Building2,
  Calendar,
  Tag,
  Send,
  MessageSquare,
  Sparkles,
  CheckCircle2,
  Clock,
  UserCheck,
  Briefcase
} from "lucide-react";
import confetti from "canvas-confetti";
import { Lead, Activity } from "@/lib/mockData";
import { api } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Props {
  lead: Lead;
  isOpen?: boolean;
  onClose: () => void;
  onLeadUpdated?: () => void;
}

export default function LeadDetailsDrawer({ lead, onClose, onLeadUpdated }: Props) {
  const [activeTab, setActiveTab] = useState<"All" | "Calls" | "Notes" | "WhatsApp">("All");
  const [newNote, setNewNote] = useState("");
  const [currentLead, setCurrentLead] = useState<Lead>(lead);
  const [converting, setConverting] = useState(false);
  const [convertedDeal, setConvertedDeal] = useState<boolean>(false);

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!newNote.trim()) return;

    const updated = await api.addLeadNote(currentLead.id, newNote, "note");
    if (updated) setCurrentLead(updated);
    setNewNote("");
    if (onLeadUpdated) onLeadUpdated();
  }

  async function handleConvert() {
    setConverting(true);
    try {
      // Trigger celebratory confetti
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });

      const updated = await api.updateLeadStage(currentLead.id, "Closed / Won");
      if (updated) setCurrentLead(updated);
      setConvertedDeal(true);
      if (onLeadUpdated) onLeadUpdated();
    } catch (err) {
      console.error("Conversion failed", err);
    } finally {
      setConverting(false);
    }
  }

  const activities = currentLead.activities || [];
  const filteredActivities = activities.filter((act: Activity) => {
    if (activeTab === "All") return true;
    if (activeTab === "Calls") return act.activity_type === "call";
    if (activeTab === "Notes") return act.activity_type === "note";
    if (activeTab === "WhatsApp") return act.activity_type === "whatsapp";
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end animate-fade-in">
      <div className="relative w-full max-w-xl bg-white border-l border-slate-200 shadow-2xl flex flex-col h-full overflow-hidden text-slate-800">
        {/* Header */}
        <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold uppercase bg-indigo-50 text-indigo-700 border border-indigo-200">
                {currentLead.stage}
              </span>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold uppercase bg-slate-200 text-slate-700 border border-slate-300">
                {currentLead.ad_source}
              </span>
            </div>
            <h2 className="text-xl font-black text-slate-900">{currentLead.name}</h2>
            <div className="text-xs text-slate-500 font-medium flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <span>{currentLead.company_name || "Individual Account"}</span>
              <span>•</span>
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              <span>{currentLead.phone}</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {/* Quick Convert Button */}
          {convertedDeal || currentLead.stage === "Closed / Won" ? (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Deal Won! Lead successfully converted into closed revenue.</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-black">Closed Won</span>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4 text-indigo-600" />
                  <span>Convert Lead to Closed Deal</span>
                </div>
                <div className="text-[11px] text-slate-500 font-medium">Updates stage to Closed/Won and triggers win log</div>
              </div>

              <button
                onClick={handleConvert}
                disabled={converting}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50 shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{converting ? "Converting..." : "1-Click Convert"}</span>
              </button>
            </div>
          )}

          {/* Details & Attributes */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Lead Attributes & Value</h3>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block text-[10px] font-semibold">Expected Deal Value</span>
                <span className="font-black text-indigo-600 text-base">{formatCurrency(currentLead.deal_value || 0)}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] font-semibold">Lead Source</span>
                <span className="font-bold text-slate-900">{currentLead.ad_source}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] font-semibold">Email Address</span>
                <span className="font-semibold text-slate-800">{currentLead.email || "No email listed"}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] font-semibold">Phone Number</span>
                <span className="font-semibold text-slate-800">{currentLead.phone}</span>
              </div>
            </div>

            {currentLead.notes && (
              <div className="pt-2 border-t border-slate-200">
                <span className="text-slate-500 block text-[10px] font-semibold mb-1">Inquiry Description</span>
                <p className="text-xs text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200">
                  {currentLead.notes}
                </p>
              </div>
            )}
          </div>

          {/* Activity Timeline Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Activity Timeline</h3>

              {/* Timeline Tabs */}
              <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs">
                {(["All", "Calls", "Notes", "WhatsApp"] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                      activeTab === tab ? "bg-white text-indigo-600 shadow-xs" : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Note Input Form */}
            <form onSubmit={handleAddNote} className="flex gap-2">
              <input
                type="text"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add follow-up activity note or call log..."
                className="flex-1 bg-slate-50 text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white"
              />
              <button
                type="submit"
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" /> Save Note
              </button>
            </form>

            {/* Timeline Events List */}
            <div className="space-y-3 pt-2">
              {filteredActivities.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                  No activities recorded yet for this filter. Add your first note above!
                </div>
              ) : (
                filteredActivities.map((act: Activity) => (
                  <div key={act.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                    <div className={`p-2 rounded-lg text-xs shrink-0 ${
                      act.activity_type === "call" ? "bg-indigo-100 text-indigo-700" :
                      act.activity_type === "whatsapp" ? "bg-emerald-100 text-emerald-700" :
                      "bg-purple-100 text-purple-700"
                    }`}>
                      {act.activity_type === "call" ? <Phone className="w-4 h-4" /> :
                       act.activity_type === "whatsapp" ? <MessageSquare className="w-4 h-4" /> :
                       <Clock className="w-4 h-4" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-900">{act.description}</div>
                      <div className="text-[10px] text-slate-500 font-medium mt-1">{formatDate(act.created_at)}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
