"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";
import {
  Sparkles,
  X,
  Send,
  Bot,
  User,
  HelpCircle,
  Layers,
  Workflow,
  Kanban,
  Users,
  Zap,
  RotateCcw,
  CheckCircle2,
  ChevronRight,
  Loader2
} from "lucide-react";
import { api } from "@/lib/api";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  model?: string;
}

interface AICopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const QUICK_PROMPTS = [
  {
    icon: Users,
    label: "How do Contacts & Leads work?",
    prompt: "How does the Single-Contact Architecture work in Zigmaa CRM? Where are my leads and how do I convert them?"
  },
  {
    icon: Kanban,
    label: "Deals & Pipeline guidance",
    prompt: "How does the Deals Kanban pipeline work in Zigmaa CRM, and how can I move deals across stages?"
  },
  {
    icon: Workflow,
    label: "Automations & WhatsApp setup",
    prompt: "How do I create and manage Workflow Automations (like WhatsApp welcome messages and round-robin assignment)?"
  },
  {
    icon: Zap,
    label: "AI Win Predictor details",
    prompt: "Explain the AI Lead Intelligence & Win Predictor. How does it calculate win percentages and intent tiers?"
  },
  {
    icon: HelpCircle,
    label: "Where are Invoices, Calendar & Tasks?",
    prompt: "Where can I find Invoices, Calendar events, and Tasks in Zigmaa CRM and how do they connect to contacts?"
  }
];

