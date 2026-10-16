"use client";

import { useState } from "react";
import {
  X,
  UserPlus,
  Mail,
  User,
  Shield,
  ShieldCheck,
  Briefcase,
  AlertCircle,
  CheckCircle2,
  Lock
} from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/components/common/ToastProvider";

interface InviteMemberDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onMemberInvited: (newMember: any) => void;
}

export default function InviteMemberDrawer({
  isOpen,
  onClose,
  onMemberInvited
}: InviteMemberDrawerProps) {
  const { toast } = useToast();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ADMIN" | "SALES_REP">("SALES_REP");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!fullName.trim()) {
      setErrorMsg("Please enter the team member's full name.");
      return;
    }

    if (!email.trim() || !email.includes("@")) {
      setErrorMsg("Please enter a valid work email address.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.inviteTeamMember({
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        role: role
      });

      toast.success(
        `Invited ${fullName.trim()} as ${role === "ADMIN" ? "Administrator" : "Sales Representative"}`
      );
      onMemberInvited(res.user || {
        id: res.user_id || `user-${Date.now()}`,
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        role: role,
        is_active: true,
        assigned_deals_count: 0,
        assigned_leads_count: 0,
        created_at: new Date().toISOString()
      });

      // Reset and close
      setFullName("");
      setEmail("");
      setRole("SALES_REP");
      onClose();
    } catch (err: any) {
      console.error("Invite member error:", err);
      setErrorMsg(err.message || "Failed to invite member. Please check details.");
      toast.error(err.message || "Failed to invite team member");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-xl bg-white shadow-2xl flex flex-col h-full border-l border-slate-200 animate-in slide-in-from-right duration-300">
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 text-white flex items-center justify-center shadow-md">
                <UserPlus className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  Invite Team Member
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Add a colleague and assign Role-Based Access Control
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between overflow-y-auto">
            <div className="p-6 space-y-6">
              {errorMsg && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-700 text-xs">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-600" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Rachel Green"
                    className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50/70 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-medium"
                  />
                </div>
              </div>

              {/* Work Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Work Email <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="rachel@company.com"
                    className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50/70 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-medium"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  An onboarding invitation with temporary login credentials will be dispatched.
                </p>
              </div>

              {/* Role Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2.5">
                  Assigned Permission Role <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Sales Rep Option */}
                  <div
                    onClick={() => setRole("SALES_REP")}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      role === "SALES_REP"
                        ? "border-red-500 bg-red-50/40 shadow-xs"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                        <Briefcase className="w-4 h-4" />
                      </div>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          role === "SALES_REP"
                            ? "border-red-600 bg-red-600"
                            : "border-slate-300"
                        }`}
                      >
                        {role === "SALES_REP" && (
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        )}
                      </div>
                    </div>
                    <div className="font-bold text-xs text-slate-900 mb-1">
                      Sales Rep
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Restricted to assigned leads, individual deals pipeline, and personal tasks.
                    </p>
                  </div>

                  {/* Admin Option */}
                  <div
                    onClick={() => setRole("ADMIN")}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      role === "ADMIN"
                        ? "border-red-500 bg-red-50/40 shadow-xs"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          role === "ADMIN"
                            ? "border-red-600 bg-red-600"
                            : "border-slate-300"
                        }`}
                      >
                        {role === "ADMIN" && (
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        )}
                      </div>
                    </div>
                    <div className="font-bold text-xs text-slate-900 mb-1">
                      Admin (Full Access)
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Complete organization pipeline, all deals, team permissions, and CRM settings.
                    </p>
                  </div>
                </div>
              </div>

              {/* RBAC Info Card */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
                <div className="flex items-center gap-2 mb-2 text-slate-700 font-semibold text-xs">
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                  <span>Security & Scoping Policy</span>
                </div>
                <ul className="text-[11px] text-slate-500 space-y-1.5 list-disc pl-4 leading-normal">
                  <li>
                    Sales Reps will only view contacts and pipeline deals where they are the owner or assignee.
                  </li>
                  <li>
                    Company-level metrics and system reset operations are restricted to Admins.
                  </li>
                </ul>
              </div>
            </div>

            {/* Sticky Action Footer */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/70 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white text-xs font-semibold shadow-md shadow-red-500/20 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Sending Invite...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Send Invite / Add Member</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
