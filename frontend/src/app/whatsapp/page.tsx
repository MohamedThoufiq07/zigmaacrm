"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  MessageSquare,
  Search,
  Phone,
  Video,
  Send,
  Paperclip,
  Check,
  CheckCheck,
  Plus,
  FileText,
  Calendar,
  Handshake,
  User,
  Building2,
  Mail,
  MoreVertical,
  Smile,
  ShieldCheck,
  Sparkles,
  ChevronDown,
  Clock,
  ArrowRight,
  ExternalLink,
  Download,
  File,
  X,
  PanelRightClose,
  PanelRightOpen,
  CheckCircle2,
  Tag,
  Zap,
  RefreshCw,
  Loader2,
  Edit2
} from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { useToast } from "@/components/common/ToastProvider";
import { useTheme } from "@/context/ThemeContext";
import { formatCurrency, cn } from "@/lib/utils";
import { api } from "@/lib/api";

export interface WhatsAppMessage {
  id: string;
  sender: "inbound" | "outbound";
  text: string;
  timestamp: string;
  timeLabel: string;
  dateGroup: "Today" | "Yesterday" | "Earlier";
  status?: "SENT" | "DELIVERED" | "READ" | "FAILED";
  attachment?: {
    type: "pdf" | "image";
    name: string;
    size: string;
    url?: string;
  };
}

export interface WhatsAppConversation {
  id: string;
  contact_id?: string;
  contactName: string;
  companyName: string;
  phone: string;
  email: string;
  avatarInitials: string;
  avatarColor: string;
  assignedRep: {
    name: string;
    avatar: string;
    role: string;
  };
  dealStage: string;
  dealValue: number;
  dealCloseDate: string;
  unreadCount: number;
  isAssignedToMe: boolean;
  notes: Array<{
    id: string;
    text: string;
    author: string;
    timestamp: string;
  }>;
  lastMessage?: string;
  lastMessageTime?: string;
}

const META_TEMPLATES = [
  {
    id: "welcome_greeting",
    name: "Welcome Greeting",
    tag: "Utility",
    content: "Hello {{name}}, thank you for reaching out to Zigmaa CRM! How can we assist your business today?"
  },
  {
    id: "gst_quote_link",
    name: "Quotation PDF Link",
    tag: "Marketing",
    content: "Hi {{name}}, here is your GST quotation: https://zigmaa.crm/quotes/view/INV-2026-089. Please review the itemized proposal and payment terms."
  },
  {
    id: "sales_followup",
    name: "Follow-up",
    tag: "Utility",
    content: "Greetings {{name}}, just checking in on your CRM deployment timeline. Would you like to schedule a 15-minute product walkthrough this week?"
  },
  {
    id: "payment_reminder",
    name: "Payment Acknowledgment",
    tag: "Authentication",
    content: "Dear {{name}}, we have received your purchase confirmation for Zigmaa Enterprise. Our onboarding team will activate your instance within 2 hours."
  }
];

const AVATAR_GRADIENTS = [
  "from-blue-600 to-indigo-700",
  "from-emerald-600 to-teal-700",
  "from-amber-600 to-orange-700",
  "from-purple-600 to-pink-700",
  "from-rose-600 to-red-700",
  "from-cyan-600 to-blue-700"
];

function parseUtcDate(dateVal?: string | number): Date {
  if (!dateVal) return new Date();
  if (typeof dateVal === "number") {
    return new Date(dateVal * (dateVal < 1e11 ? 1000 : 1));
  }
  const str = String(dateVal).trim();
  if (/^\d{10,13}$/.test(str)) {
    const num = parseInt(str, 10);
    return new Date(num * (num < 1e11 ? 1000 : 1));
  }
  // Ensure UTC ISO string without explicit offset is treated as UTC so browser converts to local IST
  if (str.includes("T") && !str.endsWith("Z") && !/[+-]\d{2}:?\d{2}$/.test(str)) {
    return new Date(str + "Z");
  }
  return new Date(str);
}

function formatTime(isoStr?: string | number): string {
  if (!isoStr) return "Just now";
  try {
    const d = parseUtcDate(isoStr);
    if (isNaN(d.getTime())) return "Today";
    // Format using browser local timezone (IST)
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "Today";
  }
}

