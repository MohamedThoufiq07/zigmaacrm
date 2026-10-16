"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  Printer,
  Download,
  ArrowLeft,
  FileText,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Loader2
} from "lucide-react";
import { api } from "@/lib/api";
import { Invoice } from "@/lib/mockData";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function QuoteDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (resolvedParams?.id) {
      api.getInvoice(resolvedParams.id)
        .then((data) => {
          setInvoice(data);
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
  const isInvoice = (invoice.type || "").toUpperCase() === "INVOICE";
  const docTitle = isInvoice ? "TAX INVOICE" : "OFFICIAL QUOTATION";
  const items = invoice.items || [];
  const subtotal = invoice.subtotal || items.reduce((s, it) => s + (it.qty * it.unit_price), 0);
  const taxAmount = invoice.tax_amount || items.reduce((s, it) => s + (it.qty * it.unit_price * ((it.tax_rate || 18) / 100)), 0);
  const discount = invoice.discount || 0;
  const totalAmount = invoice.total_amount || (subtotal + taxAmount - discount);

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 sm:p-8 print:p-0 print:bg-white text-slate-800">
      {/* Top Action Bar (hidden when printing) */}
      <div className="max-w-4xl mx-auto mb-6 flex items-center justify-between print:hidden">
        <Link
          href="/quotes"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:border-red-500 hover:text-red-600 text-xs font-semibold shadow-xs transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Quotes</span>
        </Link>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => window.open(`http://localhost:8000/api/v1/invoices/${invoice.id}/pdf`, "_blank")}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Download PDF</span>
          </button>

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

      {/* Invoice Document Box */}
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl border border-slate-200 p-8 sm:p-12 space-y-6 print:shadow-none print:border-none print:p-0 print:rounded-none">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-3xl font-black text-red-600 tracking-tight">ZIGMAA</span>
              <span className="text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded bg-slate-900 text-white">
                {docTitle}
              </span>
            </div>
            <p className="text-xs font-bold text-slate-800 mt-2">
              Zigmaa CRM Technologies Pvt. Ltd.
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Enterprise Cloud Infrastructure & Omnichannel Software
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              GSTIN: 33AAECZ9920K1ZX | PAN: AAECZ9920K
            </p>
          </div>

          <div className="text-left sm:text-right space-y-1">
            <span className="text-xl font-black text-slate-900 block font-mono">
              {docNumber}
            </span>
            <p className="text-xs text-slate-600">
              <span className="font-semibold text-slate-400">Date: </span>
              {invoice.issue_date || (invoice.created_at ? formatDate(invoice.created_at) : new Date().toLocaleDateString())}
            </p>
            {invoice.due_date && (
              <p className="text-xs text-slate-600">
                <span className="font-semibold text-slate-400">Due Date: </span>
                {invoice.due_date}
              </p>
            )}
            <div className="pt-1">
              <span className={`inline-block px-3 py-1 rounded-md text-xs font-bold uppercase ${
                invoice.status === "PAID"
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                  : "bg-blue-100 text-blue-800 border border-blue-200"
              }`}>
                {invoice.status || "DRAFT"}
              </span>
            </div>
          </div>
        </div>

        {/* Client & Issuer Information Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              BILLED TO
            </span>
            <p className="text-base font-bold text-slate-900">
              {invoice.client_name || invoice.patient_name}
            </p>
            {invoice.client_company && (
              <p className="text-xs font-semibold text-slate-700">
                {invoice.client_company}
              </p>
            )}
            {invoice.client_email && (
              <p className="text-xs text-slate-500">
                {invoice.client_email}
              </p>
            )}
            {(invoice.client_phone || invoice.phone) && (
              <p className="text-xs text-slate-500">
                {invoice.client_phone || invoice.phone}
              </p>
            )}
          </div>

          <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              ISSUED BY
            </span>
            <p className="text-base font-bold text-slate-900">
              Zigmaa CRM Global Operations
            </p>
            <p className="text-xs text-slate-600">
              Chennai Tech Center, Tamil Nadu, India
            </p>
            <p className="text-xs text-slate-500">
              Billing Support: billing@zigmaa.com
            </p>
          </div>
        </div>

        {/* Deliverables / Line items table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-600 font-bold uppercase text-[11px] tracking-wider border-b border-slate-200">
                <th className="py-3 px-3 text-center w-12">#</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-3 text-center w-16">Qty</th>
                <th className="py-3 px-4 text-right w-32">Unit Price</th>
                <th className="py-3 px-3 text-center w-20">Tax %</th>
                <th className="py-3 px-4 text-right w-32">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((it, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50">
                  <td className="py-3.5 px-3 text-center text-slate-400 font-medium">{idx + 1}</td>
                  <td className="py-3.5 px-4 font-bold text-slate-900">{it.description || it.name}</td>
                  <td className="py-3.5 px-3 text-center text-slate-700">{it.qty}</td>
                  <td className="py-3.5 px-4 text-right font-medium text-slate-700">{formatCurrency(it.unit_price)}</td>
                  <td className="py-3.5 px-3 text-center text-slate-500">{it.tax_rate !== undefined ? `${it.tax_rate}%` : "18%"}</td>
                  <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                    {formatCurrency(it.amount || it.qty * it.unit_price)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Calculation Totals */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-start pt-2">
          <div className="sm:col-span-7 space-y-3">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
              <span className="font-bold text-slate-900 block text-xs">
                Payment & Banking Instructions:
              </span>
              <p>Bank: HDFC Bank Ltd | A/C: 50200084729104</p>
              <p>IFSC: HDFC0001244 | Branch: Chennai Main</p>
              <p>UPI ID: zigmaa@hdfcbank</p>
            </div>
          </div>

          <div className="sm:col-span-5 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-semibold text-slate-900">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>GST / Tax:</span>
              <span className="font-semibold text-slate-900">{formatCurrency(taxAmount)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Discount:</span>
                <span>- {formatCurrency(discount)}</span>
              </div>
            )}
            <div className="pt-2 border-t-2 border-slate-900 flex justify-between items-baseline">
              <span className="text-sm font-black text-slate-900">Grand Total:</span>
              <span className="text-2xl font-black text-red-600">
                {formatCurrency(totalAmount)}
              </span>
            </div>
          </div>
        </div>

        {/* Terms */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
          <strong className="text-slate-800 block mb-1">Commercial Terms:</strong>
          <p>{invoice.notes || "50% advance upon quote approval, balance on delivery."}</p>
        </div>
      </div>
    </div>
  );
}
