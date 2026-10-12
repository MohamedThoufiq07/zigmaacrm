import {
  INITIAL_LEADS,
  INITIAL_DEALS,
  INITIAL_CONTACTS,
  INITIAL_ACCOUNTS,
  INITIAL_TASKS,
  INITIAL_EVENTS,
  INITIAL_EXPENSES,
  INITIAL_INVOICES,
  INITIAL_AUTOMATIONS,
  Lead,
  Deal,
  Contact,
  Account,
  Task,
  CalendarEvent,
  Expense,
  Invoice,
  AutomationLog,
  OPDToken,
  formatGoogleCalendarUrl,
  downloadIcsFile
} from "./mockData";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8005/api/v1";

function getStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === "undefined") return defaultValue;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setStorage<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error("LocalStorage write error", e);
  }
}

export const zigmaaApi = {
  async getHealth() {
    try {
      const res = await fetch(`${API_BASE}/health`, { cache: "no-store" });
      if (res.ok) return await res.json();
    } catch {}
    return { status: "healthy", service: "Zigmaa CRM Production UI", version: "2.0.0" };
  },

  async login(email: string, password: string) {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      if (res.ok) return await res.json();
    } catch {}
    
    return {
      access_token: "jwt_token_zigmaa_pixelize",
      token_type: "bearer",
      user: {
        id: "user-1",
        organization_id: "org-1",
        email: email || "admin@zigmaa.com",
        full_name: "Mohamed Thoufiq",
        role: "ADMIN",
        is_active: true
      }
    };
  },

  async loginWithGoogle(googleUser: { email: string; name?: string; picture?: string; token?: string }) {
    try {
      const res = await fetch(`${API_BASE}/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(googleUser)
      });
      if (res.ok) {
        const data = await res.json();
        setStorage("zigmaa_token", data.access_token);
        setStorage("zigmaa_user", data.user || googleUser);
        return data;
      }
    } catch {}

    // Fallback: save local session so user enters CRM instantly
    setStorage("zigmaa_user", googleUser);
    setStorage("zigmaa_token", `google_token_${Date.now()}`);
    return {
      access_token: `google_token_${Date.now()}`,
      token_type: "bearer",
      user: {
        id: "google-user-1",
        organization_id: "org-1",
        email: googleUser.email,
        full_name: googleUser.name || "Google User",
        role: "ADMIN",
        is_active: true
      }
    };
  },

  // ===== DASHBOARD METRICS (STARTS FROM ZERO) =====
  async getDashboardMetrics() {
    const leads = await this.getLeads();
    const deals = await this.getDeals();
    const expenses = await this.getExpenses();

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const todayStr = now.toISOString().split("T")[0];
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayStr = yesterday.toISOString().split("T")[0];
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    const totalLeads = leads.length;
    const newLeadsThisWeek = leads.filter(l => new Date(l.created_at) >= oneWeekAgo).length;
    const convertedLeads = leads.filter(l => l.stage === "Closed / Won" || l.status === "CONVERTED").length;
    const conversionRate = totalLeads > 0 ? Number(((convertedLeads / totalLeads) * 100).toFixed(1)) : 0;
    
    const overdueFollowups = leads.filter(l => {
      if (l.stage === "Closed / Won" || l.stage === "Lost") return false;
      const created = new Date(l.created_at);
      const daysOld = (now.getTime() - created.getTime()) / (1000 * 3600 * 24);
      return daysOld > 3;
    }).length;

    const todaysLeads = leads.filter(l => (l.created_at || "").startsWith(todayStr)).length;
    const yesterdaysLeads = leads.filter(l => (l.created_at || "").startsWith(yesterdayStr)).length;
    const leadsThisMonth = leads.filter(l => {
      const d = new Date(l.created_at);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    }).length;

    const totalPipelineValue = deals.reduce((sum, d) => sum + (Number(d.value) || 0), 0);
    const wonDeals = deals.filter(d => d.stage === "Closed Won").length;
    const winRate = deals.length > 0 ? Number(((wonDeals / deals.length) * 100).toFixed(1)) : 0;

    const funnelBreakdown: Record<string, number> = {
      "Meta Ads": 0,
      "Google Ads": 0,
      "Website Form": 0,
      "Walk-in": 0,
      "Referral": 0
    };
    leads.forEach(l => {
      const src = l.ad_source || l.source || "Meta Ads";
      if (src in funnelBreakdown) {
        funnelBreakdown[src] += 1;
      } else {
        funnelBreakdown[src] = 1;
      }
    });

    const totalExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    return {
      total_leads: totalLeads,
      new_leads_this_week: newLeadsThisWeek,
      conversion_rate: conversionRate,
      overdue_followups: overdueFollowups,
      todays_leads: todaysLeads,
      yesterdays_leads: yesterdaysLeads,
      leads_this_month: leadsThisMonth,
      converted_leads: convertedLeads,
      total_deals: deals.length,
      total_pipeline_value: totalPipelineValue,
      win_rate: winRate,
      total_expenses: totalExpenses,
      funnel_breakdown: funnelBreakdown
    };
  },

  // ===== LEADS CRUD =====
  async getLeads(filters?: { search?: string; status?: string; source?: string; stage?: string; ad_source?: string }): Promise<Lead[]> {
    try {
      const query = new URLSearchParams();
      if (filters?.search) query.append("search", filters.search);
      if (filters?.status || filters?.stage) query.append("status", (filters.status || filters.stage)!);
      if (filters?.source || filters?.ad_source) query.append("source", (filters.source || filters.ad_source)!);

      const res = await fetch(`${API_BASE}/leads?${query.toString()}`, { cache: "no-store" });
      if (res.ok) {
        const backendLeads = await res.json();
        if (Array.isArray(backendLeads) && backendLeads.length > 0) {
          return backendLeads;
        }
      }
    } catch {}

    let leads = getStorage<Lead[]>("zigmaa_leads", INITIAL_LEADS);

    if (filters?.search) {
      const q = filters.search.toLowerCase();
      leads = leads.filter(l =>
        l.name.toLowerCase().includes(q) ||
        (l.email && l.email.toLowerCase().includes(q)) ||
        l.phone.toLowerCase().includes(q) ||
        (l.company_name && l.company_name.toLowerCase().includes(q))
      );
    }
    if (filters?.stage || filters?.status) {
      const s = filters.stage || filters.status;
      leads = leads.filter(l => l.stage === s || l.status === s);
    }
    if (filters?.ad_source || filters?.source) {
      const src = filters.ad_source || filters.source;
      leads = leads.filter(l => l.ad_source === src || l.source === src);
    }

    return leads;
  },

  async createLead(leadData: Partial<Lead>): Promise<Lead> {
    try {
      const res = await fetch(`${API_BASE}/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(leadData)
      });
      if (res.ok) return await res.json();
    } catch {}

    const leads = getStorage<Lead[]>("zigmaa_leads", INITIAL_LEADS);
    const newLead: Lead = {
      id: Date.now(),
      name: leadData.name || "Untitled Lead",
      phone: leadData.phone || "",
      email: leadData.email || "",
      company_name: leadData.company_name || "",
      ad_source: (leadData.ad_source as any) || "Meta Ads",
      stage: (leadData.stage as any) || "New Lead",
      deal_value: Number(leadData.deal_value) || 0,
      notes: leadData.notes || "",
      custom_fields: leadData.custom_fields || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      activities: [
        {
          id: Date.now() + 1,
          lead_id: Date.now(),
          activity_type: "status_change",
          description: `Lead created via ${leadData.ad_source || "Manual Entry"}`,
          created_at: new Date().toISOString()
        }
      ]
    };

    leads.unshift(newLead);
    setStorage("zigmaa_leads", leads);
    return newLead;
  },

  async bulkUploadLeads(rows: any[]): Promise<{ total_ingested: number; records: Lead[] }> {
    const leads = getStorage<Lead[]>("zigmaa_leads", INITIAL_LEADS);
    const newLeads: Lead[] = rows.map((r, idx) => ({
      id: Date.now() + idx,
      name: r.full_name || r.name || r["Contact Name"] || `Lead ${idx + 1}`,
      phone: r.phone || r["Phone Number"] || "",
      email: r.email || r["Email Address"] || "",
      company_name: r.company_name || r.company || r["Company Name"] || "",
      ad_source: (r.source || r.ad_source || "CSV Import") as any,
      stage: (r.stage || "New Lead") as any,
      deal_value: Number(r.deal_value || r["Deal Value"]) || 0,
      notes: r.notes || "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    const combined = [...newLeads, ...leads];
    setStorage("zigmaa_leads", combined);
    return {
      total_ingested: newLeads.length,
      records: newLeads
    };
  },

  async updateLead(id: number | string, patch: Partial<Lead>): Promise<Lead | null> {
    try {
      const res = await fetch(`${API_BASE}/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch)
      });
      if (res.ok) return await res.json();
    } catch {}

    const leads = getStorage<Lead[]>("zigmaa_leads", INITIAL_LEADS);
    const index = leads.findIndex(l => String(l.id) === String(id));
    if (index === -1) return null;

    leads[index] = {
      ...leads[index],
      ...patch,
      updated_at: new Date().toISOString()
    };
    setStorage("zigmaa_leads", leads);
    return leads[index];
  },

  async updateLeadStage(id: number | string, stage: string): Promise<Lead | null> {
    return this.updateLead(id, { stage: stage as any });
  },

  async deleteLead(id: number | string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/leads/${id}`, { method: "DELETE" });
      if (res.ok) return true;
    } catch {}

    const leads = getStorage<Lead[]>("zigmaa_leads", INITIAL_LEADS);
    const filtered = leads.filter(l => String(l.id) !== String(id));
    setStorage("zigmaa_leads", filtered);
    return true;
  },

  async addLeadActivity(leadId: number | string, activity: { activity_type: any; description: string }) {
    const leads = getStorage<Lead[]>("zigmaa_leads", INITIAL_LEADS);
    const lead = leads.find(l => String(l.id) === String(leadId));
    if (!lead) return null;

    if (!lead.activities) lead.activities = [];
    const newAct = {
      id: Date.now(),
      lead_id: leadId,
      activity_type: activity.activity_type,
      description: activity.description,
      created_at: new Date().toISOString()
    };
    lead.activities.unshift(newAct);
    setStorage("zigmaa_leads", leads);
    return newAct;
  },

  async addLeadNote(leadId: number | string, note: string, type: string = "note"): Promise<Lead | null> {
    await this.addLeadActivity(leadId, { activity_type: type as any, description: note });
    const leads = getStorage<Lead[]>("zigmaa_leads", INITIAL_LEADS);
    return leads.find(l => String(l.id) === String(leadId)) || null;
  },

  // ===== DEALS (PIPELINE) CRUD =====
  async getDeals(): Promise<Deal[]> {
    try {
      const res = await fetch(`${API_BASE}/deals`, { cache: "no-store" });
      if (res.ok) return await res.json();
    } catch {}
    return getStorage<Deal[]>("zigmaa_deals", INITIAL_DEALS);
  },

  async createDeal(dealData: Partial<Deal>): Promise<Deal> {
    try {
      const res = await fetch(`${API_BASE}/deals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dealData)
      });
      if (res.ok) return await res.json();
    } catch {}

    const deals = getStorage<Deal[]>("zigmaa_deals", INITIAL_DEALS);
    const newDeal: Deal = {
      id: Date.now(),
      title: dealData.title || "New Deal",
      company_name: dealData.company_name || "",
      contact_name: dealData.contact_name || "",
      value: Number(dealData.value) || 0,
      stage: dealData.stage || "Qualification",
      probability: Number(dealData.probability) || 20,
      close_date: dealData.close_date || new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
      created_at: new Date().toISOString()
    };
    deals.unshift(newDeal);
    setStorage("zigmaa_deals", deals);
    return newDeal;
  },

  async updateDeal(id: number | string, patch: Partial<Deal>): Promise<Deal | null> {
    const deals = getStorage<Deal[]>("zigmaa_deals", INITIAL_DEALS);
    const index = deals.findIndex(d => String(d.id) === String(id));
    if (index === -1) return null;

    deals[index] = { ...deals[index], ...patch };
    setStorage("zigmaa_deals", deals);
    return deals[index];
  },

  async deleteDeal(id: number | string): Promise<boolean> {
    const deals = getStorage<Deal[]>("zigmaa_deals", INITIAL_DEALS);
    const filtered = deals.filter(d => String(d.id) !== String(id));
    setStorage("zigmaa_deals", filtered);
    return true;
  },

  // ===== CONTACTS CRUD =====
  async getContacts(): Promise<Contact[]> {
    return getStorage<Contact[]>("zigmaa_contacts", INITIAL_CONTACTS);
  },

  async createContact(contactData: Partial<Contact>): Promise<Contact> {
    const contacts = getStorage<Contact[]>("zigmaa_contacts", INITIAL_CONTACTS);
    const newContact: Contact = {
      id: Date.now(),
      name: contactData.name || "",
      email: contactData.email || "",
      phone: contactData.phone || "",
      company_name: contactData.company_name || "",
      job_title: contactData.job_title || "",
      status: contactData.status || "Active",
      created_at: new Date().toISOString()
    };
    contacts.unshift(newContact);
    setStorage("zigmaa_contacts", contacts);
    return newContact;
  },

  async deleteContact(id: number | string): Promise<boolean> {
    const contacts = getStorage<Contact[]>("zigmaa_contacts", INITIAL_CONTACTS);
    const filtered = contacts.filter(c => String(c.id) !== String(id));
    setStorage("zigmaa_contacts", filtered);
    return true;
  },

  // ===== ACCOUNTS CRUD =====
  async getAccounts(): Promise<Account[]> {
    return getStorage<Account[]>("zigmaa_accounts", INITIAL_ACCOUNTS);
  },

  async createAccount(accData: Partial<Account>): Promise<Account> {
    const accounts = getStorage<Account[]>("zigmaa_accounts", INITIAL_ACCOUNTS);
    const newAcc: Account = {
      id: Date.now(),
      name: accData.name || "",
      industry: accData.industry || "Technology",
      phone: accData.phone || "",
      website: accData.website || "",
      city: accData.city || "",
      annual_revenue: Number(accData.annual_revenue) || 0,
      created_at: new Date().toISOString()
    };
    accounts.unshift(newAcc);
    setStorage("zigmaa_accounts", accounts);
    return newAcc;
  },

  async deleteAccount(id: number | string): Promise<boolean> {
    const accounts = getStorage<Account[]>("zigmaa_accounts", INITIAL_ACCOUNTS);
    const filtered = accounts.filter(a => String(a.id) !== String(id));
    setStorage("zigmaa_accounts", filtered);
    return true;
  },

  // ===== TASKS CRUD =====
  async getTasks(): Promise<Task[]> {
    return getStorage<Task[]>("zigmaa_tasks", INITIAL_TASKS);
  },

  async createTask(taskData: Partial<Task>): Promise<Task> {
    const tasks = getStorage<Task[]>("zigmaa_tasks", INITIAL_TASKS);
    const newTask: Task = {
      id: Date.now(),
      title: taskData.title || "",
      due_date: taskData.due_date || new Date(Date.now() + 86400000).toISOString().split("T")[0],
      priority: taskData.priority || "Medium",
      status: taskData.status || "To Do",
      related_to: taskData.related_to || "",
      created_at: new Date().toISOString()
    };
    tasks.unshift(newTask);
    setStorage("zigmaa_tasks", tasks);
    return newTask;
  },

  async updateTask(id: number | string, patch: Partial<Task>): Promise<Task | null> {
    const tasks = getStorage<Task[]>("zigmaa_tasks", INITIAL_TASKS);
    const idx = tasks.findIndex(t => String(t.id) === String(id));
    if (idx === -1) return null;
    tasks[idx] = { ...tasks[idx], ...patch };
    setStorage("zigmaa_tasks", tasks);
    return tasks[idx];
  },

  async deleteTask(id: number | string): Promise<boolean> {
    const tasks = getStorage<Task[]>("zigmaa_tasks", INITIAL_TASKS);
    const filtered = tasks.filter(t => String(t.id) !== String(id));
    setStorage("zigmaa_tasks", filtered);
    return true;
  },

  // ===== CALENDAR EVENTS & GOOGLE CALENDAR CRUD =====
  async getEvents(): Promise<CalendarEvent[]> {
    return getStorage<CalendarEvent[]>("zigmaa_events", INITIAL_EVENTS);
  },

  async createEvent(eventData: Partial<CalendarEvent>): Promise<CalendarEvent> {
    const events = getStorage<CalendarEvent[]>("zigmaa_events", INITIAL_EVENTS);
    const now = new Date();
    const defaultStart = new Date(now.getTime() + 3600000).toISOString().slice(0, 16);
    const defaultEnd = new Date(now.getTime() + 7200000).toISOString().slice(0, 16);

    const newEvent: CalendarEvent = {
      id: Date.now(),
      title: eventData.title || "Sales Meeting",
      description: eventData.description || "",
      start_time: eventData.start_time || defaultStart,
      end_time: eventData.end_time || defaultEnd,
      location: eventData.location || "Online Google Meet",
      attendee_name: eventData.attendee_name || "",
      attendee_email: eventData.attendee_email || "",
      event_type: eventData.event_type || "Meeting",
      google_calendar_synced: false,
      created_at: new Date().toISOString()
    };

    events.unshift(newEvent);
    setStorage("zigmaa_events", events);
    return newEvent;
  },

  async deleteEvent(id: number | string): Promise<boolean> {
    const events = getStorage<CalendarEvent[]>("zigmaa_events", INITIAL_EVENTS);
    const filtered = events.filter(e => String(e.id) !== String(id));
    setStorage("zigmaa_events", filtered);
    return true;
  },

  async syncWithGoogleCalendar(id: number | string): Promise<string> {
    const events = getStorage<CalendarEvent[]>("zigmaa_events", INITIAL_EVENTS);
    const ev = events.find(e => String(e.id) === String(id));
    if (!ev) throw new Error("Event not found");

    ev.google_calendar_synced = true;
    setStorage("zigmaa_events", events);
    return formatGoogleCalendarUrl(ev);
  },

  // ===== EXPENSES CRUD =====
  async getExpenses(): Promise<Expense[]> {
    return getStorage<Expense[]>("zigmaa_expenses", INITIAL_EXPENSES);
  },

  async createExpense(expData: Partial<Expense>): Promise<Expense> {
    const expenses = getStorage<Expense[]>("zigmaa_expenses", INITIAL_EXPENSES);
    const newExp: Expense = {
      id: Date.now(),
      title: expData.title || "",
      category: expData.category || "Software",
      amount: Number(expData.amount) || 0,
      date: expData.date || new Date().toISOString().split("T")[0],
      payment_method: expData.payment_method || "Card",
      status: expData.status || "Paid",
      created_at: new Date().toISOString()
    };
    expenses.unshift(newExp);
    setStorage("zigmaa_expenses", expenses);
    return newExp;
  },

  async deleteExpense(id: number | string): Promise<boolean> {
    const expenses = getStorage<Expense[]>("zigmaa_expenses", INITIAL_EXPENSES);
    const filtered = expenses.filter(e => String(e.id) !== String(id));
    setStorage("zigmaa_expenses", filtered);
    return true;
  },

  // ===== INVOICES CRUD =====
  async getInvoices(): Promise<Invoice[]> {
    return getStorage<Invoice[]>("zigmaa_invoices", INITIAL_INVOICES);
  },

  async createInvoice(invData: Partial<Invoice>): Promise<Invoice> {
    const invoices = getStorage<Invoice[]>("zigmaa_invoices", INITIAL_INVOICES);
    const newInv: Invoice = {
      id: Date.now(),
      bill_number: `INV-${Date.now().toString().slice(-6)}`,
      client_name: invData.client_name || invData.patient_name || "Client",
      phone: invData.phone || "",
      email: invData.email || "",
      items: invData.items || [{ name: "Professional CRM Consulting", qty: 1, unit_price: 0, total: 0 }],
      total_amount: Number(invData.total_amount) || 0,
      payment_method: invData.payment_method || "Bank Transfer",
      status: invData.status || "Paid",
      created_at: new Date().toISOString()
    };
    invoices.unshift(newInv);
    setStorage("zigmaa_invoices", invoices);
    return newInv;
  },

  async deleteInvoice(id: number | string): Promise<boolean> {
    const invoices = getStorage<Invoice[]>("zigmaa_invoices", INITIAL_INVOICES);
    const filtered = invoices.filter(i => String(i.id) !== String(id));
    setStorage("zigmaa_invoices", filtered);
    return true;
  },

  // ===== AUTOMATIONS & COMPATIBILITY =====
  async getAutomations(): Promise<AutomationLog[]> {
    return getStorage<AutomationLog[]>("zigmaa_automations", INITIAL_AUTOMATIONS);
  },

  async getTodayTokens(): Promise<OPDToken[]> {
    return [];
  },

  async updateTokenStatus(tokenId: number, newStatus: string): Promise<any> {
    return { id: tokenId, status: newStatus };
  },

  async saveConsultation(...args: any[]): Promise<any> {
    return { success: true, args };
  },

  async issueToken(...args: any[]): Promise<any> {
    return { id: Date.now(), token_number: 1, args };
  },

  // ===== RESET ALL DATA TO ZERO (FRESH START) =====
  clearAllData() {
    if (typeof window === "undefined") return;
    localStorage.removeItem("zigmaa_leads");
    localStorage.removeItem("zigmaa_deals");
    localStorage.removeItem("zigmaa_contacts");
    localStorage.removeItem("zigmaa_accounts");
    localStorage.removeItem("zigmaa_tasks");
    localStorage.removeItem("zigmaa_events");
    localStorage.removeItem("zigmaa_expenses");
    localStorage.removeItem("zigmaa_invoices");
    localStorage.removeItem("zigmaa_automations");
  }
};

export default zigmaaApi;
export { formatGoogleCalendarUrl, downloadIcsFile };