export default function WhatsAppPage() {
  const { toast } = useToast();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [activePhone, setActivePhone] = useState<string>("");
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<"All" | "Unassigned" | "My Chats">("All");
  const [messageInput, setMessageInput] = useState("");
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [showRightDrawer, setShowRightDrawer] = useState(true);
  const [showNewNoteModal, setShowNewNoteModal] = useState(false);
  const [newNoteText, setNewNoteText] = useState("");

  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isPollingRef = useRef(false);

  // Active conversation object
  const activeChat = useMemo(() => {
    return (
      conversations.find((c) => c.phone.replace(/[^0-9]/g, "") === activePhone.replace(/[^0-9]/g, "")) ||
      conversations[0] ||
      null
    );
  }, [conversations, activePhone]);

  // Transform backend raw conversation into WhatsAppConversation
  const mapBackendConv = (raw: any, index: number): WhatsAppConversation => {
    const name = raw.contact_name || `WhatsApp User (+${raw.phone_number})`;
    const parts = name.trim().split(" ");
    const initials = (parts[0][0] + (parts[1] ? parts[1][0] : "")).toUpperCase();
    const grad = AVATAR_GRADIENTS[index % AVATAR_GRADIENTS.length];

    return {
      id: raw.id || `conv-${raw.phone_number}`,
      contact_id: raw.contact_id,
      contactName: name,
      companyName: raw.company_name || "Direct Prospect",
      phone: raw.phone_number.startsWith("+") ? raw.phone_number : `+${raw.phone_number}`,
      email: raw.email || "client@whatsapp.crm",
      avatarInitials: initials || "WA",
      avatarColor: grad,
      assignedRep: raw.assigned_rep || {
        name: "Mohamed Thoufiq",
        avatar: "MT",
        role: "Platform Owner"
      },
      dealStage: raw.deal_stage || "Qualified",
      dealValue: raw.deal_value || 1480000,
      dealCloseDate: "28 Oct 2026",
      unreadCount: raw.unread_count || 0,
      isAssignedToMe: true,
      lastMessage: raw.last_message,
      lastMessageTime: raw.last_message_time,
      notes: [
        {
          id: `note-${raw.phone_number}`,
          text: `Inbound WhatsApp thread initiated for ${name}. Channel: Meta Cloud API.`,
          author: "System Meta API",
          timestamp: "Verified"
        }
      ]
    };
  };

  // Load conversations from backend
  const loadConversations = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoadingConversations(true);
    else setIsRefreshing(true);

    try {
      const data = await api.getWhatsAppConversations(40);
      if (data && data.status === "success" && Array.isArray(data.conversations)) {
        const mapped = data.conversations.map(mapBackendConv);
        setConversations(mapped);

        // If no active phone yet, pick the first conversation
        setActivePhone((prev) => {
          if (!prev && mapped.length > 0) {
            return mapped[0].phone;
          }
          return prev;
        });
      }
    } catch (e: any) {
      console.warn("Could not fetch conversations", e);
    } finally {
      setIsLoadingConversations(false);
      setIsRefreshing(false);
    }
  }, []);

  // Load message stream for active phone
  const loadMessages = useCallback(async (phone: string, isSilent = false) => {
    if (!phone) return;
    if (!isSilent) setIsLoadingMessages(true);

    try {
      const clean = phone.replace(/[^0-9]/g, "");
      const data = await api.getWhatsAppMessages({ phone_number: clean });

      if (data && data.status === "success" && Array.isArray(data.messages)) {
        const mappedMsgs: WhatsAppMessage[] = data.messages.map((m: any) => ({
          id: m.id,
          sender: m.direction === "INBOUND" ? "inbound" : "outbound",
          text: m.message_body,
          timestamp: m.created_at || "Today",
          timeLabel: formatTime(m.created_at),
          dateGroup: "Today",
          status: m.status || (m.direction === "INBOUND" ? "DELIVERED" : "SENT"),
          attachment: m.message_body?.toLowerCase().includes("quote") && m.message_body?.toLowerCase().includes(".pdf")
            ? {
                type: "pdf",
                name: "Quotation_Zigmaa_INV-2026.pdf",
                size: "420 KB"
              }
            : undefined
        }));

        setMessages(mappedMsgs);
      }
    } catch (e: any) {
      console.warn("Could not fetch messages for", phone, e);
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Load messages whenever activePhone changes
  useEffect(() => {
    if (activePhone) {
      loadMessages(activePhone);
      // Mark read in backend
      api.markWhatsAppConversationRead(activePhone).catch(() => {});
    }
  }, [activePhone, loadMessages]);

  // Polling: throttled refresh (8s) with document visibility guard & overlap prevention
  useEffect(() => {
    const poll = async () => {
      if (typeof document !== "undefined" && document.hidden) return;
      if (isPollingRef.current) return;
      isPollingRef.current = true;
      try {
        await loadConversations(true);
        if (activePhone) {
          await loadMessages(activePhone, true);
        }
      } catch (err) {
        console.warn("WhatsApp background sync error:", err);
      } finally {
        isPollingRef.current = false;
      }
    };

    const interval = setInterval(poll, 8000);

    const handleVisibility = () => {
      if (typeof document !== "undefined" && !document.hidden) {
        poll();
      }
    };
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibility);
    }

    return () => {
      clearInterval(interval);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibility);
      }
    };
  }, [activePhone, loadConversations, loadMessages]);

  // Auto-scroll when messages update
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Filter conversations
  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      if (filterTab === "My Chats" && !c.isAssignedToMe) return false;
      if (filterTab === "Unassigned" && c.assignedRep.name !== "Unassigned") return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = c.contactName.toLowerCase().includes(q);
        const matchesPhone = c.phone.replace(/[^0-9]/g, "").includes(q.replace(/[^0-9]/g, ""));
        const matchesCompany = c.companyName.toLowerCase().includes(q);
        return matchesName || matchesPhone || matchesCompany;
      }
      return true;
    });
  }, [conversations, filterTab, searchQuery]);

  // Select conversation
  const handleSelectChat = (phone: string) => {
    setActivePhone(phone);
    setConversations((prev) =>
      prev.map((c) =>
        c.phone.replace(/[^0-9]/g, "") === phone.replace(/[^0-9]/g, "")
          ? { ...c, unreadCount: 0 }
          : c
      )
    );
  };

  // Send message action
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend ?? messageInput).trim();
    if (!text || !activeChat) return;

    const cleanPhone = activeChat.phone.replace(/[^0-9]/g, "");

    // 1. Optimistic message update
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: WhatsAppMessage = {
      id: tempId,
      sender: "outbound",
      text,
      timestamp: "Today",
      timeLabel: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      dateGroup: "Today",
      status: "SENT"
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setMessageInput("");
    setShowTemplateSelector(false);
    setIsSending(true);

    try {
      const res = await api.sendWhatsAppMessage({
        phone_number: cleanPhone,
        message: text,
        contact_id: activeChat.contact_id
      });

      if (res && res.status === "success") {
        // Update optimistic message status
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, status: "DELIVERED" } : m))
        );
        // Silently reload messages
        loadMessages(cleanPhone, true);
        loadConversations(true);
      }
    } catch (err: any) {
      toast.error("Failed to send message", err.message || "Please check Meta Cloud connection.");
    } finally {
      setIsSending(false);
    }
  };

  // Select Meta template
  const handleSelectTemplate = (template: typeof META_TEMPLATES[0]) => {
    if (!activeChat) return;
    const firstName = activeChat.contactName.split(" ")[0] || "Valued Client";
    const customizedText = template.content.replace("{{name}}", firstName);
    setMessageInput(customizedText);
    setShowTemplateSelector(false);
  };

  // Fast-send Meta template immediately
  const handleFastSendTemplate = (template: typeof META_TEMPLATES[0]) => {
    if (!activeChat) return;
    const firstName = activeChat.contactName.split(" ")[0] || "Valued Client";
    const customizedText = template.content.replace("{{name}}", firstName);
    handleSendMessage(customizedText);
  };

  // Keydown handler
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Listen for "/"
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setMessageInput(val);
    if (val.endsWith("/")) {
      setShowTemplateSelector(true);
    }
  };

  // Quick Action: Send GST Quote Link
  const handleQuickSendQuote = () => {
    if (!activeChat) return;
    const quoteUrl = `https://zigmaa.crm/quotes/view/INV-2026-${Math.floor(100 + Math.random() * 900)}`;
    const firstName = activeChat.contactName.split(" ")[0];
    const quoteMsg = `Hi ${firstName}, here is your formal GST quotation: ${quoteUrl}\nAmount: ${formatCurrency(activeChat.dealValue)} (Inclusive of 18% IGST).`;
    handleSendMessage(quoteMsg);
    toast.success("Quotation Link Sent", `GST Quote link dispatched to ${activeChat.contactName}`);
  };

  // Quick Action: Create Deal
  const handleQuickCreateDeal = () => {
    if (!activeChat) return;
    toast.success("Deal Linked", `Active pipeline deal synchronized for ${activeChat.companyName}`);
  };

  // Explicit Contact Name Update Action
  const handleSaveContactName = async () => {
    if (!activeChat || !editedName.trim()) return;
    const newName = editedName.trim();
    setIsSavingName(true);
    try {
      if (activeChat.contact_id) {
        await api.updateWhatsAppContactName({
          contactId: activeChat.contact_id,
          newName
        });
      }
      setConversations((prev) =>
        prev.map((c) =>
          c.phone.replace(/[^0-9]/g, "") === activeChat.phone.replace(/[^0-9]/g, "")
            ? {
                ...c,
                contactName: newName,
                avatarInitials: (newName.split(" ")[0][0] + (newName.split(" ")[1] ? newName.split(" ")[1][0] : "")).toUpperCase()
              }
            : c
        )
      );
      toast.success("Contact Name Updated", `Saved as "${newName}"`);
      setIsEditingName(false);
    } catch {
      toast.error("Update Failed", "Could not save contact name.");
    } finally {
      setIsSavingName(false);
    }
  };

  // Quick Action: Add Internal Note
  const handleAddNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim() || !activeChat) return;

    const newNote = {
      id: `note-${Date.now()}`,
      text: newNoteText.trim(),
      author: "Mohamed Thoufiq",
      timestamp: "Just now"
    };

    setConversations((prev) =>
      prev.map((c) =>
        c.phone === activeChat.phone ? { ...c, notes: [newNote, ...c.notes] } : c
      )
    );

    setNewNoteText("");
    setShowNewNoteModal(false);
    toast.success("Note Saved", "CRM context note recorded.");
  };

  // Handle Stage Change
  const handleStageChange = (newStage: string) => {
    if (!activeChat) return;
    setConversations((prev) =>
      prev.map((c) => (c.phone === activeChat.phone ? { ...c, dealStage: newStage } : c))
    );
    toast.info("Stage Updated", `Deal stage changed to ${newStage}`);
  };

  // Handle Deal Value Change
  const handleDealValueChange = (valStr: string) => {
    if (!activeChat) return;
    const num = parseInt(valStr.replace(/[^0-9]/g, ""), 10) || 0;
    setConversations((prev) =>
      prev.map((c) => (c.phone === activeChat.phone ? { ...c, dealValue: num } : c))
    );
  };

  // File upload simulation
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !activeChat) return;
    const file = files[0];

    const fileMsgText = `📎 Shared Document: ${file.name}`;
    handleSendMessage(fileMsgText);
    toast.success("Attachment Dispatched", `Sent ${file.name} to ${activeChat.contactName}`);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className={cn(
      "flex h-screen font-sans overflow-hidden select-none transition-colors",
      isDark ? "bg-[#090A0F] text-slate-100" : "bg-[#F8FAFC] text-slate-800"
    )}>
      {/* Main Sidebar */}
      <Sidebar />

      {/* Main Area */}
      <div className={cn(
        "flex-1 flex flex-col min-w-0 overflow-hidden transition-colors",
        isDark ? "bg-[#090A0F]" : "bg-[#F8FAFC]"
      )}>
        {/* CRM Global Header */}
        <Header title="WhatsApp Business Suite" />

        {/* 3-Column WhatsApp Suite Workspace */}
        <div className="flex-1 flex min-h-0 overflow-hidden relative">

          {/* ========================================================= */}
          {/* COLUMN A: Chat Conversation Thread List (~320px width)    */}
          {/* ========================================================= */}
          <div className={cn(
            "w-80 lg:w-88 shrink-0 flex flex-col transition-colors border-r",
            isDark ? "bg-[#090A0F] border-[#1E293B]" : "bg-white border-slate-200"
          )}>
            {/* Top Header */}
            <div className={cn(
              "p-4 border-b flex flex-col gap-3 transition-colors",
              isDark ? "bg-[#0D0F17]/60 border-[#1E293B]/80" : "bg-slate-50/80 border-slate-200"
            )}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "p-2 rounded-xl border",
                    isDark ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-emerald-50 border-emerald-200 text-emerald-600"
                  )}>
                    <MessageSquare className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h2 className={cn("font-bold text-base tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                      WhatsApp Inbox
                    </h2>
                    <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Live • Meta Cloud API</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => loadConversations(false)}
                    className={cn(
                      "p-1.5 rounded-lg transition-colors",
                      isDark ? "text-slate-400 hover:text-white hover:bg-white/5" : "text-slate-500 hover:text-slate-900 hover:bg-slate-200/60"
                    )}
                    title="Refresh conversations"
                  >
                    <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin text-emerald-500")} />
                  </button>
                  <span className={cn(
                    "px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded-full border",
                    isDark ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                  )}>
                    v20.0
                  </span>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter by name or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={cn(
                    "w-full rounded-xl pl-9 pr-8 py-2 text-xs focus:outline-none transition-colors border",
                    isDark
                      ? "bg-[#131B2E]/90 border-[#1E293B] text-white placeholder-slate-400 focus:border-emerald-500/50"
                      : "bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500 shadow-2xs"
                  )}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 pt-0.5">
                {(["All", "My Chats", "Unassigned"] as const).map((tab) => {
                  const count =
                    tab === "All"
                      ? conversations.length
                      : tab === "My Chats"
                      ? conversations.filter((c) => c.isAssignedToMe).length
                      : conversations.filter((c) => c.assignedRep.name === "Unassigned").length;

                  return (
                    <button
                      key={tab}
                      onClick={() => setFilterTab(tab)}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer",
                        filterTab === tab
                          ? "bg-emerald-600 text-white shadow-xs shadow-emerald-500/20"
                          : isDark
                          ? "bg-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10"
                          : "bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 border border-slate-200/60"
                      )}
                    >
                      <span>{tab}</span>
                      <span
                        className={cn(
                          "text-[10px] px-1.5 py-0.2 rounded-full font-semibold",
                          filterTab === tab
                            ? "bg-emerald-700/80 text-white"
                            : isDark
                            ? "bg-white/10 text-slate-400"
                            : "bg-slate-200 text-slate-600"
                        )}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Conversation List */}
            <div className={cn(
              "flex-1 overflow-y-auto divide-y scrollbar-thin transition-colors",
              isDark
                ? "divide-[#1E293B]/40 scrollbar-thumb-slate-800"
                : "divide-slate-100 scrollbar-thumb-slate-200"
            )}>
              {isLoadingConversations && conversations.length === 0 ? (
                <div className="p-6 space-y-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-center gap-3 animate-pulse">
                      <div className={cn("w-11 h-11 rounded-full", isDark ? "bg-white/5" : "bg-slate-200")} />
                      <div className="flex-1 space-y-2">
                        <div className={cn("h-3 w-28 rounded-md", isDark ? "bg-white/5" : "bg-slate-200")} />
                        <div className={cn("h-2 w-36 rounded-md", isDark ? "bg-white/5" : "bg-slate-100")} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  <MessageSquare className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
                  <p className={isDark ? "text-slate-400" : "text-slate-600"}>No WhatsApp conversations yet.</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Incoming messages will appear here automatically.
                  </p>
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const isSelected = activeChat?.phone === conv.phone;

                  return (
                    <div
                      key={conv.id}
                      onClick={() => handleSelectChat(conv.phone)}
                      className={cn(
                        "p-3.5 flex items-start gap-3 cursor-pointer transition-all relative group",
                        isSelected
                          ? isDark
                            ? "bg-[#131B2E] border-l-3 border-emerald-500 shadow-inner"
                            : "bg-emerald-50/90 border-l-3 border-emerald-600 shadow-xs"
                          : isDark
                          ? "hover:bg-white/[0.03]"
                          : "hover:bg-slate-50"
                      )}
                    >
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        <div
                          className={cn(
                            "w-11 h-11 rounded-full bg-gradient-to-br flex items-center justify-center font-bold text-xs text-white shadow-xs",
                            conv.avatarColor
                          )}
                        >
                          {conv.avatarInitials}
                        </div>
                        <span className={cn(
                          "w-3 h-3 rounded-full bg-emerald-500 border-2 absolute -bottom-0.5 -right-0.5",
                          isDark ? "border-[#090A0F]" : "border-white"
                        )} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <h4
                            className={cn(
                              "text-xs truncate",
                              isSelected
                                ? isDark ? "text-white font-bold" : "text-emerald-950 font-bold"
                                : isDark ? "text-slate-200 font-semibold" : "text-slate-900 font-semibold"
                            )}
                          >
                            {conv.contactName}
                          </h4>
                          <span className="text-[10px] text-slate-400 shrink-0 font-medium ml-1">
                            {formatTime(conv.lastMessageTime)}
                          </span>
                        </div>

                        <div className={cn("text-[11px] truncate mb-1", isDark ? "text-slate-400" : "text-slate-500")}>
                          {conv.companyName}
                        </div>

                        {/* Last message preview + unread pill */}
                        <div className="flex items-center justify-between gap-1">
                          <div className={cn(
                            "flex items-center gap-1 text-[11px] truncate min-w-0",
                            isDark ? "text-slate-400" : "text-slate-500"
                          )}>
                            <span className="truncate">
                              {conv.lastMessage || "Click to open conversation"}
                            </span>
                          </div>

                          {conv.unreadCount > 0 && (
                            <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-500 text-white shadow-xs shadow-rose-500/50">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ========================================================= */}
          {/* COLUMN B: Middle Column: Active Chat Thread Window (Flex) */}
          {/* ========================================================= */}
          <div className={cn(
            "flex-1 flex flex-col relative min-w-0 transition-colors",
            isDark ? "bg-[#0D0B14]" : "bg-[#F0F2F5]"
          )}>
            {activeChat ? (
              <>
                {/* Chat Header */}
                <div className={cn(
                  "h-16 px-5 border-b backdrop-blur-md flex items-center justify-between shrink-0 z-10 transition-colors",
                  isDark ? "border-[#1E293B] bg-[#090A0F]/80 text-white" : "border-slate-200 bg-white/95 text-slate-900 shadow-2xs"
                )}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-full bg-gradient-to-br flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-xs",
                        activeChat.avatarColor
                      )}
                    >
                      {activeChat.avatarInitials}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className={cn("font-bold text-sm truncate", isDark ? "text-white" : "text-slate-900")}>
                          {activeChat.contactName}
                        </h3>
                        <span className={cn(
                          "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                          isDark
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200 font-bold"
                        )}>
                          {activeChat.dealStage}
                        </span>
                      </div>
                      <div className={cn(
                        "flex items-center gap-2 text-xs truncate",
                        isDark ? "text-slate-400" : "text-slate-500"
                      )}>
                        <span>{activeChat.phone}</span>
                        <span>•</span>
                        <span className="text-emerald-500 font-medium flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                          Online • Meta Webhook Live
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleQuickCreateDeal}
                      className={cn(
                        "hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer",
                        isDark
                          ? "bg-white/5 hover:bg-white/10 text-slate-200 border-[#1E293B]"
                          : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                      )}
                      title="Create or link pipeline deal"
                    >
                      <Handshake className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Create Deal</span>
                    </button>

                    <button
                      onClick={handleQuickSendQuote}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs shadow-emerald-500/30 transition-all cursor-pointer"
                      title="Generate and send instant GST quotation link"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Send GST Quote</span>
                    </button>

                    {/* Right Drawer Toggle */}
                    <button
                      onClick={() => setShowRightDrawer(!showRightDrawer)}
                      className={cn(
                        "p-2 rounded-xl border transition-colors cursor-pointer",
                        isDark
                          ? (showRightDrawer
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                              : "bg-white/5 text-slate-400 hover:text-white border-[#1E293B]")
                          : (showRightDrawer
                              ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                              : "bg-slate-100 text-slate-600 hover:text-slate-900 border-slate-200")
                      )}
                      title={showRightDrawer ? "Hide CRM context" : "Show CRM context"}
                    >
                      {showRightDrawer ? (
                        <PanelRightClose className="w-4 h-4" />
                      ) : (
                        <PanelRightOpen className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Message Stream Area */}
                <div className={cn(
                  "flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 scrollbar-thin",
                  isDark ? "scrollbar-thumb-slate-800" : "scrollbar-thumb-slate-300"
                )}>
                  {/* Subtle Date Separator */}
                  <div className="flex items-center justify-center my-3">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[11px] font-semibold border",
                      isDark
                        ? "bg-white/5 text-slate-400 border-white/5"
                        : "bg-white/80 text-slate-600 border-slate-200/80 shadow-2xs"
                    )}>
                      Meta WhatsApp Verified Channel • End-to-End Encrypted
                    </span>
                  </div>

                  {isLoadingMessages && messages.length === 0 ? (
                    <div className={cn(
                      "flex items-center justify-center py-12 gap-2",
                      isDark ? "text-slate-400" : "text-slate-500"
                    )}>
                      <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
                      <span className="text-xs">Loading message history...</span>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className={cn(
                      "text-center py-12 space-y-2",
                      isDark ? "text-slate-400" : "text-slate-500"
                    )}>
                      <p className="text-xs">No previous message history with this contact.</p>
                      <p className="text-[11px] opacity-75">
                        Type below or select a template to start conversation via Meta Cloud API.
                      </p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isOutbound = msg.sender === "outbound";

                      return (
                        <div
                          key={msg.id}
                          className={cn(
                            "flex flex-col",
                            isOutbound ? "items-end" : "items-start"
                          )}
                        >
                          <div
                            className={cn(
                              "rounded-2xl p-3.5 max-w-[85%] sm:max-w-[70%] text-sm leading-relaxed transition-all shadow-xs",
                              isOutbound
                                ? (isDark
                                    ? "bg-emerald-600/25 border border-emerald-500/30 text-white rounded-tr-sm ml-auto"
                                    : "bg-[#D9FDD3] border border-[#C2EBC0] text-slate-900 rounded-tr-sm ml-auto shadow-2xs")
                                : (isDark
                                    ? "bg-white/5 border border-white/10 text-white rounded-tl-sm"
                                    : "bg-white border border-slate-200/90 text-slate-900 rounded-tl-sm shadow-2xs")
                            )}
                          >
                            {/* Message Text */}
                            <p className="whitespace-pre-wrap select-text">{msg.text}</p>

                            {/* Attachment Card if present */}
                            {msg.attachment && (
                              <div className={cn(
                                "mt-2.5 p-3 rounded-xl flex items-center justify-between gap-3 border",
                                isDark
                                  ? "bg-black/40 border-white/10"
                                  : (isOutbound ? "bg-white/70 border-emerald-200" : "bg-slate-50 border-slate-200")
                              )}>
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
                                    <File className="w-4 h-4" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className={cn("text-xs font-semibold truncate", isDark ? "text-white" : "text-slate-900")}>
                                      {msg.attachment.name}
                                    </div>
                                    <div className={cn("text-[10px]", isDark ? "text-slate-400" : "text-slate-500")}>
                                      {msg.attachment.size} • PDF Document
                                    </div>
                                  </div>
                                </div>

                                <a
                                  href="#"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    toast.info("Document Download", `Opening ${msg.attachment?.name}`);
                                  }}
                                  className={cn(
                                    "p-1.5 rounded-lg transition-colors shrink-0",
                                    isDark ? "bg-white/10 hover:bg-white/20 text-slate-200" : "bg-slate-200/70 hover:bg-slate-300 text-slate-700"
                                  )}
                                  title="Download document"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </a>
                              </div>
                            )}

                            {/* Message Footer: Time + Status Tick */}
                            <div className={cn(
                              "flex items-center justify-end gap-1.5 mt-1.5 text-[10px] font-medium",
                              isDark ? "text-slate-400" : "text-slate-500"
                            )}>
                              <span>{msg.timeLabel}</span>
                              {isOutbound && (
                                <CheckCheck
                                  className={cn(
                                    "w-3.5 h-3.5",
                                    msg.status === "READ" ? "text-cyan-500" : (isDark ? "text-slate-400" : "text-slate-400")
                                  )}
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}

                  <div ref={chatBottomRef} />
                </div>

                {/* Template Selector Dropdown / Suggestion Popover */}
                {showTemplateSelector && (
                  <div className={cn(
                    "mx-4 mb-2 p-3 border rounded-2xl shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 z-20",
                    isDark
                      ? "bg-[#131B2E] border-emerald-500/30 text-white"
                      : "bg-white border-emerald-400/40 text-slate-900 shadow-xl"
                  )}>
                    <div className={cn("flex items-center justify-between pb-2 mb-2 border-b", isDark ? "border-[#1E293B]" : "border-slate-200")}>
                      <div className="flex items-center gap-1.5 text-xs font-bold">
                        <Zap className="w-3.5 h-3.5 text-emerald-500" />
                        <span className={isDark ? "text-white" : "text-slate-900"}>Meta Cloud Pre-Approved WhatsApp Templates</span>
                      </div>
                      <button
                        onClick={() => setShowTemplateSelector(false)}
                        className={isDark ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900"}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {META_TEMPLATES.map((tpl) => (
                        <div
                          key={tpl.id}
                          className={cn(
                            "p-2.5 rounded-xl border transition-all group flex flex-col justify-between",
                            isDark
                              ? "bg-white/5 hover:bg-emerald-500/10 border-white/5 hover:border-emerald-500/30"
                              : "bg-slate-50 hover:bg-emerald-50/70 border-slate-200 hover:border-emerald-300"
                          )}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className={cn(
                                "text-xs font-bold transition-colors",
                                isDark ? "text-slate-200 group-hover:text-emerald-400" : "text-slate-800 group-hover:text-emerald-700"
                              )}>
                                {tpl.name}
                              </span>
                              <span className={cn(
                                "text-[10px] font-semibold px-1.5 py-0.2 rounded-md",
                                isDark ? "bg-white/10 text-slate-400" : "bg-slate-200 text-slate-600"
                              )}>
                                {tpl.tag}
                              </span>
                            </div>
                            <p className={cn(
                              "text-[11px] line-clamp-2 leading-relaxed",
                              isDark ? "text-slate-400" : "text-slate-600"
                            )}>
                              {tpl.content.replace("{{name}}", activeChat.contactName.split(" ")[0])}
                            </p>
                          </div>

                          <div className={cn("flex items-center justify-end gap-1.5 mt-2 pt-1 border-t", isDark ? "border-white/5" : "border-slate-200")}>
                            <button
                              onClick={() => handleSelectTemplate(tpl)}
                              className={cn(
                                "px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors",
                                isDark ? "bg-white/5 hover:bg-white/10 text-slate-300" : "bg-slate-200 hover:bg-slate-300 text-slate-700"
                              )}
                            >
                              Insert
                            </button>
                            <button
                              onClick={() => handleFastSendTemplate(tpl)}
                              className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-2xs"
                            >
                              ⚡ Send Now
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Message Input Dock (Fixed at bottom) */}
                <div className={cn(
                  "p-4 border-t backdrop-blur-md shrink-0 transition-colors",
                  isDark ? "border-[#1E293B] bg-[#090A0F]/90" : "border-slate-200 bg-white/95"
                )}>
                  {/* Quick Template bar */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowTemplateSelector(!showTemplateSelector)}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer",
                          showTemplateSelector
                            ? "bg-emerald-600 text-white shadow-xs shadow-emerald-500/40"
                            : (isDark
                                ? "bg-white/5 hover:bg-white/10 text-emerald-400 border border-emerald-500/30"
                                : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300")
                        )}
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>Templates (/)</span>
                      </button>

                      <button
                        onClick={() => {
                          setMessageInput("Hi " + activeChat.contactName.split(" ")[0] + ", thanks for reaching out! Let us schedule a quick call.");
                        }}
                        className={cn(
                          "hidden sm:inline-flex px-2 py-0.5 rounded-md text-[11px] border transition-colors",
                          isDark ? "bg-white/5 hover:bg-white/10 text-slate-300 border-white/5" : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                        )}
                      >
                        ⚡ Quick Greeting
                      </button>
                      <button
                        onClick={handleQuickSendQuote}
                        className={cn(
                          "hidden md:inline-flex px-2 py-0.5 rounded-md text-[11px] border transition-colors",
                          isDark ? "bg-white/5 hover:bg-white/10 text-slate-300 border-white/5" : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                        )}
                      >
                        ⚡ Share Quotation Link
                      </button>
                    </div>

                    <div className={cn("text-[11px]", isDark ? "text-slate-400" : "text-slate-500")}>
                      Press <kbd className={cn("px-1 py-0.5 rounded text-[10px]", isDark ? "bg-white/10 text-slate-300" : "bg-slate-200 text-slate-700")}>Enter</kbd> to send
                    </div>
                  </div>

                  {/* Input row */}
                  <div className={cn(
                    "flex items-end gap-2 border rounded-2xl p-2 transition-all",
                    isDark
                      ? "bg-[#131B2E] border-[#1E293B] focus-within:border-emerald-500/60"
                      : "bg-slate-100 border-slate-300 focus-within:border-emerald-500 focus-within:bg-white focus-within:shadow-xs"
                  )}>
                    {/* Hidden file input */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      className="hidden"
                      accept="application/pdf,image/*"
                    />

                    {/* Attachment Button */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className={cn(
                        "p-2.5 rounded-xl transition-colors cursor-pointer shrink-0",
                        isDark ? "text-slate-400 hover:text-emerald-400 hover:bg-white/5" : "text-slate-500 hover:text-emerald-600 hover:bg-slate-200/60"
                      )}
                      title="Attach PDF quote or image"
                    >
                      <Paperclip className="w-4 h-4" />
                    </button>

                    {/* Text Area */}
                    <textarea
                      rows={1}
                      value={messageInput}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDown}
                      placeholder='Type a message or press "/" for Meta templates...'
                      className={cn(
                        "flex-1 bg-transparent border-0 text-sm focus:outline-none focus:ring-0 resize-none py-2 px-1 max-h-32 min-h-[38px] leading-relaxed",
                        isDark ? "text-white placeholder-slate-400" : "text-slate-900 placeholder-slate-400"
                      )}
                    />

                    {/* Emoji / Trigger */}
                    <button
                      type="button"
                      onClick={() => setMessageInput((prev) => prev + " 👍")}
                      className={cn(
                        "p-2.5 rounded-xl transition-colors cursor-pointer shrink-0",
                        isDark ? "text-slate-400 hover:text-amber-400 hover:bg-white/5" : "text-slate-500 hover:text-amber-500 hover:bg-slate-200/60"
                      )}
                      title="Add quick emoji"
                    >
                      <Smile className="w-4 h-4" />
                    </button>

                    {/* Send Button */}
                    <button
                      type="button"
                      onClick={() => handleSendMessage()}
                      disabled={!messageInput.trim() || isSending}
                      className={cn(
                        "p-2.5 rounded-xl font-bold transition-all flex items-center justify-center shrink-0 cursor-pointer",
                        messageInput.trim() && !isSending
                          ? "bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-500/30 hover:scale-105 active:scale-95"
                          : (isDark ? "bg-white/5 text-slate-500 cursor-not-allowed" : "bg-slate-200 text-slate-400 cursor-not-allowed")
                      )}
                      title="Send WhatsApp message via Meta Cloud API"
                    >
                      {isSending ? (
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-3">
                <MessageSquare className={cn("w-12 h-12 opacity-40", isDark ? "text-slate-600" : "text-slate-400")} />
                <h3 className={cn("font-bold text-base", isDark ? "text-white" : "text-slate-900")}>Select a conversation</h3>
                <p className={cn("text-xs text-center max-w-sm", isDark ? "text-slate-500" : "text-slate-500")}>
                  Choose a contact from the left list to view WhatsApp message thread, or wait for new inbound leads.
                </p>
              </div>
            )}
          </div>

          {/* ========================================================= */}
          {/* COLUMN C: CRM Context & Quick Actions Drawer (~300px)     */}
          {/* ========================================================= */}
          {showRightDrawer && activeChat && (
            <div className={cn(
              "w-80 shrink-0 border-l flex flex-col overflow-y-auto scrollbar-thin transition-colors",
              isDark ? "border-[#1E293B] bg-[#090A0F] scrollbar-thumb-slate-800" : "border-slate-200 bg-white scrollbar-thumb-slate-300"
            )}>
              {/* Header */}
              <div className={cn(
                "p-4 border-b flex items-center justify-between transition-colors",
                isDark ? "border-[#1E293B] bg-[#0D0F17]/60" : "border-slate-200 bg-slate-50/80"
              )}>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-emerald-500" />
                  <span className={cn("font-bold text-xs uppercase tracking-wider", isDark ? "text-white" : "text-slate-900")}>
                    CRM Lead Context
                  </span>
                </div>
                <button
                  onClick={() => setShowRightDrawer(false)}
                  className={cn("p-1 rounded-lg lg:hidden", isDark ? "text-slate-400 hover:text-white hover:bg-white/5" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100")}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Customer Profile Card */}
              <div className={cn("p-4 border-b space-y-3", isDark ? "border-[#1E293B]/60" : "border-slate-200")}>
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center font-bold text-base text-white shadow-md shrink-0",
                      activeChat.avatarColor
                    )}
                  >
                    {activeChat.avatarInitials}
                  </div>
                  <div className="min-w-0 flex-1">
                    {!isEditingName ? (
                      <div className="flex items-center gap-1.5 group/name">
                        <h4 className={cn("font-bold text-sm truncate", isDark ? "text-white" : "text-slate-900")}>
                          {activeChat.contactName}
                        </h4>
                        <button
                          onClick={() => {
                            setEditedName(activeChat.contactName);
                            setIsEditingName(true);
                          }}
                          className={cn(
                            "opacity-60 group-hover/name:opacity-100 p-0.5 rounded transition-all cursor-pointer",
                            isDark ? "hover:bg-white/10 text-slate-400 hover:text-emerald-400" : "hover:bg-slate-100 text-slate-500 hover:text-emerald-600"
                          )}
                          title="Edit Contact Name"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <input
                          type="text"
                          value={editedName}
                          onChange={(e) => setEditedName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveContactName();
                            if (e.key === "Escape") setIsEditingName(false);
                          }}
                          autoFocus
                          className={cn(
                            "border rounded-lg px-2 py-0.5 text-xs focus:outline-none w-full",
                            isDark ? "bg-[#131B2E] border-emerald-500/50 text-white" : "bg-white border-emerald-500 text-slate-900 shadow-2xs"
                          )}
                          placeholder="Contact name..."
                        />
                        <button
                          onClick={handleSaveContactName}
                          disabled={isSavingName}
                          className="p-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shrink-0"
                          title="Save name"
                        >
                          {isSavingName ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                        </button>
                        <button
                          onClick={() => setIsEditingName(false)}
                          className={cn(
                            "p-1 rounded-md transition-colors shrink-0",
                            isDark ? "bg-white/10 hover:bg-white/20 text-slate-400 hover:text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900"
                          )}
                          title="Cancel"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                    <p className={cn("text-xs truncate", isDark ? "text-slate-400" : "text-slate-500")}>
                      {activeChat.companyName}
                    </p>
                    <span className={cn(
                      "inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold border",
                      isDark ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" : "bg-indigo-50 text-indigo-700 border-indigo-200"
                    )}>
                      High Intent Prospect
                    </span>
                  </div>
                </div>

                {/* Contact details */}
                <div className="space-y-2 pt-2 text-xs">
                  <div className={cn("flex items-center gap-2", isDark ? "text-slate-300" : "text-slate-700")}>
                    <Phone className={cn("w-3.5 h-3.5 shrink-0", isDark ? "text-slate-400" : "text-slate-500")} />
                    <span className="font-mono text-[11px] truncate">{activeChat.phone}</span>
                  </div>
                  <div className={cn("flex items-center gap-2", isDark ? "text-slate-300" : "text-slate-700")}>
                    <Mail className={cn("w-3.5 h-3.5 shrink-0", isDark ? "text-slate-400" : "text-slate-500")} />
                    <span className="truncate">{activeChat.email}</span>
                  </div>
                  <div className={cn("flex items-center gap-2", isDark ? "text-slate-300" : "text-slate-700")}>
                    <Building2 className={cn("w-3.5 h-3.5 shrink-0", isDark ? "text-slate-400" : "text-slate-500")} />
                    <span className="truncate">{activeChat.companyName}</span>
                  </div>
                </div>

                {/* Assigned Sales Rep */}
                <div className={cn("pt-2 border-t flex items-center justify-between text-xs", isDark ? "border-[#1E293B]/60 text-slate-400" : "border-slate-200 text-slate-500")}>
                  <span>Assigned Rep:</span>
                  <div className={cn("flex items-center gap-1.5 font-medium", isDark ? "text-slate-200" : "text-slate-800")}>
                    <div className="w-5 h-5 rounded-full bg-emerald-600/30 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center text-[10px]">
                      {activeChat.assignedRep.avatar}
                    </div>
                    <span>{activeChat.assignedRep.name}</span>
                  </div>
                </div>
              </div>

              {/* Deal Status & Pipeline */}
              <div className={cn("p-4 border-b space-y-3", isDark ? "border-[#1E293B]/60" : "border-slate-200")}>
                <div className="flex items-center justify-between">
                  <span className={cn("font-bold text-xs flex items-center gap-1.5", isDark ? "text-slate-300" : "text-slate-700")}>
                    <Handshake className="w-3.5 h-3.5 text-indigo-500" />
                    Pipeline & Deal
                  </span>
                  <span className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-md border",
                    isDark ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" : "text-emerald-700 bg-emerald-50 border-emerald-200"
                  )}>
                    Active
                  </span>
                </div>

                {/* Deal Stage Selector */}
                <div>
                  <label className={cn("block text-[11px] font-semibold mb-1", isDark ? "text-slate-400" : "text-slate-600")}>
                    Current Deal Stage
                  </label>
                  <select
                    value={activeChat.dealStage}
                    onChange={(e) => handleStageChange(e.target.value)}
                    className={cn(
                      "w-full border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500 cursor-pointer transition-colors",
                      isDark ? "bg-[#131B2E] border-[#1E293B] text-white" : "bg-slate-50 border-slate-200 text-slate-900 focus:bg-white"
                    )}
                  >
                    <option value="Discovery">Discovery</option>
                    <option value="Qualified">Qualified</option>
                    <option value="Proposal">Proposal</option>
                    <option value="Negotiation">Negotiation</option>
                    <option value="Won">Won</option>
                    <option value="Lost">Lost</option>
                  </select>
                </div>

                {/* Deal Value */}
                <div>
                  <label className={cn("block text-[11px] font-semibold mb-1", isDark ? "text-slate-400" : "text-slate-600")}>
                    Deal Value (INR)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formatCurrency(activeChat.dealValue)}
                      onChange={(e) => handleDealValueChange(e.target.value)}
                      className={cn(
                        "w-full border rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-emerald-500 font-mono transition-colors",
                        isDark ? "bg-[#131B2E] border-[#1E293B] text-emerald-400" : "bg-slate-50 border-slate-200 text-emerald-600 focus:bg-white"
                      )}
                    />
                  </div>
                </div>

                <div className={cn("flex items-center justify-between text-xs pt-1", isDark ? "text-slate-400" : "text-slate-500")}>
                  <span>Target Close Date:</span>
                  <span className={cn("font-medium", isDark ? "text-slate-200" : "text-slate-800")}>{activeChat.dealCloseDate}</span>
                </div>
              </div>

              {/* Quick Actions Panel */}
              <div className={cn("p-4 border-b space-y-2", isDark ? "border-[#1E293B]/60" : "border-slate-200")}>
                <span className={cn("font-bold text-xs block mb-2", isDark ? "text-slate-300" : "text-slate-700")}>
                  Quick Actions
                </span>

                <button
                  onClick={() => setShowNewNoteModal(true)}
                  className={cn(
                    "w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-medium transition-all cursor-pointer",
                    isDark ? "bg-white/5 hover:bg-white/10 text-slate-200 border-[#1E293B]" : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                  )}
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-500" />
                  <span>+ Add Internal Note</span>
                </button>

                <button
                  onClick={() => {
                    toast.success("Call Scheduled", `Follow-up call booked with ${activeChat.contactName} for tomorrow 3:00 PM`);
                  }}
                  className={cn(
                    "w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-medium transition-all cursor-pointer",
                    isDark ? "bg-white/5 hover:bg-white/10 text-slate-200 border-[#1E293B]" : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                  )}
                >
                  <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Schedule Call / Follow-up</span>
                </button>

                <button
                  onClick={handleQuickSendQuote}
                  className={cn(
                    "w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer",
                    isDark
                      ? "bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border-emerald-500/40"
                      : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-300 shadow-2xs"
                  )}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Generate GST Quotation</span>
                </button>
              </div>

              {/* Notes & Activity Timeline */}
              <div className="p-4 flex-1 space-y-3">
                <div className="flex items-center justify-between">
                  <span className={cn("font-bold text-xs", isDark ? "text-slate-300" : "text-slate-700")}>
                    Activity & Notes ({activeChat.notes.length})
                  </span>
                </div>

                <div className="space-y-2.5">
                  {activeChat.notes.map((note) => (
                    <div
                      key={note.id}
                      className={cn(
                        "p-3 rounded-xl border text-xs space-y-1.5 transition-colors",
                        isDark ? "bg-[#131B2E]/60 border-[#1E293B]" : "bg-slate-50 border-slate-200"
                      )}
                    >
                      <p className={cn("leading-relaxed", isDark ? "text-slate-200" : "text-slate-800")}>{note.text}</p>
                      <div className={cn("flex items-center justify-between text-[10px] pt-1 border-t", isDark ? "border-white/5 text-slate-400" : "border-slate-200 text-slate-500")}>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">{note.author}</span>
                        <span>{note.timestamp}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Modal: Add Internal Note */}
      {showNewNoteModal && activeChat && (
        <div className={cn(
          "fixed inset-0 z-50 backdrop-blur-xs flex items-center justify-center p-4",
          isDark ? "bg-black/80" : "bg-slate-900/40"
        )}>
          <div className={cn(
            "border rounded-2xl p-5 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95",
            isDark ? "bg-[#131B2E] border-[#1E293B]" : "bg-white border-slate-200 text-slate-900"
          )}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={cn("font-bold text-sm flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
                <Plus className="w-4 h-4 text-emerald-500" />
                Add Internal Note for {activeChat.contactName}
              </h3>
              <button
                onClick={() => setShowNewNoteModal(false)}
                className={isDark ? "text-slate-400 hover:text-white" : "text-slate-400 hover:text-slate-700"}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddNoteSubmit} className="space-y-4">
              <div>
                <textarea
                  rows={4}
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  placeholder="Record customer preferences, budget discussion, or next steps..."
                  className={cn(
                    "w-full border rounded-xl p-3 text-xs focus:outline-none focus:border-emerald-500",
                    isDark ? "bg-[#090A0F] border-[#1E293B] text-white placeholder-slate-500" : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white"
                  )}
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewNoteModal(false)}
                  className={cn("px-3.5 py-2 rounded-xl text-xs font-medium", isDark ? "text-slate-300 hover:bg-white/5" : "text-slate-600 hover:bg-slate-100")}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newNoteText.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all disabled:opacity-50"
                >
                  Save Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
