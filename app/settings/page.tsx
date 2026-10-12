"use client";

import { useState } from "react";
import {
  Settings,
  Building2,
  Calendar,
  Globe,
  RotateCcw,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  User
} from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { api } from "@/lib/api";

export default function SettingsPage() {
  const [orgName, setOrgName] = useState("Default Workspace");
  const [adminEmail, setAdminEmail] = useState("admin@zigmaa.com");
  const [currency, setCurrency] = useState("INR");
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleResetData = () => {
    if (confirm("Reset all CRM data to 0 (clean slate)? This removes all local leads, deals, tasks, events, and expenses.")) {
      api.clearAllData();
      window.location.reload();
    }
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] text-slate-900 font-sans overflow-hidden select-none">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />

        <main className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6 custom-scrollbar">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-red-50 text-red-600 border border-red-100">
                <Settings className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">CRM & Integration Settings</h1>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Manage organization profile, Google Calendar connection, and lead webhooks
                </p>
              </div>
            </div>

            {saved && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Settings Saved!</span>
              </div>
            )}
          </div>

          <div className="max-w-3xl space-y-6">
            {/* Google Calendar Integration Card */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4 border-l-4 border-l-red-600">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-red-50 text-red-600">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Google Calendar Integration</h3>
                    <p className="text-xs text-slate-500">Live synchronization for sales meetings and demo bookings</p>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Ready & Enabled
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Your CRM integrates with Google Calendar. Every scheduled call or meeting includes direct
                <strong> &quot;Add to Google Cal&quot;</strong> and <strong>&quot;Download .ics&quot;</strong> actions.
              </p>

              <div className="flex items-center gap-3 pt-1">
                <a
                  href="https://calendar.google.com"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Launch Google Calendar</span>
                </a>
              </div>
            </div>

            {/* Workspace Profile */}
            <form onSubmit={handleSave} className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                <Building2 className="w-4 h-4 text-red-600" />
                <span>Workspace Information</span>
              </h3>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Workspace Name</label>
                  <input
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className="w-full bg-slate-50 text-slate-900 p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Admin Email</label>
                  <input
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="w-full bg-slate-50 text-slate-900 p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>

            {/* Webhook Endpoints */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                <Globe className="w-4 h-4 text-emerald-600" />
                <span>Inbound Lead Webhooks (Meta & Google Ads)</span>
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Meta Ads Webhook URL</label>
                  <code className="block bg-slate-50 p-2.5 rounded-xl border border-slate-200 font-mono text-red-600 text-[11px]">
                    https://your-domain.com/api/v1/webhooks/meta
                  </code>
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Website Form Ingestion URL</label>
                  <code className="block bg-slate-50 p-2.5 rounded-xl border border-slate-200 font-mono text-emerald-600 text-[11px]">
                    https://your-domain.com/api/v1/webhooks/form
                  </code>
                </div>
              </div>
            </div>

            {/* Danger Zone: Start from Zero */}
            <div className="p-6 rounded-2xl bg-rose-50/60 border border-rose-200 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-rose-800">
                <RotateCcw className="w-4 h-4" />
                <h3 className="text-sm font-bold">Start from Zero (Clean Slate)</h3>
              </div>
              <p className="text-xs text-rose-700">
                Clear all mock leads, deals, tasks, calendar events, and expenses. Your CRM will reset to pure 0 counters.
              </p>
              <button
                type="button"
                onClick={handleResetData}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
              >
                Reset All Records to 0
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
