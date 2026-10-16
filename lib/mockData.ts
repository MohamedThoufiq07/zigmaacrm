export interface Activity {
  id: number | string;
  lead_id?: number | string;
  activity_type: "call" | "note" | "whatsapp" | "email" | "status_change" | "meeting";
  description: string;
  created_at: string;
}

export interface Lead {
  id: number | string;
  name: string;
  full_name?: string;
  phone: string;
  email?: string;
  company_name?: string;
  ad_source: "Meta Ads" | "Google Ads" | "Walk-in" | "Referral" | "Website Form" | "LinkedIn" | "Direct" | string;
  stage: "New Lead" | "Contacted / Follow-up" | "Contacted" | "Qualified" | "Consultation Booked" | "Closed / Won" | "CONVERTED" | "Lost" | string;
  status?: string;
  source?: string;
  deal_value: number;
  notes?: string;
  custom_fields?: Record<string, any>;
  created_at: string;
  updated_at: string;
  activities?: Activity[];
}

export interface Deal {
  id: number | string;
  title: string;
  company_name: string;
  contact_name: string;
  contact_email?: string;
  contact_phone?: string;
  value: number;
  deal_value?: number;
  currency?: string;
  stage: "New Deal" | "New" | "Discovery" | "Proposal Sent" | "Negotiation" | "Won" | "Lost" | "Qualification" | "Needs Analysis" | "Proposal / Quote" | "Closed Won" | "Closed Lost" | string;
  stage_id?: string;
  probability: number;
  close_date: string;
  expected_close_date?: string;
  created_at: string;
  lead_id?: number | string;
  contact_id?: number | string;
  status?: string;
  custom_data?: Record<string, any>;
}

export interface Contact {
  id: number | string;
  name: string;
  full_name?: string;
  email: string;
  phone: string;
  company_name: string;
  job_title?: string;
  designation?: string;
  status: "New" | "Contacted" | "Interested" | "Qualified" | "Customer" | "Active" | "Lead" | string;
  lifecycle_stage?: "New" | "Contacted" | "Interested" | "Qualified" | "Customer" | string;
  source?: "Meta Ads" | "Google Ads" | "Website" | "Manual" | string;
  assigned_to?: string;
  total_deals?: number;
  lifetime_value?: number;
  created_at: string;
  updated_at?: string;
  custom_data?: Record<string, any>;
  deals?: any[];
  activities?: any[];
}

export interface Account {
  id: number | string;
  name: string;
  industry: string;
  phone: string;
  website: string;
  city: string;
  annual_revenue: number;
  created_at: string;
}

export interface Task {
  id: number | string;
  title: string;
  activity_type?: "Call" | "WhatsApp" | "Email" | "Meeting" | "To-Do" | string;
  due_date: string;
  due_time?: string;
  priority: "High" | "Medium" | "Low" | "Urgent" | string;
  status: "To Do" | "In Progress" | "Completed" | "PENDING" | "COMPLETED" | string;
  assigned_to?: string;
  description?: string;
  contact_id?: number | string;
  contact_name?: string;
  contact_phone?: string;
  contact_company?: string;
  related_to?: string;
  created_at: string;
}

export interface CalendarEvent {
  id: number | string;
  title: string;
  description?: string;
  notes?: string;
  start_time: string; // ISO string e.g. "2026-10-10T14:00"
  end_time: string;   // ISO string e.g. "2026-10-10T15:00"
  location?: string;
  meeting_link?: string;
  attendee_name?: string;
  attendee_email?: string;
  contact_id?: number | string;
  event_type: "Product Demo" | "Discovery Call" | "Follow-up" | "Closing Meeting" | "Meeting" | "Call" | "Demo" | "Consultation" | string;
  lead_or_deal?: string;
  meet_url?: string;
  google_calendar_synced?: boolean;
  created_at: string;
}

export interface Expense {
  id: number | string;
  title: string;
  category: "Marketing" | "Software" | "Office" | "Travel" | "Salaries" | "Other";
  amount: number;
  date: string;
  payment_method: "Card" | "UPI" | "Bank Transfer" | "Cash";
  status: "Paid" | "Pending";
  created_at: string;
}

export interface InvoiceItem {
  description?: string;
  name?: string;
  qty: number;
  unit_price: number;
  tax_rate?: number;
  amount?: number;
  total?: number;
}

