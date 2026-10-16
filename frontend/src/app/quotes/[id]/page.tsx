"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  Printer,
  Download,
  ArrowLeft,
  FileText,
  Share2,
  Mail,
  Loader2
} from "lucide-react";
import { api } from "@/lib/api";
import { Invoice, OrganizationSettings } from "@/lib/mockData";
import QuotationViewer from "@/components/quotes/QuotationViewer";

export default function QuoteDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [org, setOrg] = useState<OrganizationSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (resolvedParams?.id) {
      Promise.all([
        api.getInvoice(resolvedParams.id),
        api.getOrganizationSettings()
      ])
        .then(([data, orgData]) => {
          setInvoice(data);
          setOrg(orgData);
        })
        .catch((err) => {
          console.error("Failed to load invoice:", err);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [resolvedParams?.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 space-y-3">
        <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
        <p className="text-xs font-bold text-slate-500">Loading document...</p>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
          <FileText className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Document Not Found</h2>
        <p className="text-xs text-slate-500">The requested quotation or invoice could not be located.</p>
        <Link
          href="/quotes"
          className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-red-700 transition-colors"
        >
          Back to Quotes
        </Link>
      </div>
    );
  }

  const docNumber = invoice.invoice_number || invoice.bill_number || `DOC-${invoice.id}`;
  const sellerName = org?.company_name || "Arsath Thoufiq's Workspace";
  const signatoryName = org?.signatory_name || "Arsath Thoufiq";
  const clientName = invoice.client_name || "Valued Client";
  const totalAmount = invoice.total_amount || 0;
  const formattedTotal = `₹${totalAmount.toLocaleString("en-IN")}`;

  const handleShareWhatsApp = () => {
    const rawPhone = (invoice.client_phone || invoice.phone || "").replace(/\D/g, "");
    const targetPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;
    const msg = `Hello ${clientName},\n\nHere is your official Quotation ${docNumber} for ${formattedTotal} from ${sellerName}.\n\nPlease let us know your approval.\n\nBest regards,\n${signatoryName}\n${sellerName}`;
    const waUrl = `https://wa.me/${targetPhone}?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
  };

  const handleSendEmail = () => {
    const targetEmail = invoice.client_email || invoice.email || "";
    const subject = `Quotation ${docNumber} for ${clientName} - ${sellerName}`;
    const body = `Dear ${clientName},\n\nPlease find details for your commercial quotation ${docNumber} amounting to ${formattedTotal}.\n\nPayment terms: ${invoice.notes || "50% advance, balance upon milestone delivery"}\n\nBank Transfer & UPI details are included in the quotation.\n\nBest regards,\n${signatoryName}\n${sellerName}`;
    window.location.href = `mailto:${targetEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 sm:p-8 print:p-0 print:bg-white text-slate-800">
      {/* Top Action Bar (hidden when printing) */}
      <div className="max-w-3xl mx-auto mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href="/quotes"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:border-red-500 hover:text-red-600 text-xs font-semibold shadow-xs transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Quotes</span>
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          {/* Share to WhatsApp */}
          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            title="Share quotation via WhatsApp"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>WhatsApp</span>
          </button>

          {/* Send via Email */}
          <button
            type="button"
            onClick={handleSendEmail}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            title="Draft email to client"
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Email</span>
          </button>

          {/* Download PDF */}
          <button
            type="button"
            onClick={() => window.open(`http://localhost:8000/api/v1/invoices/${invoice.id}/pdf`, "_blank")}
            className="px-3.5 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Download PDF</span>
          </button>

          {/* Print Document */}
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Document</span>
          </button>
        </div>
      </div>

      {/* Branded A4 Sheet View */}
      <div className="max-w-3xl mx-auto">
        <QuotationViewer invoice={invoice} orgSettings={org} />
      </div>
    </div>
  );
}
