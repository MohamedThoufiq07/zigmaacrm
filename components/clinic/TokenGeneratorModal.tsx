"use client";

import { useState } from "react";
import { X, Stethoscope, Sparkles } from "lucide-react";
import { api } from "@/lib/api";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onTokenGenerated?: () => void;
}

export default function TokenGeneratorModal({ isOpen, onClose, onTokenGenerated }: Props) {
  const [patientName, setPatientName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [generatedToken, setGeneratedToken] = useState<number | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!patientName || !phone) {
      setError("Please fill in Patient Name and Phone Number.");
      return;
    }
    setSubmitting(true);
    setError("");

    try {
      const res = await api.issueToken(patientName, phone);
      setGeneratedToken(res.token_number);
      if (onTokenGenerated) onTokenGenerated();
    } catch (err: any) {
      setError(err.message || "Failed to issue token.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleDone() {
    setGeneratedToken(null);
    setPatientName("");
    setPhone("");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Issue OPD Token</h3>
              <p className="text-xs text-slate-400">Walk-in patient registration</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {generatedToken ? (
          <div className="p-8 text-center space-y-4">
            <div className="mx-auto w-24 h-24 rounded-full bg-gradient-to-tr from-amber-500 to-emerald-400 p-1 flex items-center justify-center shadow-xl shadow-amber-500/20">
              <div className="w-full h-full bg-slate-950 rounded-full flex flex-col items-center justify-center">
                <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">Token</span>
                <span className="text-3xl font-black text-amber-400">#{generatedToken}</span>
              </div>
            </div>
            <div>
              <h4 className="text-lg font-bold text-slate-100">{patientName}</h4>
              <p className="text-xs text-slate-400">{phone} • Status: Waiting in OPD</p>
            </div>
            <p className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 p-2.5 rounded-xl font-medium">
              Token #{generatedToken} added to today's live queue! SMS alert sent to patient.
            </p>
            <button
              onClick={handleDone}
              className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-amber-600/30 transition-all"
            >
              Done & Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Patient Full Name *</label>
              <input
                type="text"
                required
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder="e.g. Anandan Ramasamy"
                className="w-full bg-slate-800 text-slate-100 text-xs px-3 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Mobile Number *</label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98401 99887"
                className="w-full bg-slate-800 text-slate-100 text-xs px-3 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Next Sequential Token:</span>
              <span className="font-bold text-amber-400 text-xs">Auto-Assigned</span>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-lg shadow-amber-600/30 transition-all disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{submitting ? "Generating..." : "Generate Token"}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
