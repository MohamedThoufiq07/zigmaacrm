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

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000/api/v1";

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
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), password })
    });
    
    if (!res.ok) {
      let errorMsg = "Incorrect email or password";
      try {
        const errorData = await res.json();
        errorMsg = errorData.detail || errorMsg;
      } catch {}
      throw new Error(errorMsg);
    }

    const data = await res.json();
    setStorage("zigmaa_token", data.access_token);
    setStorage("zigmaa_user", data.user);
    return data;
  },

  async register(data: { email: string; password: string; full_name: string; organization_name?: string }) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    if (!res.ok) {
      let errorMsg = "Failed to create account";
      try {
        const errJson = await res.json();
        errorMsg = errJson.detail || errorMsg;
      } catch {}
      throw new Error(errorMsg);
    }

    const resData = await res.json();
    setStorage("zigmaa_token", resData.access_token);
    setStorage("zigmaa_user", resData.user);
    return resData;
  },

  async sendOtp(email: string) {
    const res = await fetch(`${API_BASE}/auth/send-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim() })
    });

    if (!res.ok) {
      let errorMsg = "Failed to send verification code";
      try {
        const errJson = await res.json();
        errorMsg = errJson.detail || errorMsg;
      } catch {}
      throw new Error(errorMsg);
    }

    return await res.json();
  },

  async verifyOtp(email: string, otp: string) {
    const res = await fetch(`${API_BASE}/auth/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), otp: otp.trim() })
    });

    if (!res.ok) {
      let errorMsg = "Invalid verification code";
      try {
        const errJson = await res.json();
        errorMsg = errJson.detail || errorMsg;
      } catch {}
      throw new Error(errorMsg);
    }

    return await res.json();
  },

  async resetPassword(email: string, otp: string, newPassword: string) {
    const res = await fetch(`${API_BASE}/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), otp: otp.trim(), new_password: newPassword })
    });

    if (!res.ok) {
      let errorMsg = "Failed to reset password";
      try {
        const errJson = await res.json();
        errorMsg = errJson.detail || errorMsg;
      } catch {}
      throw new Error(errorMsg);
    }

    return await res.json();
  },

  async changePassword(params: { email: string; current_password: string; new_password: string }) {
    const res = await fetch(`${API_BASE}/auth/change-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: params.email.trim(),
        current_password: params.current_password,
        new_password: params.new_password
      })
    });

    if (!res.ok) {
      let errorMsg = "Failed to update password";
      try {
        const errJson = await res.json();
        errorMsg = errJson.detail || errorMsg;
      } catch {}
      throw new Error(errorMsg);
    }

    return await res.json();
  },

  async updateProfile(params: {
    email: string;
    full_name?: string;
    new_email?: string;
    phone?: string;
    organization_name?: string;
    picture?: string;
  }) {
    const res = await fetch(`${API_BASE}/auth/update-profile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params)
    });

    if (!res.ok) {
      let errorMsg = "Failed to update profile";
      try {
        const errJson = await res.json();
        errorMsg = errJson.detail || errorMsg;
      } catch {}
      throw new Error(errorMsg);
    }

    const updatedUser = await res.json();
    const current = this.getCurrentUser() || {};
    const merged = {
      ...current,
      ...updatedUser,
      phone: params.phone !== undefined ? params.phone : current.phone,
      organization_name: params.organization_name !== undefined ? params.organization_name : current.organization_name,
      picture: params.picture !== undefined ? params.picture : current.picture
    };
    setStorage("zigmaa_user", merged);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("zigmaa_user_updated"));
    }
    return merged;
  },

  getCurrentUser() {
    return getStorage<any>("zigmaa_user", null);
  },

  logout() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("zigmaa_token");
      localStorage.removeItem("zigmaa_user");
    }
  },

  async loginWithGoogle(googleUser: { email: string; name?: string; picture?: string; token?: string }) {
    const res = await fetch(`${API_BASE}/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(googleUser)
    });

    if (!res.ok) {
      let errorMsg = `No account found with ${googleUser.email}. Please register first.`;
      try {
        const errJson = await res.json();
        errorMsg = errJson.detail || errorMsg;
      } catch {}
      throw new Error(errorMsg);
    }

    const data = await res.json();
    setStorage("zigmaa_token", data.access_token);
    const resolvedUser = {
      id: data.user?.id || `google-${Date.now()}`,
      organization_id: data.user?.organization_id || "org-1",
      email: googleUser.email,
      full_name: googleUser.name || data.user?.full_name || "Google User",
      picture: googleUser.picture || data.user?.picture,
      role: data.user?.role || "ADMIN",
      is_active: true
    };
    setStorage("zigmaa_user", resolvedUser);
    return { ...data, user: resolvedUser };
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
          return backendLeads.map((b: any) => ({
            id: b.id,
            name: b.full_name || b.name || "Unnamed Lead",
            full_name: b.full_name || b.name,
            phone: b.phone || "",
            email: b.email || "",
            company_name: b.company_name || "",
            ad_source: b.source || b.ad_source || "Manual",
            source: b.source || b.ad_source || "Manual",
            stage: b.status || b.stage || "New Lead",
            status: b.status || b.stage || "New Lead",
            deal_value: Number(b.deal_value) || 0,
            assigned_user_id: b.assigned_user_id,
            notes: b.notes || "",
            custom_fields: b.custom_fields || {},
            tags: b.tags || [],
            created_at: b.created_at || new Date().toISOString(),
            updated_at: b.updated_at || new Date().toISOString(),
            activities: b.activities || []
          }));
        }
      }
    } catch {}

    let leads = getStorage<Lead[]>("zigmaa_leads", INITIAL_LEADS);

    if (filters?.search) {
      const q = filters.search.toLowerCase();
      leads = leads.filter(l =>
        (l.name || l.full_name || "").toLowerCase().includes(q) ||
        (l.email && l.email.toLowerCase().includes(q)) ||
        (l.phone && l.phone.toLowerCase().includes(q)) ||
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
      const payload = {
        full_name: leadData.name || leadData.full_name || "Untitled Lead",
        phone: leadData.phone || "",
        email: leadData.email || null,
        company_name: leadData.company_name || null,
        source: leadData.ad_source || leadData.source || "MANUAL",
        status: leadData.stage || leadData.status || "NEW",
        notes: leadData.notes || null,
        custom_fields: leadData.custom_fields || {}
      };
      const res = await fetch(`${API_BASE}/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const b = await res.json();
        return {
          id: b.id,
          name: b.full_name || b.name,
          full_name: b.full_name,
          phone: b.phone,
          email: b.email,
          company_name: b.company_name,
          ad_source: b.source,
          source: b.source,
          stage: b.status,
          status: b.status,
          deal_value: 0,
          created_at: b.created_at,
          updated_at: b.updated_at
        };
      }
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

  async convertLead(leadId: number | string, data: { deal_name?: string; deal_value?: number; pipeline_stage?: string }): Promise<{ success: boolean; message: string; deal_id: string; deal_title: string; contact_id: string; lead_id: string }> {
    try {
      const res = await fetch(`${API_BASE}/leads/${leadId}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        return await res.json();
      } else {
        const err = await res.json();
        throw new Error(err.detail || "Failed to convert lead");
      }
    } catch (e: any) {
      if (e.message && e.message !== "Failed to fetch") {
        throw e;
      }
    }

    // Fallback in localStorage if backend is unreachable
    const leads = getStorage<Lead[]>("zigmaa_leads", INITIAL_LEADS);
    const lead = leads.find(l => String(l.id) === String(leadId));
    if (lead) {
      lead.stage = "Closed / Won" as any;
      lead.status = "CONVERTED";
      setStorage("zigmaa_leads", leads);
    }

    const deals = getStorage<Deal[]>("zigmaa_deals", INITIAL_DEALS);
    const newDeal: Deal = {
      id: Date.now(),
      title: data.deal_name || `${lead?.company_name || lead?.name || "Client"} - Deal`,
      company_name: lead?.company_name || "Enterprise Client",
      contact_name: lead?.name || "",
      value: Number(data.deal_value) || 0,
      stage: (data.pipeline_stage as any) || "Qualification",
      probability: 20,
      close_date: new Date().toISOString().split("T")[0],
      created_at: new Date().toISOString(),
      lead_id: leadId
    };
    deals.unshift(newDeal);
    setStorage("zigmaa_deals", deals);

    const contacts = getStorage<Contact[]>("zigmaa_contacts", INITIAL_CONTACTS);
    const newContact: Contact = {
      id: Date.now(),
      name: lead?.name || "",
      email: lead?.email || "",
      phone: lead?.phone || "",
      company_name: lead?.company_name || "",
      status: "Customer",
      created_at: new Date().toISOString()
    };
    contacts.unshift(newContact);
    setStorage("zigmaa_contacts", contacts);

    return {
      success: true,
      message: "Lead converted to Deal successfully",
      deal_id: String(newDeal.id),
      deal_title: newDeal.title,
      contact_id: String(newContact.id),
      lead_id: String(leadId)
    };
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
      if (res.ok) {
        const backendDeals = await res.json();
        if (Array.isArray(backendDeals) && backendDeals.length > 0) {
          return backendDeals.map((d: any) => ({
            id: d.id,
            title: d.title,
            company_name: (d.custom_data && d.custom_data.company_name) || d.company_name || "Enterprise Account",
            contact_name: (d.custom_data && d.custom_data.contact_name) || d.contact_name || "",
            value: Number(d.deal_value || d.value) || 0,
            deal_value: Number(d.deal_value || d.value) || 0,
            currency: d.currency || "INR",
            stage: d.stage || (d.stage_id ? "Discovery" : "New Deal"),
            stage_id: d.stage_id,
            probability: Number(d.probability) || 50,
            close_date: d.expected_close_date || d.close_date || new Date().toISOString().split("T")[0],
            expected_close_date: d.expected_close_date || d.close_date || new Date().toISOString().split("T")[0],
            lead_id: d.lead_id,
            contact_id: d.contact_id,
            status: d.status || "OPEN",
            custom_data: d.custom_data || {},
            created_at: d.created_at || new Date().toISOString()
          }));
        }
      }
    } catch {}
    return getStorage<Deal[]>("zigmaa_deals", INITIAL_DEALS);
  },

  async getDealsBoard(): Promise<{ pipeline: any; stages: any[] }> {
    try {
      const res = await fetch(`${API_BASE}/deals/board`, { cache: "no-store" });
      if (res.ok) {
        return await res.json();
      }
    } catch {}
    return { pipeline: null, stages: [] };
  },

  async updateDealStage(id: number | string, stage: string, stageId?: string): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/deals/${id}/stage`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage, stage_id: stageId || stage })
      });
      if (res.ok) return await res.json();
    } catch {}

    const deals = getStorage<Deal[]>("zigmaa_deals", INITIAL_DEALS);
    const index = deals.findIndex(d => String(d.id) === String(id));
    if (index !== -1) {
      deals[index] = { ...deals[index], stage: stage as any };
      setStorage("zigmaa_deals", deals);
      return deals[index];
    }
    return null;
  },

  async createDeal(dealData: Partial<Deal>): Promise<Deal> {
    try {
      const payload = {
        title: dealData.title || "New Deal",
        deal_value: Number(dealData.value || dealData.deal_value) || 0,
        currency: dealData.currency || "INR",
        stage_id: dealData.stage_id || dealData.stage || "New Deal",
        lead_id: dealData.lead_id ? String(dealData.lead_id) : null,
        contact_id: dealData.contact_id ? String(dealData.contact_id) : null,
        expected_close_date: dealData.close_date || dealData.expected_close_date,
        custom_data: {
          company_name: dealData.company_name,
          contact_name: dealData.contact_name,
          ...(dealData.custom_data || {})
        }
      };
      const res = await fetch(`${API_BASE}/deals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const d = await res.json();
        return {
          id: d.id,
          title: d.title,
          company_name: dealData.company_name || "Enterprise Account",
          contact_name: dealData.contact_name || "",
          value: Number(d.deal_value) || 0,
          deal_value: Number(d.deal_value) || 0,
          currency: d.currency || "INR",
          stage: dealData.stage || "New Deal",
          probability: Number(dealData.probability) || 50,
          close_date: d.expected_close_date || new Date().toISOString().split("T")[0],
          custom_data: d.custom_data || {},
          created_at: d.created_at
        };
      }
    } catch {}

    const deals = getStorage<Deal[]>("zigmaa_deals", INITIAL_DEALS);
    const newDeal: Deal = {
      id: Date.now(),
      title: dealData.title || "New Deal",
      company_name: dealData.company_name || "",
      contact_name: dealData.contact_name || "",
      value: Number(dealData.value) || 0,
      stage: dealData.stage || "New Deal",
      probability: Number(dealData.probability) || 20,
      close_date: dealData.close_date || new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
      created_at: new Date().toISOString(),
      custom_data: dealData.custom_data || {}
    };
    deals.unshift(newDeal);
    setStorage("zigmaa_deals", deals);
    return newDeal;
  },

  async updateDeal(id: number | string, patch: Partial<Deal>): Promise<Deal | null> {
    if (patch.stage) {
      await this.updateDealStage(id, patch.stage as string, patch.stage_id);
    }
    const deals = getStorage<Deal[]>("zigmaa_deals", INITIAL_DEALS);
    const index = deals.findIndex(d => String(d.id) === String(id));
    if (index === -1) return null;

    deals[index] = { ...deals[index], ...patch };
    setStorage("zigmaa_deals", deals);
    return deals[index];
  },

  async deleteDeal(id: number | string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/deals/${id}`, { method: "DELETE" });
      if (res.ok) return true;
    } catch {}
    const deals = getStorage<Deal[]>("zigmaa_deals", INITIAL_DEALS);
    const filtered = deals.filter(d => String(d.id) !== String(id));
    setStorage("zigmaa_deals", filtered);
    return true;
  },

  // ===== CONTACTS CRUD =====
  async getContacts(): Promise<Contact[]> {
    try {
      const res = await fetch(`${API_BASE}/contacts`, { cache: "no-store" });
      if (res.ok) {
        const backendContacts = await res.json();
        if (Array.isArray(backendContacts)) {
          return backendContacts.map((c: any) => ({
            id: c.id,
            name: c.full_name || c.name || "Unnamed",
            email: c.email || "",
            phone: c.phone || "",
            company_name: c.company_name || "",
            job_title: c.designation || c.job_title || "",
            status: c.status || c.lifecycle_stage || "NEW",
            lifecycle_stage: c.lifecycle_stage || c.status || "NEW",
            source: c.source || "MANUAL",
            assigned_to: c.assigned_user_name || "Mohamed Thoufiq",
            total_deals: c.total_deals || 0,
            lifetime_value: Number(c.lifetime_value) || 0,
            custom_data: c.custom_data || {},
            created_at: c.created_at || new Date().toISOString()
          }));
        }
      }
    } catch (e) {
      console.error("Failed to fetch contacts from API:", e);
    }
    return [];
  },

  async getContactDetail(id: string | number): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/contacts/${id}`, { cache: "no-store" });
      if (res.ok) {
        const c = await res.json();
        return {
          ...c,
          name: c.full_name || c.name,
          lifecycle_stage: c.lifecycle_stage || c.status || "New"
        };
      }
    } catch {}
    const contacts = await this.getContacts();
    return contacts.find(c => String(c.id) === String(id)) || null;
  },

  async getContactAIInsights(id: string | number, refresh: boolean = false): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/contacts/${id}/ai-insights?refresh=${refresh}`, {
        cache: "no-store"
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn("AI Insights API fallback", e);
    }

    // Heuristic fallback if network or server error
    return {
      win_percentage: 45,
      intent_tier: "Medium",
      key_insight: "Prospective buyer actively exploring business solutions.",
      conversion_tips: [
        "Reach out directly via WhatsApp to understand priority requirements",
        "Send tailored pricing breakdown and customer testimonials"
      ],
      risk_warning: "Response speed is key; engagement drops if not contacted promptly.",
      engine: "Instant Client Heuristic"
    };
  },

  async updateContact(id: number | string, data: Partial<Contact>): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/contacts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (res.ok) return await res.json();
    } catch {}

    const contacts = getStorage<Contact[]>("zigmaa_contacts", INITIAL_CONTACTS);
    const updated = contacts.map(c => String(c.id) === String(id) ? { ...c, ...data } : c);
    setStorage("zigmaa_contacts", updated);
    return data;
  },

  async sendContactEmail(id: number | string, data: { subject: string; body: string }): Promise<any> {
    const res = await fetch(`${API_BASE}/contacts/${id}/send-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    if (!res.ok) {
      let errorMsg = "Failed to send email";
      try {
        const errJson = await res.json();
        errorMsg = errJson.detail || errorMsg;
      } catch {}
      throw new Error(errorMsg);
    }

    return await res.json();
  },

  async createContact(contactData: Partial<Contact>): Promise<Contact> {
    const payload = {
      full_name: contactData.name || contactData.full_name || "Unnamed Contact",
      email: contactData.email || null,
      phone: contactData.phone || "",
      company_name: contactData.company_name || null,
      designation: contactData.job_title || null,
      job_title: contactData.job_title || null,
      status: contactData.status || contactData.lifecycle_stage || "NEW",
      lifecycle_stage: contactData.lifecycle_stage || contactData.status || "NEW",
      source: contactData.source || "MANUAL",
      custom_data: contactData.custom_data || {},
      assigned_user_name: contactData.assigned_to || "Mohamed Thoufiq"
    };
    const res = await fetch(`${API_BASE}/contacts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      const c = await res.json();
      return {
        id: c.id,
        name: c.full_name || c.name,
        email: c.email || "",
        phone: c.phone || "",
        company_name: c.company_name || "",
        job_title: c.designation || c.job_title || "",
        status: c.status || "NEW",
        lifecycle_stage: c.lifecycle_stage || c.status || "NEW",
        source: c.source || "MANUAL",
        assigned_to: c.assigned_user_name || "Mohamed Thoufiq",
        total_deals: c.total_deals || 0,
        lifetime_value: c.lifetime_value || 0,
        custom_data: c.custom_data || {},
        created_at: c.created_at
      };
    }
    const errText = await res.text();
    throw new Error(`Failed to create contact: ${errText || res.statusText}`);
  },

  async bulkUploadContacts(rows: any[]): Promise<{ total_ingested: number; records: Contact[] }> {
    const createdList: Contact[] = [];
    for (let idx = 0; idx < rows.length; idx++) {
      const r = rows[idx];
      const contactName =
        r.name || r.full_name || r["Contact Name"] || r["Name"] || r["Full Name"] || `Contact ${idx + 1}`;
      const phone =
        r.phone || r.mobile || r["Phone"] || r["Mobile"] || r["Phone Number"] || r["Mobile Number"] || "";
      const email =
        r.email || r["Email"] || r["Email Address"] || "";
      const company =
        r.company_name || r.company || r["Company"] || r["Company Name"] || "";
      const jobTitle =
        r.job_title || r.designation || r["Job Title"] || r["Designation"] || "";
      const source =
        r.source || r.ad_source || r["Source"] || "Excel/CSV Import";
      const stage =
        r.stage || r.lifecycle_stage || r.status || r["Lifecycle Stage"] || r["Stage"] || "New";

      try {
        const created = await this.createContact({
          name: String(contactName).trim(),
          phone: String(phone).trim(),
          email: String(email).trim(),
          company_name: String(company).trim(),
          job_title: String(jobTitle).trim(),
          source: String(source).trim(),
          status: String(stage).trim() as any,
          lifecycle_stage: String(stage).trim() as any
        });
        createdList.push(created);
      } catch (e) {
        console.error("Bulk contact item insert error:", e);
      }
    }

    return {
      total_ingested: createdList.length,
      records: createdList
    };
  },

  async deleteContact(id: number | string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/contacts/${id}`, { method: "DELETE" });
      if (res.ok) return true;
    } catch {}

    const contacts = getStorage<Contact[]>("zigmaa_contacts", INITIAL_CONTACTS);
    const filtered = contacts.filter(c => String(c.id) !== String(id));
    setStorage("zigmaa_contacts", filtered);
    return true;
  },

  // ===== CUSTOM FIELDS ENGINE =====
  async getCustomFields(entityType: "LEAD" | "CONTACT" | "DEAL"): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE}/custom-fields?entity_type=${entityType}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setStorage(`zigmaa_cf_${entityType.toLowerCase()}`, data);
        return data;
      }
    } catch (e) {
      console.warn("Failed to fetch custom fields from API, falling back to local cache", e);
    }
    return getStorage<any[]>(`zigmaa_cf_${entityType.toLowerCase()}`, []);
  },

  async createCustomField(field: {
    entity_type: "LEAD" | "CONTACT" | "DEAL";
    label: string;
    field_key: string;
    field_type: "TEXT" | "NUMBER" | "SELECT" | "DATE" | "BOOLEAN";
    options?: string[];
    is_required?: boolean;
  }): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/custom-fields`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(field)
      });
      if (res.ok) {
        const created = await res.json();
        const list = getStorage<any[]>(`zigmaa_cf_${field.entity_type.toLowerCase()}`, []);
        const filtered = list.filter(f => f.id !== created.id && f.field_key !== created.field_key);
        filtered.push(created);
        setStorage(`zigmaa_cf_${field.entity_type.toLowerCase()}`, filtered);
        return created;
      } else {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || `Request failed with status ${res.status}`);
      }
    } catch (err: any) {
      console.error("createCustomField error:", err);
      throw err;
    }
  },

  async deleteCustomField(fieldId: string, entityType: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/custom-fields/${fieldId}`, { method: "DELETE" });
      if (res.ok) {
        const list = getStorage<any[]>(`zigmaa_cf_${entityType.toLowerCase()}`, []);
        const filtered = list.filter(f => f.id !== fieldId);
        setStorage(`zigmaa_cf_${entityType.toLowerCase()}`, filtered);
        return true;
      } else {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || `Delete failed with status ${res.status}`);
      }
    } catch (err: any) {
      console.error("deleteCustomField error:", err);
      // Fallback local delete if network or server error
      const list = getStorage<any[]>(`zigmaa_cf_${entityType.toLowerCase()}`, []);
      const filtered = list.filter(f => f.id !== fieldId);
      setStorage(`zigmaa_cf_${entityType.toLowerCase()}`, filtered);
      return true;
    }
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
    const raw = getStorage<Task[]>("zigmaa_tasks", INITIAL_TASKS);
    if (!Array.isArray(raw)) return [];
    const seen = new Set<string>();
    const deduplicated: Task[] = [];
    for (const t of raw) {
      const key = String(t.id);
      if (!seen.has(key)) {
        seen.add(key);
        deduplicated.push(t);
      }
    }
    if (deduplicated.length !== raw.length) {
      setStorage("zigmaa_tasks", deduplicated);
    }
    return deduplicated;
  },

  async createTask(taskData: Partial<Task>): Promise<Task> {
    const tasks = await this.getTasks();
    const newTask: Task = {
      id: `${Date.now()}-${Math.floor(Math.random() * 10000)}`,
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

  // ===== WORKFLOW AUTOMATIONS ENGINE =====
  async getWorkflows(module?: string): Promise<any[]> {
    try {
      const url = module ? `${API_BASE}/automations?module=${module}` : `${API_BASE}/automations`;
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setStorage("zigmaa_workflows", data);
        return data;
      }
    } catch (e) {
      console.warn("Falling back to cached workflows", e);
    }
    return getStorage<any[]>("zigmaa_workflows", []);
  },

  async createWorkflow(wf: {
    name: string;
    module: "CONTACT" | "DEAL";
    trigger_event: string;
    conditions?: Record<string, any>;
    actions?: any[];
    is_active?: boolean;
  }): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/automations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(wf)
      });
      if (res.ok) {
        const created = await res.json();
        const list = getStorage<any[]>("zigmaa_workflows", []);
        list.unshift(created);
        setStorage("zigmaa_workflows", list);
        return created;
      } else {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || "Failed to create workflow");
      }
    } catch (err: any) {
      console.error(err);
      throw err;
    }
  },

  async toggleWorkflow(id: string): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/automations/${id}/toggle`, {
        method: "PATCH"
      });
      if (res.ok) return await res.json();
    } catch {}

    const list = getStorage<any[]>("zigmaa_workflows", []);
    const updated = list.map(w => w.id === id ? { ...w, is_active: !w.is_active } : w);
    setStorage("zigmaa_workflows", updated);
    return { id, is_active: !list.find(w => w.id === id)?.is_active };
  },

  async deleteWorkflow(id: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/automations/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        const list = getStorage<any[]>("zigmaa_workflows", []);
        const filtered = list.filter(w => w.id !== id);
        setStorage("zigmaa_workflows", filtered);
        return true;
      }
    } catch {}

    const list = getStorage<any[]>("zigmaa_workflows", []);
    const filtered = list.filter(w => w.id !== id);
    setStorage("zigmaa_workflows", filtered);
    return true;
  },

  async getWorkflowHistory(): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE}/automations/history`, { cache: "no-store" });
      if (res.ok) {
        return await res.json();
      }
    } catch {}
    return [];
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
  },

  // ===== AI COPILOT / ASSISTANT =====
  async askCopilot(question: string, history: Array<{ role: string; content: string }> = []): Promise<{ answer: string; model_used?: string; status?: string; error?: string }> {
    try {
      const res = await fetch(`${API_BASE}/ai/copilot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, history })
      });
      if (!res.ok) {
        let errDetail = "Failed to communicate with AI Copilot";
        try {
          const errJson = await res.json();
          errDetail = errJson.detail || errDetail;
        } catch {}
        return {
          answer: "",
          status: "error",
          error: errDetail
        };
      }
      return await res.json();
    } catch (err: any) {
      console.error("AI Copilot request error:", err);
      return {
        answer: "",
        status: "error",
        error: "Backend server unreachable. Please make sure FastAPI backend is running on port 8000."
      };
    }
  }
};

export default zigmaaApi;
export { formatGoogleCalendarUrl, downloadIcsFile };