export interface Invoice {
  id: number | string;
  invoice_number?: string;
  bill_number?: string;
  deal_id?: string;
  contact_id?: string;
  client_name: string;
  client_company?: string;
  client_email?: string;
  client_phone?: string;
  patient_name?: string;
  phone?: string;
  email?: string;
  type?: "QUOTE" | "INVOICE" | string;
  status?: "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "Paid" | "Pending" | string;
  issue_date?: string;
  due_date?: string;
  items: InvoiceItem[];
  subtotal?: number;
  tax_amount?: number;
  discount?: number;
  total_amount: number;
  notes?: string;
  payment_method?: "Cash" | "UPI" | "Card" | "Bank Transfer" | string;
  created_at: string;
  updated_at?: string;
}

export interface AutomationLog {
  id: number | string;
  recipient_phone: string;
  message_type: "WhatsApp" | "SMS" | "Email";
  content: string;
  status: "Sent" | "Delivered" | "Failed";
  sent_at: string;
}

// Clean slate - start from ZERO as requested by user
export const INITIAL_LEADS: Lead[] = [];
export const INITIAL_DEALS: Deal[] = [];
export const INITIAL_CONTACTS: Contact[] = [];
export const INITIAL_ACCOUNTS: Account[] = [];
export const INITIAL_TASKS: Task[] = [];
export const INITIAL_EVENTS: CalendarEvent[] = [];
export const INITIAL_EXPENSES: Expense[] = [];
export const INITIAL_INVOICES: Invoice[] = [];
export const INITIAL_AUTOMATIONS: AutomationLog[] = [];

// OPD Token compatibility placeholder
export interface OPDToken {
  id: number;
  token_number: number;
  patient_name: string;
  phone: string;
  status: "Waiting" | "With Doctor" | "Completed";
  bp?: string;
  pulse?: string;
  temp?: string;
  clinical_notes?: string;
  review_date?: string;
  lead_id?: any;
  date_str: string;
  created_at: string;
}
export const INITIAL_TOKENS: OPDToken[] = [];

/**
 * Generates an official Google Calendar template link.
 * Clicking this link opens Google Calendar with the event pre-filled ready to save.
 */
export function formatGoogleCalendarUrl(event: CalendarEvent): string {
  try {
    const formatToGCalDate = (dateStr: string) => {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return new Date().toISOString().replace(/-|:|\.\d\d\d/g, "");
      return d.toISOString().replace(/-|:|\.\d\d\d/g, "");
    };

    const startFormatted = formatToGCalDate(event.start_time);
    const endFormatted = formatToGCalDate(event.end_time || event.start_time);
    const datesParam = `${startFormatted}/${endFormatted}`;

    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: event.title || "CRM Meeting",
      dates: datesParam,
      details: `${event.description || ""}\n\nAttendee: ${event.attendee_name || ""} (${event.attendee_email || ""})\nCreated via Zigmaa CRM`.trim(),
      location: event.location || "Online Google Meet"
    });

    if (event.attendee_email) {
      params.append("add", event.attendee_email);
    }

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  } catch {
    return "https://calendar.google.com";
  }
}

/**
 * Generates and triggers download of an .ics iCalendar file that can be opened in Google Calendar, Outlook, or Apple Calendar.
 */
export function downloadIcsFile(event: CalendarEvent): void {
  if (typeof window === "undefined") return;
  try {
    const formatDate = (iso: string) => {
      const d = new Date(iso);
      return isNaN(d.getTime())
        ? new Date().toISOString().replace(/-|:|\.\d\d\d/g, "")
        : d.toISOString().replace(/-|:|\.\d\d\d/g, "");
    };

    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Zigmaa CRM//Omnichannel Events//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `UID:${event.id}-${Date.now()}@zigmaacrm.com`,
      `DTSTAMP:${formatDate(new Date().toISOString())}`,
      `DTSTART:${formatDate(event.start_time)}`,
      `DTEND:${formatDate(event.end_time || event.start_time)}`,
      `SUMMARY:${event.title.replace(/[\n\r]/g, " ")}`,
      `DESCRIPTION:${(event.description || "").replace(/[\n\r]/g, " ")}`,
      `LOCATION:${(event.location || "Online").replace(/[\n\r]/g, " ")}`,
      "STATUS:CONFIRMED",
      "END:VEVENT",
      "END:VCALENDAR"
    ].join("\r\n");

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const link = document.createElement("a");
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute("download", `${event.title.replace(/[^a-zA-Z0-9]/g, "_") || "event"}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error("Error generating ICS file", err);
  }
}
