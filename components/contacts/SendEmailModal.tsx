"use client";

import React, { useState } from "react";
import {
  X,
  Mail,
  Send,
  Loader2,
  Bold,
  Italic,
  List,
  Sparkles,
  Paperclip
} from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/components/common/ToastProvider";

interface SendEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  contact: {
    id: string | number;
    name: string;
    email?: string | null;
  };
  onSent?: (activity?: any) => void;
}

export default function SendEmailModal({
  isOpen,
  onClose,
  contact,
  onSent
}: SendEmailModalProps) {
  const { toast } = useToast();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  if (!isOpen) return null;

  const handleInsertTemplate = (type: "intro" | "followup") => {
    if (type === "intro") {
      setSubject(`Introduction: Zigmaa CRM Solutions for ${contact.name}`);
      setBody(
        `Hi ${contact.name},\n\nIt was great connecting with you. I wanted to follow up and introduce our enterprise CRM capabilities tailored for your team's workflow.\n\nWould you be open for a brief 10-minute demo this week?\n\nBest regards,\nMohamed Thoufiq\nZigmaa CRM Team`
      );
    } else if (type === "followup") {
      setSubject(`Following up on our conversation - ${contact.name}`);
      setBody(
        `Hi ${contact.name},\n\nI hope you are having a productive week. Checking in to see if you have any questions regarding the proposal we discussed.\n\nLooking forward to hearing your thoughts.\n\nWarm regards,\nMohamed Thoufiq`
      );
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!contact.email) {
      toast.error("Missing Email", "This contact does not have a registered email address.");
      return;
    }

    if (!subject.trim()) {
      toast.warning("Validation", "Please enter an email subject line.");
      return;
    }

    if (!body.trim()) {
      toast.warning("Validation", "Please compose an email body before sending.");
      return;
    }

    setSending(true);
    try {
      const res = await api.sendContactEmail(contact.id, {
        subject: subject.trim(),
        body: body.trim()
      });

      toast.success("Email Sent", `Successfully delivered to ${contact.email}`);
      setSubject("");
      setBody("");
      onClose();
      if (onSent) onSent(res?.activity);
    } catch (err: any) {
      toast.error("Failed to Send", err.message || "Could not dispatch email via SMTP server.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150 text-slate-800">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Send Email</h3>
              <p className="text-[11px] text-slate-500">In-app direct composer</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSend} className="p-6 space-y-4">
          
          {/* Recipient Strip */}
          <div className="flex items-center gap-3 text-xs bg-slate-50 px-3.5 py-2.5 rounded-xl border border-slate-200/80">
            <span className="font-bold text-slate-400 w-12 shrink-0">To:</span>
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-bold text-slate-800 truncate">{contact.name}</span>
              <span className="text-slate-400">&lt;</span>
              <span className="text-red-600 font-medium truncate">
                {contact.email || "No email available"}
              </span>
              <span className="text-slate-400">&gt;</span>
            </div>
          </div>

          {/* Subject Field */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Subject
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Following up on demo call / Proposal summary"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 shadow-2xs"
            />
          </div>

          {/* Quick AI / Template Chips */}
          <div className="flex items-center gap-2 pt-1 flex-wrap">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-red-500" />
              <span>Quick Templates:</span>
            </span>
            <button
              type="button"
              onClick={() => handleInsertTemplate("intro")}
              className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-[11px] font-semibold border border-red-200/60 transition-colors cursor-pointer"
            >
              Intro & Demo
            </button>
            <button
              type="button"
              onClick={() => handleInsertTemplate("followup")}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold border border-slate-200 transition-colors cursor-pointer"
            >
              Follow-up
            </button>
          </div>

          {/* Email Body & Toolbar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Message Body
              </label>
              <div className="flex items-center gap-1 text-slate-400 text-xs">
                <span className="text-[10px] font-mono">{body.length} chars</span>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-red-500 focus-within:border-transparent transition-all shadow-2xs">
              {/* Minimal Formatting Toolbar */}
              <div className="flex items-center gap-1 px-3 py-1.5 bg-slate-50 border-b border-slate-200 text-slate-500">
                <button
                  type="button"
                  onClick={() => setBody((prev) => prev + " **bold** ")}
                  className="p-1 hover:bg-slate-200 rounded text-slate-600 transition-colors cursor-pointer"
                  title="Bold"
                >
                  <Bold className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setBody((prev) => prev + " *italic* ")}
                  className="p-1 hover:bg-slate-200 rounded text-slate-600 transition-colors cursor-pointer"
                  title="Italic"
                >
                  <Italic className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setBody((prev) => prev + "\n- Item 1\n- Item 2")}
                  className="p-1 hover:bg-slate-200 rounded text-slate-600 transition-colors cursor-pointer"
                  title="List"
                >
                  <List className="w-3 h-3" />
                </button>
              </div>

              <textarea
                required
                rows={6}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your email here..."
                className="w-full p-3.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none resize-none bg-white font-sans leading-relaxed"
              />
            </div>
          </div>

          {/* Footer Controls */}
          <div className="pt-2 flex items-center justify-between border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              Discard
            </button>

            <button
              type="submit"
              disabled={sending || !contact.email}
              className="px-5 py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs shadow-red-600/20 cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Email</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
