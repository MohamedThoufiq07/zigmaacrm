"use client";

import { useState } from "react";
import { Phone, Mail, Clock, X, Headphones, ShieldCheck, ExternalLink, CheckCircle2 } from "lucide-react";

interface HelpSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HelpSupportModal({ isOpen, onClose }: HelpSupportModalProps) {
  const [copiedType, setCopiedType] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-10 animate-in zoom-in-95 fade-in duration-200">
        {/* Header - Zigmaa Red Gradient with Modern Accent */}
        <div className="relative px-6 py-6 bg-gradient-to-r from-red-600 via-red-500 to-rose-600 text-white overflow-hidden">
          <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-white/10 blur-xl pointer-events-none" />
          <div className="absolute right-12 -bottom-10 w-24 h-24 rounded-full bg-black/10 blur-lg pointer-events-none" />

          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/20 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/20 backdrop-blur-md shadow-inner text-white">
              <Headphones className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white">Help & Support</h2>
              <p className="text-xs text-red-100 font-medium mt-0.5">
                We&apos;re here to assist you with your Zigmaa CRM workspace
              </p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Choose your preferred way to contact us
          </p>

          {/* Contact Card 1: Call Support */}
          <div className="group relative flex items-center justify-between p-4 rounded-2xl border border-slate-200/90 bg-slate-50/50 hover:bg-red-50/40 hover:border-red-200 transition-all shadow-2xs">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-500">Call Support</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <a
                    href="tel:8870235207"
                    className="text-sm font-bold text-slate-900 hover:text-red-600 transition-colors"
                  >
                    +91 8870235207
                  </a>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                AVAILABLE
              </span>
              <button
                type="button"
                onClick={() => handleCopy("8870235207", "phone")}
                className="text-[11px] font-semibold text-red-600 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-100/60 transition-colors cursor-pointer"
              >
                {copiedType === "phone" ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>

          {/* Contact Card 2: Email Support */}
          <div className="group relative flex items-center justify-between p-4 rounded-2xl border border-slate-200/90 bg-slate-50/50 hover:bg-red-50/40 hover:border-red-200 transition-all shadow-2xs">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-500">Email Support</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <a
                    href="mailto:support@zigmaatech.com"
                    className="text-sm font-bold text-slate-900 hover:text-red-600 transition-colors"
                  >
                    support@zigmaatech.com
                  </a>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                AVAILABLE
              </span>
              <button
                type="button"
                onClick={() => handleCopy("support@zigmaatech.com", "email")}
                className="text-[11px] font-semibold text-red-600 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-100/60 transition-colors cursor-pointer"
              >
                {copiedType === "email" ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>

          {/* Official Website Card */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-100/80 text-xs border border-slate-200/60">
            <div className="flex items-center gap-2 text-slate-600">
              <ShieldCheck className="w-4 h-4 text-red-600" />
              <span>Official Website:</span>
              <a
                href="https://zigmaatech.com"
                target="_blank"
                rel="noreferrer"
                className="font-bold text-slate-900 hover:text-red-600 transition-colors inline-flex items-center gap-1"
              >
                <span>zigmaatech.com</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>
            </div>
          </div>

          {/* Operational Hours Alert */}
          <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-amber-900 text-xs font-medium">
            <Clock className="w-4 h-4 shrink-0 text-amber-600" />
            <span>Support operating hours: Mon – Sat, 9:00 AM – 6:00 PM IST</span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 px-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-200 font-semibold text-xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
