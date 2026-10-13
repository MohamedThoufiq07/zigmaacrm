"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  Plus,
  Clock,
  MapPin,
  User,
  Mail,
  Video,
  Download,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Trash2,
  X,
  Search,
  Building2,
  CalendarCheck,
  PhoneCall,
  Sparkles,
  Link2,
  Copy,
  Check
} from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { api, formatGoogleCalendarUrl, downloadIcsFile } from "@/lib/api";
import { CalendarEvent, Lead, Deal } from "@/lib/mockData";
import { useToast } from "@/components/common/ToastProvider";

export default function EventsCalendarPage() {
  const { toast, confirm } = useToast();
  const [mounted, setMounted] = useState(false);

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<"Month" | "Week" | "Day">("Month");
  const [filterType, setFilterType] = useState<string>("All");

  // Form fields for new event
  const [title, setTitle] = useState("");
  const [eventType, setEventType] = useState<"Product Demo" | "Discovery Call" | "Follow-up" | "Closing Meeting">("Product Demo");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [includeGoogleMeet, setIncludeGoogleMeet] = useState(true);
  const [meetUrl, setMeetUrl] = useState("https://meet.google.com/zgm-sales-demo");
  const [customLocation, setCustomLocation] = useState("");
  const [selectedLeadOrDeal, setSelectedLeadOrDeal] = useState<string>("");
  const [leadDealSearch, setLeadDealSearch] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [attendeeName, setAttendeeName] = useState("");
  const [attendeeEmail, setAttendeeEmail] = useState("");
  const [description, setDescription] = useState("");
  const [openGCalImmediately, setOpenGCalImmediately] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [copiedMeetId, setCopiedMeetId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    loadAllData();

    // Default start/end time to next hour
    const now = new Date();
    now.setMinutes(0, 0, 0);
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
    const twoHoursLater = new Date(now.getTime() + 120 * 60 * 1000);

    const pad = (n: number) => String(n).padStart(2, "0");
    const formatForInput = (d: Date) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

    setStartTime(formatForInput(oneHourLater));
    setEndTime(formatForInput(twoHoursLater));
  }, []);

  const loadAllData = async () => {
    try {
      const [eventsData, leadsData, dealsData] = await Promise.all([
        api.getEvents(),
        api.getLeads(),
        api.getDeals()
      ]);
      setEvents(eventsData || []);
      setLeads(leadsData || []);
      setDeals(dealsData || []);
    } catch (e) {
      console.error("Error loading calendar data", e);
    }
  };

  // Helper to open modal with a specific date prefilled
  const openModalWithDate = (targetDate: Date, hour = 10) => {
    const start = new Date(targetDate);
    start.setHours(hour, 0, 0, 0);
    const end = new Date(start.getTime() + 45 * 60 * 1000); // 45-min meeting default

    const pad = (n: number) => String(n).padStart(2, "0");
    const formatForInput = (d: Date) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

    setStartTime(formatForInput(start));
    setEndTime(formatForInput(end));

    // Generate fresh meeting room link
    const code = Math.random().toString(36).substring(2, 6) + "-" + Math.random().toString(36).substring(2, 5);
    setMeetUrl(`https://meet.google.com/zgm-${code}`);

    setShowAddModal(true);
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !startTime) return;
    setSubmitting(true);

    const generatedLocation = includeGoogleMeet
      ? meetUrl || "https://meet.google.com/zgm-live-meet"
      : customLocation || "In-person / Phone";

    const newEventPayload: Partial<CalendarEvent> = {
      title: title.trim(),
      event_type: eventType,
      start_time: startTime,
      end_time: endTime || startTime,
      location: generatedLocation,
      meet_url: includeGoogleMeet ? meetUrl : undefined,
      attendee_name: attendeeName.trim(),
      attendee_email: attendeeEmail.trim(),
      lead_or_deal: selectedLeadOrDeal || undefined,
      description: description.trim(),
      google_calendar_synced: false
    };

    try {
      // Optimistic state update
      const tempId = Date.now();
      const optimisticEvent: CalendarEvent = {
        id: tempId,
        title: title.trim(),
        event_type: eventType,
        start_time: startTime,
        end_time: endTime || startTime,
        location: generatedLocation,
        meet_url: includeGoogleMeet ? meetUrl : undefined,
        attendee_name: attendeeName.trim(),
        attendee_email: attendeeEmail.trim(),
        lead_or_deal: selectedLeadOrDeal || undefined,
        description: description.trim(),
        google_calendar_synced: false,
        created_at: new Date().toISOString()
      };

      setEvents((prev) => [optimisticEvent, ...prev]);

      // Save via API
      const saved = await api.createEvent(newEventPayload);

      if (openGCalImmediately) {
        const gcalUrl = formatGoogleCalendarUrl(saved);
        window.open(gcalUrl, "_blank", "noopener,noreferrer");
      }

      // Reset form
      setTitle("");
      setAttendeeName("");
      setAttendeeEmail("");
      setDescription("");
      setSelectedLeadOrDeal("");
      setCustomLocation("");
      setShowAddModal(false);

      // Re-fetch to guarantee sync
      const freshEvents = await api.getEvents();
      setEvents(freshEvents);
    } catch (err) {
      console.error("Failed to create event", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEvent = async (id: number | string) => {
    const event = events.find((e) => String(e.id) === String(id));
    const confirmed = await confirm({
      title: "Delete Meeting",
      message: `Are you sure you want to delete ${event ? `"${event.title}"` : "this meeting"}?`,
      confirmText: "Delete",
      cancelText: "Cancel",
      variant: "danger"
    });

    if (confirmed) {
      setEvents((prev) => prev.filter((e) => String(e.id) !== String(id)));
      if (selectedEvent && String(selectedEvent.id) === String(id)) {
        setSelectedEvent(null);
      }
      try {
        await api.deleteEvent(id);
        toast.success("Meeting Deleted", "The calendar event was removed.");
      } catch (e) {
        console.error(e);
      }
    }
  };


  const handleOpenGoogleCalendar = (ev: CalendarEvent) => {
    const url = formatGoogleCalendarUrl(ev);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleDownloadIcs = (ev: CalendarEvent) => {
    downloadIcsFile(ev);
  };

  const handleCopyLink = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedMeetId(id);
    setTimeout(() => setCopiedMeetId(null), 2000);
  };

  // Duration quick selector
  const setQuickDuration = (minutes: number) => {
    if (!startTime) return;
    const start = new Date(startTime);
    const end = new Date(start.getTime() + minutes * 60 * 1000);
    const pad = (n: number) => String(n).padStart(2, "0");
    setEndTime(`${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}T${pad(end.getHours())}:${pad(end.getMinutes())}`);
  };

  // Navigation handlers
  const handlePrev = () => {
    if (viewMode === "Month") {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    } else if (viewMode === "Week") {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 7);
      setCurrentDate(d);
    } else {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 1);
      setCurrentDate(d);
    }
  };

  const handleNext = () => {
    if (viewMode === "Month") {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    } else if (viewMode === "Week") {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 7);
      setCurrentDate(d);
    } else {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 1);
      setCurrentDate(d);
    }
  };

  const resetToToday = () => {
    setCurrentDate(new Date());
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  // Filter events
  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (filterType === "All") return true;
      if (filterType === "Demos") return e.event_type === "Product Demo" || e.event_type === "Demo";
      if (filterType === "Discovery") return e.event_type === "Discovery Call";
      if (filterType === "Follow-up") return e.event_type === "Follow-up" || e.event_type === "Call";
      if (filterType === "Closing") return e.event_type === "Closing Meeting";
      return e.event_type === filterType;
    });
  }, [events, filterType]);

  // Week days calculation for Week View
  const weekDays = useMemo(() => {
    const curr = new Date(currentDate);
    const dayOfWeek = curr.getDay(); // 0 is Sunday
    const sunday = new Date(curr);
    sunday.setDate(curr.getDate() - dayOfWeek);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      days.push(d);
    }
    return days;
  }, [currentDate]);

  // Metrics computation
  const totalScheduled = events.length;
  const productDemosCount = events.filter((e) => e.event_type === "Product Demo" || e.event_type === "Demo").length;
  const followUpCallsCount = events.filter((e) => e.event_type === "Follow-up" || e.event_type === "Call" || e.event_type === "Discovery Call").length;

  const getMeetingTypeBadge = (type: string) => {
    switch (type) {
      case "Product Demo":
      case "Demo":
        return {
          bg: "bg-rose-100 text-rose-700 border-rose-200",
          dot: "bg-rose-600",
          icon: Video
        };
      case "Discovery Call":
        return {
          bg: "bg-blue-100 text-blue-700 border-blue-200",
          dot: "bg-blue-600",
          icon: PhoneCall
        };
      case "Closing Meeting":
        return {
          bg: "bg-emerald-100 text-emerald-800 border-emerald-200",
          dot: "bg-emerald-600",
          icon: Sparkles
        };
      case "Follow-up":
      case "Call":
      default:
        return {
          bg: "bg-amber-100 text-amber-800 border-amber-200",
          dot: "bg-amber-600",
          icon: Clock
        };
    }
  };

  const formatEventDateDisplay = (isoStr: string) => {
    if (!isoStr) return "";
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
      });
    } catch {
      return isoStr.slice(0, 10);
    }
  };

  const formatEventTimeDisplay = (startStr: string, endStr?: string) => {
    if (!startStr) return "";
    try {
      const s = new Date(startStr);
      const startTimePart = s.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true
      });
      if (!endStr) return startTimePart;
      const e = new Date(endStr);
      const endTimePart = e.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true
      });
      return `${startTimePart} – ${endTimePart}`;
    } catch {
      return startStr;
    }
  };

  // Filtered Leads & Deals for dropdown
  const filteredLeadDeals = useMemo(() => {
    const q = leadDealSearch.toLowerCase();
    const leadItems = leads
      .filter((l) => l.name.toLowerCase().includes(q) || (l.company_name && l.company_name.toLowerCase().includes(q)))
      .map((l) => ({
        type: "Lead",
        id: `lead-${l.id}`,
        title: `${l.name} (${l.company_name || "Lead"})`,
        name: l.name,
        email: l.email || ""
      }));

    const dealItems = deals
      .filter((d) => d.title.toLowerCase().includes(q) || (d.company_name && d.company_name.toLowerCase().includes(q)))
      .map((d) => ({
        type: "Deal",
        id: `deal-${d.id}`,
        title: `${d.title} • ${d.company_name || ""}`,
        name: d.contact_name || "",
        email: ""
      }));

    return [...leadItems, ...dealItems];
  }, [leads, deals, leadDealSearch]);

  const selectLeadOrDeal = (item: { type: string; title: string; name: string; email: string }) => {
    setSelectedLeadOrDeal(`[${item.type}] ${item.title}`);
    if (item.name && !attendeeName) setAttendeeName(item.name);
    if (item.email && !attendeeEmail) setAttendeeEmail(item.email);
    setIsDropdownOpen(false);
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] text-slate-900 font-sans overflow-hidden select-none">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />

        <main className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6 custom-scrollbar">
          {/* Header Row */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Calendar & Meetings
                </h1>
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Google Calendar Ready
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Schedule client calls, product demos, and sync with Google Calendar
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={() => window.open("https://calendar.google.com", "_blank")}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 hover:border-red-500 hover:text-red-600 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                title="Open Google Calendar in New Tab"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Google Calendar</span>
              </button>

              <button
                onClick={() => openModalWithDate(new Date())}
                className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Schedule Meeting</span>
              </button>
            </div>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-white border border-slate-200 border-t-[3px] border-t-red-600 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Scheduled</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{totalScheduled}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Active upcoming events</p>
              </div>
              <div className="p-2.5 rounded-xl bg-red-50 text-red-600">
                <CalendarIcon className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 border-t-[3px] border-t-blue-500 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Product Demos</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{productDemosCount}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Live presentations</p>
              </div>
              <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                <Video className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 border-t-[3px] border-t-emerald-500 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Google Sync</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">Active</p>
                <p className="text-[10px] text-emerald-600/80 mt-0.5">Instant 2-way sync</p>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 border-t-[3px] border-t-amber-500 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Follow-up Calls</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{followUpCallsCount}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Discovery & client calls</p>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
                <Clock className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Main Grid: Interactive Calendar & Schedule Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Calendar Container (8 cols) */}
            <div className="lg:col-span-8 p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
              {/* Calendar Controls & View Switcher */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <h2 className="text-base font-bold text-slate-900">
                    {viewMode === "Month" && `${monthNames[month]} ${year}`}
                    {viewMode === "Week" &&
                      `${monthNames[weekDays[0].getMonth()]} ${weekDays[0].getDate()} – ${
                        monthNames[weekDays[6].getMonth()] !== monthNames[weekDays[0].getMonth()]
                          ? monthNames[weekDays[6].getMonth()] + " "
                          : ""
                      }${weekDays[6].getDate()}, ${weekDays[6].getFullYear()}`}
                    {viewMode === "Day" &&
                      currentDate.toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        year: "numeric"
                      })}
                  </h2>

                  <button
                    onClick={resetToToday}
                    className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                  >
                    Today
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={handlePrev}
                      className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
                      title="Previous"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleNext}
                      className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
                      title="Next"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* View Toggles [ Month | Week | Day ] */}
                <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
                  {(["Month", "Week", "Day"] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setViewMode(mode)}
                      className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                        viewMode === mode
                          ? "bg-white text-red-600 shadow-xs font-bold"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              {/* VIEW 1: MONTH VIEW */}
              {viewMode === "Month" && (
                <div className="space-y-2">
                  <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-slate-400 uppercase pb-1">
                    <span>Sun</span>
                    <span>Mon</span>
                    <span>Tue</span>
                    <span>Wed</span>
                    <span>Thu</span>
                    <span>Fri</span>
                    <span>Sat</span>
                  </div>

                  <div className="grid grid-cols-7 gap-1.5">
                    {/* Padding before day 1 */}
                    {Array.from({ length: firstDayIndex }).map((_, idx) => (
                      <div
                        key={`empty-${idx}`}
                        className="h-22 bg-slate-50/40 rounded-xl border border-dashed border-slate-100"
                      />
                    ))}

                    {/* Real Days of the month */}
                    {Array.from({ length: daysInMonth }).map((_, idx) => {
                      const dayNum = idx + 1;
                      const dayDateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
                      const dayEvents = filteredEvents.filter((e) => (e.start_time || "").startsWith(dayDateStr));
                      const isToday =
                        mounted &&
                        new Date().getDate() === dayNum &&
                        new Date().getMonth() === month &&
                        new Date().getFullYear() === year;

                      const thisCellDate = new Date(year, month, dayNum);

                      return (
                        <div
                          key={`day-${dayNum}`}
                          onClick={() => openModalWithDate(thisCellDate)}
                          className={`group h-22 p-2 rounded-xl border text-xs flex flex-col justify-between transition-all cursor-pointer relative hover:shadow-xs ${
                            isToday
                              ? "border-red-500 bg-red-50/25 ring-1 ring-red-500/30"
                              : "border-slate-100 bg-white hover:border-red-300 hover:bg-slate-50/60"
                          }`}
                          title={`Click to schedule a meeting on ${dayDateStr}`}
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className={`w-6 h-6 flex items-center justify-center rounded-full text-[11px] font-semibold ${
                                isToday ? "bg-red-600 text-white shadow-2xs" : "text-slate-700"
                              }`}
                            >
                              {dayNum}
                            </span>
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-red-600 font-bold">
                              + Add
                            </span>
                          </div>

                          <div className="space-y-1 overflow-hidden mt-1">
                            {dayEvents.slice(0, 2).map((ev) => {
                              const badge = getMeetingTypeBadge(ev.event_type);
                              return (
                                <div
                                  key={ev.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedEvent(ev);
                                  }}
                                  className={`text-[10px] truncate px-1.5 py-0.5 rounded-md font-medium border border-transparent hover:border-red-300 flex items-center gap-1 ${badge.bg}`}
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${badge.dot}`} />
                                  <span className="truncate">{ev.title}</span>
                                </div>
                              );
                            })}
                            {dayEvents.length > 2 && (
                              <span className="text-[9px] font-semibold text-slate-500 pl-1 block">
                                +{dayEvents.length - 2} more
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* VIEW 2: WEEK VIEW */}
              {viewMode === "Week" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-7 gap-2">
                    {weekDays.map((d, index) => {
                      const dayNum = d.getDate();
                      const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
                      const pad = (n: number) => String(n).padStart(2, "0");
                      const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(dayNum)}`;
                      const isToday =
                        mounted &&
                        new Date().getDate() === dayNum &&
                        new Date().getMonth() === d.getMonth() &&
                        new Date().getFullYear() === d.getFullYear();
                      const dayEvents = filteredEvents.filter((e) => (e.start_time || "").startsWith(dateStr));

                      return (
                        <div
                          key={`week-day-${index}`}
                          className={`rounded-xl border p-2 flex flex-col min-h-[360px] transition-all ${
                            isToday ? "border-red-500 bg-red-50/20" : "border-slate-200 bg-white"
                          }`}
                        >
                          <div
                            onClick={() => openModalWithDate(d)}
                            className="text-center pb-2 border-b border-slate-100 cursor-pointer hover:bg-slate-50 rounded-lg p-1 transition-colors"
                            title="Click to schedule on this day"
                          >
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">{dayName}</span>
                            <span
                              className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold mt-0.5 ${
                                isToday ? "bg-red-600 text-white" : "text-slate-800"
                              }`}
                            >
                              {dayNum}
                            </span>
                          </div>

                          {/* Events for this week day */}
                          <div className="space-y-1.5 mt-2 flex-1 overflow-y-auto custom-scrollbar">
                            {dayEvents.map((ev) => {
                              const badge = getMeetingTypeBadge(ev.event_type);
                              return (
                                <div
                                  key={ev.id}
                                  onClick={() => setSelectedEvent(ev)}
                                  className={`p-1.5 rounded-lg border text-left cursor-pointer transition-all hover:shadow-xs ${badge.bg}`}
                                >
                                  <p className="text-[10px] font-bold truncate leading-tight">{ev.title}</p>
                                  <p className="text-[9px] opacity-80 mt-0.5">
                                    {formatEventTimeDisplay(ev.start_time, ev.end_time)}
                                  </p>
                                </div>
                              );
                            })}

                            <button
                              onClick={() => openModalWithDate(d)}
                              className="w-full py-1.5 mt-1 border border-dashed border-slate-200 hover:border-red-300 hover:bg-red-50/50 rounded-lg text-[10px] text-slate-400 hover:text-red-600 font-semibold transition-all cursor-pointer"
                            >
                              + Add
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* VIEW 3: DAY VIEW */}
              {viewMode === "Day" && (
                <div className="space-y-3">
                  <div className="p-3 bg-red-50/50 border border-red-100 rounded-xl flex items-center justify-between text-xs">
                    <span className="font-semibold text-red-950">
                      Day Agenda: {currentDate.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" })}
                    </span>
                    <button
                      onClick={() => openModalWithDate(currentDate)}
                      className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 cursor-pointer"
                    >
                      + Schedule Meeting
                    </button>
                  </div>

                  {/* Hourly timeline */}
                  <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden max-h-[420px] overflow-y-auto custom-scrollbar">
                    {[8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map((hour) => {
                      const pad = (n: number) => String(n).padStart(2, "0");
                      const hourDateStr = `${currentDate.getFullYear()}-${pad(currentDate.getMonth() + 1)}-${pad(currentDate.getDate())}T${pad(hour)}`;
                      const hourEvents = filteredEvents.filter((e) => (e.start_time || "").startsWith(hourDateStr));
                      const displayHour = hour > 12 ? `${hour - 12}:00 PM` : hour === 12 ? "12:00 PM" : `${hour}:00 AM`;

                      return (
                        <div
                          key={hour}
                          onClick={() => openModalWithDate(currentDate, hour)}
                          className="flex items-start p-2.5 hover:bg-slate-50 transition-colors group cursor-pointer"
                        >
                          <div className="w-20 text-[11px] font-bold text-slate-400 shrink-0 pt-1">
                            {displayHour}
                          </div>

                          <div className="flex-1 space-y-1">
                            {hourEvents.length > 0 ? (
                              hourEvents.map((ev) => {
                                const badge = getMeetingTypeBadge(ev.event_type);
                                return (
                                  <div
                                    key={ev.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedEvent(ev);
                                    }}
                                    className={`p-2 rounded-xl border flex items-center justify-between gap-2 cursor-pointer ${badge.bg}`}
                                  >
                                    <div>
                                      <span className="text-[11px] font-bold">{ev.title}</span>
                                      <p className="text-[10px] opacity-80">
                                        {formatEventTimeDisplay(ev.start_time, ev.end_time)} {ev.attendee_name ? `• ${ev.attendee_name}` : ""}
                                      </p>
                                    </div>
                                    {ev.location && ev.location.includes("meet.google.com") && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          window.open(ev.location, "_blank");
                                        }}
                                        className="px-2 py-1 bg-white/90 text-red-700 hover:bg-white text-[10px] font-bold rounded-lg shadow-2xs flex items-center gap-1"
                                      >
                                        <Video className="w-3 h-3" />
                                        <span>Join</span>
                                      </button>
                                    )}
                                  </div>
                                );
                              })
                            ) : (
                              <div className="h-6 flex items-center text-[11px] text-slate-300 group-hover:text-red-600 transition-colors font-medium">
                                + Click to schedule at {displayHour}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Upcoming Schedule Panel (4 cols) */}
            <div className="lg:col-span-4 space-y-4">
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Upcoming Schedule</h3>
                    <p className="text-[11px] text-slate-400">Scheduled client interactions</p>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-100">
                    {filteredEvents.length} meetings
                  </span>
                </div>

                {filteredEvents.length === 0 ? (
                  <div className="py-10 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto shadow-2xs">
                      <CalendarCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-700">No events scheduled</p>
                      <p className="text-[11px] text-slate-400 mt-0.5 max-w-[220px] mx-auto">
                        Click below or tap any calendar cell to schedule a meeting and sync with Google.
                      </p>
                    </div>
                    <button
                      onClick={() => openModalWithDate(new Date())}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                      + Schedule Meeting
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[480px] overflow-y-auto custom-scrollbar pr-0.5">
                    {filteredEvents.map((ev) => {
                      const badge = getMeetingTypeBadge(ev.event_type);
                      const BadgeIcon = badge.icon;
                      const hasMeet =
                        (ev.meet_url && ev.meet_url.includes("meet.google.com")) ||
                        (ev.location && ev.location.includes("meet.google.com"));
                      const meetLink = ev.meet_url || (ev.location?.includes("http") ? ev.location : "https://meet.google.com/new");

                      return (
                        <div
                          key={ev.id}
                          className="p-3.5 rounded-xl border border-slate-200 hover:border-red-300 transition-all bg-slate-50/40 hover:bg-white shadow-2xs space-y-2.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span
                                className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${badge.bg}`}
                              >
                                <BadgeIcon className="w-3 h-3" />
                                {ev.event_type}
                              </span>
                              <h4 className="text-xs font-bold text-slate-900 mt-1.5 leading-snug">{ev.title}</h4>
                            </div>

                            <button
                              onClick={() => handleDeleteEvent(ev.id)}
                              className="text-slate-300 hover:text-rose-600 p-1 rounded-md transition-colors cursor-pointer"
                              title="Delete meeting"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="text-[11px] text-slate-500 space-y-1 pt-0.5">
                            <div className="flex items-center gap-1.5 font-medium text-slate-700">
                              <Clock className="w-3.5 h-3.5 text-red-600 shrink-0" />
                              <span>
                                {formatEventDateDisplay(ev.start_time)} • {formatEventTimeDisplay(ev.start_time, ev.end_time)}
                              </span>
                            </div>

                            {ev.lead_or_deal && (
                              <div className="flex items-center gap-1.5 truncate text-red-700 font-medium">
                                <Building2 className="w-3.5 h-3.5 shrink-0 text-red-500" />
                                <span className="truncate">{ev.lead_or_deal}</span>
                              </div>
                            )}

                            {ev.attendee_name && (
                              <div className="flex items-center gap-1.5 truncate text-slate-600">
                                <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="truncate">
                                  {ev.attendee_name} {ev.attendee_email ? `(${ev.attendee_email})` : ""}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Quick Actions Row */}
                          <div className="pt-2 border-t border-slate-200/60 flex items-center gap-2">
                            {hasMeet ? (
                              <button
                                onClick={() => window.open(meetLink, "_blank")}
                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg shadow-2xs transition-colors cursor-pointer"
                                title="Join Google Meet Room"
                              >
                                <Video className="w-3.5 h-3.5" />
                                <span>Join Meet</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleOpenGoogleCalendar(ev)}
                                className="flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[11px] font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
                              >
                                <CalendarCheck className="w-3.5 h-3.5" />
                                <span>Add to GCal</span>
                              </button>
                            )}

                            <button
                              onClick={() => handleOpenGoogleCalendar(ev)}
                              className="p-1.5 border border-slate-200 hover:bg-red-50 hover:text-red-700 text-slate-600 rounded-lg text-[11px] transition-colors cursor-pointer"
                              title="Sync to Google Calendar"
                            >
                              <CalendarCheck className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleDownloadIcs(ev)}
                              className="p-1.5 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-lg text-[11px] transition-colors cursor-pointer"
                              title="Download .ics Calendar File"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* SCHEDULE MEETING MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-red-50 text-red-600">
                  <CalendarCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Schedule Meeting</h3>
                  <p className="text-xs text-slate-500">Syncs immediately to Google Calendar</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-3.5">
              {/* Meeting Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Meeting Subject / Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Product Demo with CloudScale Technologies"
                  className="w-full bg-slate-50 text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white font-medium"
                />
              </div>

              {/* Associated Lead / Deal (Searchable Select dropdown) */}
              <div className="relative">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Associated Lead / Deal (Optional)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={selectedLeadOrDeal ? selectedLeadOrDeal : leadDealSearch}
                    onChange={(e) => {
                      setLeadDealSearch(e.target.value);
                      setSelectedLeadOrDeal("");
                      setIsDropdownOpen(true);
                    }}
                    onFocus={() => setIsDropdownOpen(true)}
                    placeholder="Search Lead or Deal by name or company..."
                    className="w-full bg-slate-50 text-slate-900 text-xs pl-8 pr-8 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white font-medium"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
                  {selectedLeadOrDeal && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedLeadOrDeal("");
                        setLeadDealSearch("");
                      }}
                      className="absolute right-2.5 top-3 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Dropdown Results */}
                {isDropdownOpen && (
                  <div className="absolute z-20 left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg p-1.5 custom-scrollbar space-y-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedLeadOrDeal("");
                        setIsDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-50 rounded-lg"
                    >
                      • None / Internal Meeting
                    </button>
                    {filteredLeadDeals.length > 0 ? (
                      filteredLeadDeals.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => selectLeadOrDeal(item)}
                          className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors flex items-center justify-between"
                        >
                          <span className="font-semibold">{item.title}</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                            {item.type}
                          </span>
                        </button>
                      ))
                    ) : (
                      <p className="p-2 text-center text-xs text-slate-400">No leads or deals found</p>
                    )}
                  </div>
                )}
              </div>

              {/* Meeting Type */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Meeting Type</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(
                    [
                      { id: "Product Demo", label: "Product Demo" },
                      { id: "Discovery Call", label: "Discovery Call" },
                      { id: "Follow-up", label: "Follow-up" },
                      { id: "Closing Meeting", label: "Closing Meeting" }
                    ] as const
                  ).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setEventType(m.id)}
                      className={`py-2 px-2.5 rounded-xl text-xs font-semibold border transition-all text-center cursor-pointer ${
                        eventType === m.id
                          ? "bg-red-50 border-red-500 text-red-600 font-bold shadow-2xs"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Start Date & Time and End Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Start Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-slate-50 text-slate-900 text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">End Date & Time</label>
                  <input
                    type="datetime-local"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full bg-slate-50 text-slate-900 text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              {/* Quick Duration Buttons */}
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <span className="font-semibold">Quick Duration:</span>
                {[15, 30, 45, 60].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setQuickDuration(mins)}
                    className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-700 font-semibold transition-colors cursor-pointer"
                  >
                    {mins}m
                  </button>
                ))}
              </div>

              {/* Add Google Meet Link (Toggle switch) */}
              <div className="p-3 bg-red-50/70 border border-red-200/80 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Video className="w-4 h-4 text-red-600" />
                    <span className="text-xs font-bold text-red-950">Add Google Meet Video Link</span>
                  </div>

                  {/* Toggle Switch */}
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeGoogleMeet}
                      onChange={(e) => setIncludeGoogleMeet(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-600"></div>
                  </label>
                </div>

                {includeGoogleMeet ? (
                  <div className="flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-lg border border-red-200 text-[11px]">
                    <span className="text-red-700 font-mono font-medium truncate flex-1">{meetUrl}</span>
                    <button
                      type="button"
                      onClick={() => handleCopyLink(meetUrl, "modal")}
                      className="text-red-700 hover:text-red-900 flex items-center gap-1 text-[10px] font-bold cursor-pointer"
                    >
                      {copiedMeetId === "modal" ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-600">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div>
                    <input
                      type="text"
                      value={customLocation}
                      onChange={(e) => setCustomLocation(e.target.value)}
                      placeholder="Custom location (e.g. Office Boardroom, Zoom link, Phone)"
                      className="w-full bg-white text-slate-900 text-xs px-2.5 py-1.5 rounded-lg border border-red-200 focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                )}
              </div>

              {/* Attendee Name & Email */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Attendee Name</label>
                  <input
                    type="text"
                    value={attendeeName}
                    onChange={(e) => setAttendeeName(e.target.value)}
                    placeholder="e.g. Sarah Jenkins"
                    className="w-full bg-slate-50 text-slate-900 text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Attendee Email</label>
                  <input
                    type="email"
                    value={attendeeEmail}
                    onChange={(e) => setAttendeeEmail(e.target.value)}
                    placeholder="sarah@example.com"
                    className="w-full bg-slate-50 text-slate-900 text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              {/* Meeting Agenda Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Meeting Agenda & Notes</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Outline meeting points, goals, and follow-ups..."
                  className="w-full bg-slate-50 text-slate-900 text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              {/* Direct Google Calendar sync option */}
              <label className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={openGCalImmediately}
                  onChange={(e) => setOpenGCalImmediately(e.target.checked)}
                  className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                />
                <span className="text-xs font-semibold text-slate-700">
                  Open Google Calendar immediately on save to sync event
                </span>
              </label>

              {/* Modal Actions */}
              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? "Scheduling..." : "Schedule Meeting"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