export default function AICopilotDrawer({ isOpen, onClose }: AICopilotDrawerProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "👋 **Hello! I am your Zigmaa AI Copilot.**\n\nI can assist you with your leads, pipeline deals, workflow automations, or any CRM feature. Ask me any question below to get started!",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    }
  ]);
  const pathname = usePathname() || (typeof window !== "undefined" ? window.location.pathname : "/");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeContext, setActiveContext] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Aggregates real-time UI state without giving any mutation access
  const collectActiveUIContext = () => {
    let role = "ADMIN";
    try {
      if (typeof window !== "undefined") {
        role = localStorage.getItem("zigmaa_active_role") || "ADMIN";
      }
    } catch {}

    let pageState: any = null;
    let activeDrawer: any = null;
    if (typeof window !== "undefined") {
      pageState = (window as any).__ZIGMAA_PAGE_STATE || null;
      activeDrawer = (window as any).__ZIGMAA_ACTIVE_DRAWER || null;
    }

    // Determine active tab/filter
    let activeTabName = "Overview";
    if (pageState?.activeTab) {
      activeTabName = pageState.activeTab;
    } else if (pathname.includes("/contacts")) {
      activeTabName = "All Contacts";
    } else if (pathname.includes("/deals") || pathname.includes("/pipeline")) {
      activeTabName = "All Deals";
    } else if (pathname.includes("/tasks")) {
      activeTabName = "All Tasks";
    } else if (pathname.includes("/automations")) {
      activeTabName = "Workflows";
    }

    // Determine currently selected drawer item
    let openDrawerItem = null;
    if (activeDrawer) {
      openDrawerItem = {
        name: activeDrawer.name || activeDrawer.title || "Selected Record",
        type: activeDrawer.type || "contact",
        stage: activeDrawer.stage || "New",
        company: activeDrawer.company || "",
        phone: activeDrawer.phone,
        email: activeDrawer.email,
        value: activeDrawer.value
      };
    }

    return {
      page: pathname,
      active_tab: activeTabName,
      active_item: openDrawerItem,
      visible_summary: pageState || { route: pathname, activeTab: activeTabName },
      user_role: role
    };
  };

  useEffect(() => {
    if (!isOpen) return;

    const refreshContext = () => {
      setActiveContext(collectActiveUIContext());
    };

    refreshContext();
    const interval = setInterval(refreshContext, 1200);

    setTimeout(() => {
      inputRef.current?.focus();
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 150);

    return () => clearInterval(interval);
  }, [isOpen, pathname]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Dynamic quick prompts adapted to current screen and active drawer
  const contextualPrompts = useMemo(() => {
    const list = [...QUICK_PROMPTS];
    if (activeContext?.active_item?.name) {
      list.unshift({
        icon: Users,
        label: `Help me with ${activeContext.active_item.name}`,
        prompt: `Help me with this client (${activeContext.active_item.name}). Based on what you see, what should my next steps be?`
      });
    } else if (pathname.includes("/contacts")) {
      list.unshift({
        icon: Users,
        label: "What should I focus on?",
        prompt: "What should I focus on in my active Contacts table view right now?"
      });
    } else if (pathname.includes("/deals") || pathname.includes("/pipeline")) {
      list.unshift({
        icon: Kanban,
        label: "Review my pipeline deals",
        prompt: "Review my current Deals pipeline and recommend which deals need immediate follow-up to close."
      });
    }
    return list;
  }, [activeContext, pathname]);

  if (!isOpen) return null;

  const handleSend = async (textToSend?: string) => {
    const question = (textToSend || input).trim();
    if (!question || loading) return;

    setErrorMessage(null);

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: question,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      // Build conversation history for context
      const history = messages
        .filter((m) => m.id !== "welcome")
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.content }));

      // Aggregate real-time UI context
      const liveUiContext = collectActiveUIContext();
      setActiveContext(liveUiContext);

      const res = await api.askCopilot(question, history, liveUiContext);

      if (res.status === "error" || res.error || !res.answer) {
        const errorText = res.error || "Gemini API Key missing or invalid. Please check your .env";
        setErrorMessage(errorText);
        setMessages((prev) => [
          ...prev,
          {
            id: `ai-err-${Date.now()}`,
            role: "assistant",
            content: `⚠️ **Error**: ${errorText}`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          }
        ]);
        return;
      }

      const assistantMessage: Message = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: res.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        model: res.model_used
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      const errDetail = err?.message || "Failed to reach AI Copilot server.";
      setErrorMessage(errDetail);
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          role: "assistant",
          content: `⚠️ **Connection Error**: ${errDetail}`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: "welcome-reset",
        role: "assistant",
        content: "Chat cleared! How can I assist you with Zigmaa CRM today?",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      }
    ]);
  };

  // Basic markdown parser for bold, lists, and linebreaks
  const formatMarkdown = (text: string) => {
    const lines = text.split("\n");
    return lines.map((line, i) => {
      // Bold handling: **text**
      const formattedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

      if (line.startsWith("### ")) {
        return (
          <h3
            key={i}
            className="text-sm font-bold text-slate-900 mt-2 mb-1"
            dangerouslySetInnerHTML={{ __html: line.replace("### ", "") }}
          />
        );
      }
      if (line.startsWith("## ")) {
        return (
          <h2
            key={i}
            className="text-sm font-bold text-red-600 mt-2.5 mb-1"
            dangerouslySetInnerHTML={{ __html: line.replace("## ", "") }}
          />
        );
      }
      if (line.startsWith("- ") || line.startsWith("* ")) {
        return (
          <div key={i} className="flex items-start gap-1.5 ml-2 my-0.5 text-xs text-slate-700">
            <span className="text-red-500 font-bold shrink-0">•</span>
            <span dangerouslySetInnerHTML={{ __html: formattedLine.replace(/^[-*]\s*/, "") }} />
          </div>
        );
      }
      if (/^\d+\.\s/.test(line)) {
        return (
          <div key={i} className="flex items-start gap-1.5 ml-2 my-0.5 text-xs text-slate-700">
            <span className="text-red-600 font-semibold shrink-0">{line.match(/^\d+\./)?.[0]}</span>
            <span dangerouslySetInnerHTML={{ __html: formattedLine.replace(/^\d+\.\s*/, "") }} />
          </div>
        );
      }
      if (line.trim() === "") {
        return <div key={i} className="h-1.5" />;
      }
      return (
        <p
          key={i}
          className="text-xs text-slate-700 leading-relaxed my-0.5"
          dangerouslySetInnerHTML={{ __html: formattedLine }}
        />
      );
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/30 backdrop-blur-[2px] transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-250 border-l border-slate-200">
        {/* Drawer Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 bg-gradient-to-r from-red-50 via-white to-rose-50/50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-red-600 to-rose-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-bold text-slate-900">Zigmaa AI Copilot</h2>
                <span className="text-[10px] bg-red-100 text-red-700 font-semibold px-1.5 py-0.5 rounded-full">
                  CRM Assistant
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Ask any doubt or explore all CRM features
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleClearHistory}
              title="Reset conversation"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Explicit Warning/Error Banner */}
        {errorMessage && (
          <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-2 shrink-0 animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <span className="text-amber-600 font-bold shrink-0">⚠️</span>
              <span className="font-medium text-[11px] leading-tight">{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-amber-700 hover:text-amber-900 font-semibold text-[10px] px-1.5 py-0.5 rounded-sm hover:bg-amber-100 transition-colors shrink-0 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Quick Topic Chips */}
        <div className="px-4 py-2 bg-slate-50/80 border-b border-slate-100 shrink-0 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="text-slate-400 font-medium whitespace-nowrap text-[10px] uppercase tracking-wider">
              Quick Doubt:
            </span>
            {contextualPrompts.map((item, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(item.prompt)}
                disabled={loading}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-700 hover:border-red-300 hover:text-red-700 hover:bg-red-50/40 transition-all font-medium whitespace-nowrap shadow-2xs text-[11px] disabled:opacity-50 cursor-pointer"
              >
                <item.icon className="w-3 h-3 text-red-500" />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/30">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="w-6 h-6 rounded-lg bg-red-600 text-white flex items-center justify-center text-xs shrink-0 mt-0.5 shadow-2xs">
                  <Bot className="w-3.5 h-3.5" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl p-3 shadow-2xs text-xs ${
                  msg.role === "user"
                    ? "bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-br-xs"
                    : "bg-white border border-slate-200/90 text-slate-800 rounded-bl-xs"
                }`}
              >
                {msg.role === "user" ? (
                  <p className="whitespace-pre-wrap leading-relaxed font-medium">{msg.content}</p>
                ) : (
                  <div>{formatMarkdown(msg.content)}</div>
                )}
                <div
                  className={`mt-1.5 flex items-center justify-between text-[10px] ${
                    msg.role === "user" ? "text-red-100" : "text-slate-400"
                  }`}
                >
                  <span>{msg.timestamp}</span>
                  {msg.model && (
                    <span className="text-[9px] uppercase tracking-wider text-slate-400">
                      {msg.model}
                    </span>
                  )}
                </div>
              </div>

              {msg.role === "user" && (
                <div className="w-6 h-6 rounded-lg bg-slate-900 text-white flex items-center justify-center text-xs shrink-0 mt-0.5 shadow-2xs">
                  <User className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-2.5 justify-start">
              <div className="w-6 h-6 rounded-lg bg-red-600 text-white flex items-center justify-center text-xs shrink-0 shadow-2xs animate-pulse">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-xs p-3 shadow-2xs flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 text-red-600 animate-spin" />
                <span className="text-xs text-slate-500 font-medium">
                  Zigmaa Copilot is thinking...
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* CRM Info Footer & Input */}
        <div className="p-3 bg-white border-t border-slate-200 shrink-0 space-y-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask any doubt about Zigmaa CRM..."
                disabled={loading}
                className="w-full bg-slate-50 text-slate-900 text-xs pl-3 pr-8 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white placeholder:text-slate-400 font-medium transition-all disabled:opacity-60"
              />
            </div>
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="p-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 text-white hover:from-red-700 hover:to-rose-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs cursor-pointer shrink-0"
              title="Send message"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>

          <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-red-500" />
              Powered by Google Gemini 2.5 Flash
            </span>
            <span className="text-slate-400">Press Enter to send</span>
          </div>
        </div>
      </div>
    </div>
  );
}
