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

  // Polling: refresh conversations and active messages every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadConversations(true);
      if (activePhone) {
        loadMessages(activePhone, true);
      }
    }, 4000);

    return () => clearInterval(interval);
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
    <div className="flex h-screen bg-[#090A0F] text-slate-100 font-sans overflow-hidden select-none">
      {/* Main Sidebar */}
      <Sidebar />

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#090A0F]">
        {/* CRM Global Header */}
        <Header title="WhatsApp Business Suite" />

        {/* 3-Column WhatsApp Suite Workspace */}
        <div className="flex-1 flex min-h-0 overflow-hidden relative">

          {/* ========================================================= */}
          {/* COLUMN A: Chat Conversation Thread List (~320px width)    */}
          {/* ========================================================= */}
          <div className="w-80 lg:w-88 shrink-0 border-r border-[#1E293B] bg-[#090A0F] flex flex-col">
            {/* Top Header */}
            <div className="p-4 border-b border-[#1E293B]/80 flex flex-col gap-3 bg-[#0D0F17]/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    <MessageSquare className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-base text-white tracking-tight">WhatsApp Inbox</h2>
                    <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Live • Meta Cloud API</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => loadConversations(false)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                    title="Refresh conversations"
                  >
                    <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin text-emerald-400")} />
                  </button>
                  <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 rounded-full">
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
                  className="w-full bg-[#131B2E]/90 border border-[#1E293B] rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500/50 transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
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
                          : "bg-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10"
                      )}
                    >
                      <span>{tab}</span>
                      <span
                        className={cn(
                          "text-[10px] px-1.5 py-0.2 rounded-full font-semibold",
                          filterTab === tab ? "bg-emerald-700/80 text-white" : "bg-white/10 text-slate-400"
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
            <div className="flex-1 overflow-y-auto divide-y divide-[#1E293B]/40 scrollbar-thin scrollbar-thumb-slate-800">
              {isLoadingConversations && conversations.length === 0 ? (
                <div className="p-6 space-y-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-center gap-3 animate-pulse">
                      <div className="w-11 h-11 rounded-full bg-white/5" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-28 bg-white/5 rounded-md" />
                        <div className="h-2 w-36 bg-white/5 rounded-md" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  <MessageSquare className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
                  <p>No WhatsApp conversations yet.</p>
                  <p className="text-[11px] text-slate-500 mt-1">
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
                          ? "bg-[#131B2E] border-l-3 border-emerald-500 shadow-inner"
                          : "hover:bg-white/[0.03]"
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
                        <span className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#090A0F] absolute -bottom-0.5 -right-0.5" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <h4
                            className={cn(
                              "text-xs font-semibold truncate",
                              isSelected ? "text-white font-bold" : "text-slate-200"
                            )}
                          >
                            {conv.contactName}
                          </h4>
                          <span className="text-[10px] text-slate-400 shrink-0 font-medium ml-1">
                            {formatTime(conv.lastMessageTime)}
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-400 truncate mb-1">
                          {conv.companyName}
                        </div>

                        {/* Last message preview + unread pill */}
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1 text-[11px] text-slate-400 truncate min-w-0">
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
          <div className="flex-1 flex flex-col bg-[#0D0B14] relative min-w-0">
            {activeChat ? (
              <>
                {/* Chat Header */}
                <div className="h-16 px-5 border-b border-[#1E293B] bg-[#090A0F]/80 backdrop-blur-md flex items-center justify-between shrink-0 z-10">
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
                        <h3 className="font-bold text-sm text-white truncate">{activeChat.contactName}</h3>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {activeChat.dealStage}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400 truncate">
                        <span>{activeChat.phone}</span>
                        <span>•</span>
                        <span className="text-emerald-400 font-medium flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                          Online • Meta Webhook Live
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleQuickCreateDeal}
                      className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-[#1E293B] text-xs font-medium transition-all cursor-pointer"
                      title="Create or link pipeline deal"
                    >
                      <Handshake className="w-3.5 h-3.5 text-indigo-400" />
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
                        "p-2 rounded-xl border border-[#1E293B] transition-colors cursor-pointer",
                        showRightDrawer
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          : "bg-white/5 text-slate-400 hover:text-white"
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
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 scrollbar-thin scrollbar-thumb-slate-800">
                  {/* Subtle Date Separator */}
                  <div className="flex items-center justify-center my-3">
                    <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-white/5 text-slate-400 border border-white/5">
                      Meta WhatsApp Verified Channel • End-to-End Encrypted
                    </span>
                  </div>

                  {isLoadingMessages && messages.length === 0 ? (
                    <div className="flex items-center justify-center py-12 text-slate-400 gap-2">
                      <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
                      <span className="text-xs">Loading message history...</span>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 space-y-2">
                      <p className="text-xs">No previous message history with this contact.</p>
                      <p className="text-[11px] text-slate-500">
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
                              "rounded-2xl p-3.5 max-w-[85%] sm:max-w-[70%] text-sm leading-relaxed shadow-lg backdrop-blur-xs transition-all",
                              isOutbound
                                ? "bg-emerald-600/20 border border-emerald-500/30 text-white rounded-tr-sm ml-auto"
                                : "bg-white/5 border border-white/10 text-white rounded-tl-sm"
                            )}
                          >
                            {/* Message Text */}
                            <p className="whitespace-pre-wrap select-text">{msg.text}</p>

                            {/* Attachment Card if present */}
                            {msg.attachment && (
                              <div className="mt-2.5 p-3 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0">
                                    <File className="w-4 h-4" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="text-xs font-semibold text-white truncate">
                                      {msg.attachment.name}
                                    </div>
                                    <div className="text-[10px] text-slate-400">
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
                                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 transition-colors shrink-0"
                                  title="Download document"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </a>
                              </div>
                            )}

                            {/* Message Footer: Time + Status Tick */}
                            <div className="flex items-center justify-end gap-1.5 mt-1.5 text-[10px] text-slate-400 font-medium">
                              <span>{msg.timeLabel}</span>
                              {isOutbound && (
                                <CheckCheck
                                  className={cn(
                                    "w-3.5 h-3.5",
                                    msg.status === "READ" ? "text-cyan-400" : "text-slate-400"
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
                  <div className="mx-4 mb-2 p-3 bg-[#131B2E] border border-emerald-500/30 rounded-2xl shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 z-20">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#1E293B]">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                        <Zap className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Meta Cloud Pre-Approved WhatsApp Templates</span>
                      </div>
                      <button
                        onClick={() => setShowTemplateSelector(false)}
                        className="text-slate-400 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {META_TEMPLATES.map((tpl) => (
                        <div
                          key={tpl.id}
                          className="p-2.5 rounded-xl bg-white/5 hover:bg-emerald-500/10 border border-white/5 hover:border-emerald-500/30 transition-all group flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-bold text-slate-200 group-hover:text-emerald-400">
                                {tpl.name}
                              </span>
                              <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-md bg-white/10 text-slate-400">
                                {tpl.tag}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                              {tpl.content.replace("{{name}}", activeChat.contactName.split(" ")[0])}
                            </p>
                          </div>

                          <div className="flex items-center justify-end gap-1.5 mt-2 pt-1 border-t border-white/5">
                            <button
                              onClick={() => handleSelectTemplate(tpl)}
                              className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-white/5 hover:bg-white/10 text-slate-300"
                            >
                              Insert
                            </button>
                            <button
                              onClick={() => handleFastSendTemplate(tpl)}
                              className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white"
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
                <div className="p-4 border-t border-[#1E293B] bg-[#090A0F]/90 backdrop-blur-md shrink-0">
                  {/* Quick Template bar */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowTemplateSelector(!showTemplateSelector)}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer",
                          showTemplateSelector
                            ? "bg-emerald-500 text-white shadow-xs shadow-emerald-500/40"
                            : "bg-white/5 hover:bg-white/10 text-emerald-400 border border-emerald-500/30"
                        )}
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>Templates (/)</span>
                      </button>

                      <button
                        onClick={() => {
                          setMessageInput("Hi " + activeChat.contactName.split(" ")[0] + ", thanks for reaching out! Let us schedule a quick call.");
                        }}
                        className="hidden sm:inline-flex px-2 py-0.5 rounded-md text-[11px] bg-white/5 hover:bg-white/10 text-slate-300"
                      >
                        ⚡ Quick Greeting
                      </button>
                      <button
                        onClick={handleQuickSendQuote}
                        className="hidden md:inline-flex px-2 py-0.5 rounded-md text-[11px] bg-white/5 hover:bg-white/10 text-slate-300"
                      >
                        ⚡ Share Quotation Link
                      </button>
                    </div>

                    <div className="text-[11px] text-slate-400">
                      Press <kbd className="px-1 py-0.5 rounded bg-white/10 text-slate-300 text-[10px]">Enter</kbd> to send
                    </div>
                  </div>

                  {/* Input row */}
                  <div className="flex items-end gap-2 bg-[#131B2E] border border-[#1E293B] focus-within:border-emerald-500/60 rounded-2xl p-2 transition-all">
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
                      className="p-2.5 text-slate-400 hover:text-emerald-400 hover:bg-white/5 rounded-xl transition-colors cursor-pointer shrink-0"
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
                      className="flex-1 bg-transparent border-0 text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-0 resize-none py-2 px-1 max-h-32 min-h-[38px] leading-relaxed"
                    />

                    {/* Emoji / Trigger */}
                    <button
                      type="button"
                      onClick={() => setMessageInput((prev) => prev + " 👍")}
                      className="p-2.5 text-slate-400 hover:text-amber-400 hover:bg-white/5 rounded-xl transition-colors cursor-pointer shrink-0"
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
                          : "bg-white/5 text-slate-500 cursor-not-allowed"
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
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 space-y-3">
                <MessageSquare className="w-12 h-12 text-slate-600 opacity-40" />
                <h3 className="font-bold text-white text-base">Select a conversation</h3>
                <p className="text-xs text-slate-500 text-center max-w-sm">
                  Choose a contact from the left list to view WhatsApp message thread, or wait for new inbound leads.
                </p>
              </div>
            )}
          </div>

          {/* ========================================================= */}
          {/* COLUMN C: CRM Context & Quick Actions Drawer (~300px)     */}
          {/* ========================================================= */}
          {showRightDrawer && activeChat && (
            <div className="w-80 shrink-0 border-l border-[#1E293B] bg-[#090A0F] flex flex-col overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
              {/* Header */}
              <div className="p-4 border-b border-[#1E293B] flex items-center justify-between bg-[#0D0F17]/60">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-xs text-white uppercase tracking-wider">
                    CRM Lead Context
                  </span>
                </div>
                <button
                  onClick={() => setShowRightDrawer(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 lg:hidden"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Customer Profile Card */}
              <div className="p-4 border-b border-[#1E293B]/60 space-y-3">
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
                        <h4 className="font-bold text-sm text-white truncate">{activeChat.contactName}</h4>
                        <button
                          onClick={() => {
                            setEditedName(activeChat.contactName);
                            setIsEditingName(true);
                          }}
                          className="opacity-60 group-hover/name:opacity-100 p-0.5 hover:bg-white/10 rounded text-slate-400 hover:text-emerald-400 transition-all cursor-pointer"
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
                          className="bg-[#131B2E] border border-emerald-500/50 rounded-lg px-2 py-0.5 text-xs text-white focus:outline-none w-full"
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
                          className="p-1 rounded-md bg-white/10 hover:bg-white/20 text-slate-400 hover:text-white transition-colors shrink-0"
                          title="Cancel"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                    <p className="text-xs text-slate-400 truncate">{activeChat.companyName}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      High Intent Prospect
                    </span>
                  </div>
                </div>

                {/* Contact details */}
                <div className="space-y-2 pt-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-mono text-[11px] truncate">{activeChat.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{activeChat.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{activeChat.companyName}</span>
                  </div>
                </div>

                {/* Assigned Sales Rep */}
                <div className="pt-2 border-t border-[#1E293B]/60 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Assigned Rep:</span>
                  <div className="flex items-center gap-1.5 font-medium text-slate-200">
                    <div className="w-5 h-5 rounded-full bg-emerald-600/30 text-emerald-400 font-bold flex items-center justify-center text-[10px]">
                      {activeChat.assignedRep.avatar}
                    </div>
                    <span>{activeChat.assignedRep.name}</span>
                  </div>
                </div>
              </div>

              {/* Deal Status & Pipeline */}
              <div className="p-4 border-b border-[#1E293B]/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-300 flex items-center gap-1.5">
                    <Handshake className="w-3.5 h-3.5 text-indigo-400" />
                    Pipeline & Deal
                  </span>
                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                    Active
                  </span>
                </div>

                {/* Deal Stage Selector */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Current Deal Stage
                  </label>
                  <select
                    value={activeChat.dealStage}
                    onChange={(e) => handleStageChange(e.target.value)}
                    className="w-full bg-[#131B2E] border border-[#1E293B] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
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
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Deal Value (INR)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formatCurrency(activeChat.dealValue)}
                      onChange={(e) => handleDealValueChange(e.target.value)}
                      className="w-full bg-[#131B2E] border border-[#1E293B] rounded-xl px-3 py-2 text-xs font-bold text-emerald-400 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                  <span>Target Close Date:</span>
                  <span className="font-medium text-slate-200">{activeChat.dealCloseDate}</span>
                </div>
              </div>

              {/* Quick Actions Panel */}
              <div className="p-4 border-b border-[#1E293B]/60 space-y-2">
                <span className="font-bold text-xs text-slate-300 block mb-2">
                  Quick Actions
                </span>

                <button
                  onClick={() => setShowNewNoteModal(true)}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-[#1E293B] text-xs font-medium transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-400" />
                  <span>+ Add Internal Note</span>
                </button>

                <button
                  onClick={() => {
                    toast.success("Call Scheduled", `Follow-up call booked with ${activeChat.contactName} for tomorrow 3:00 PM`);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-[#1E293B] text-xs font-medium transition-all cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Schedule Call / Follow-up</span>
                </button>

                <button
                  onClick={handleQuickSendQuote}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold transition-all cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Generate GST Quotation</span>
                </button>
              </div>

              {/* Notes & Activity Timeline */}
              <div className="p-4 flex-1 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-300">
                    Activity & Notes ({activeChat.notes.length})
                  </span>
                </div>

                <div className="space-y-2.5">
                  {activeChat.notes.map((note) => (
                    <div
                      key={note.id}
                      className="p-3 rounded-xl bg-[#131B2E]/60 border border-[#1E293B] text-xs space-y-1.5"
                    >
                      <p className="text-slate-200 leading-relaxed">{note.text}</p>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-white/5">
                        <span className="font-medium text-emerald-400">{note.author}</span>
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#131B2E] border border-[#1E293B] rounded-2xl p-5 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                Add Internal Note for {activeChat.contactName}
              </h3>
              <button
                onClick={() => setShowNewNoteModal(false)}
                className="text-slate-400 hover:text-white"
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
                  className="w-full bg-[#090A0F] border border-[#1E293B] rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewNoteModal(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-white/5"
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
