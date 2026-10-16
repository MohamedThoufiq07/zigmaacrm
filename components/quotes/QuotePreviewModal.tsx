"use client";

import { useEffect, useRef } from "react";
import {
  X,
  Printer,
  Download,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  CreditCard,
  Share2
} from "lucide-react";
import { Invoice } from "@/lib/mockData";
import { formatCurrency, formatDate } from "@/lib/utils";

interface QuotePreviewModalProps {
  invoice: Invoice | null;
  isOpen: boolean;
  onClose: () => void;
}

// Convert INR amount to Words in TypeScript
function getAmountInWords(amount: number): string {
  const units = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
  const teens = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function convertTwoDigit(n: number): string {
    if (n === 0) return "";
    if (n < 10) return units[n];
    if (n < 20) return teens[n - 10];
    const rem = n % 10;
    return tens[Math.floor(n / 10)] + (rem > 0 ? " " + units[rem] : "");
  }

  let num = Math.round(amount);
  if (num === 0) return "Rupees Zero Only";

  const crore = Math.floor(num / 10000000);
  num %= 10000000;
  const lakh = Math.floor(num / 100000);
  num %= 100000;
  const thousand = Math.floor(num / 1000);
  num %= 1000;
  const hundred = Math.floor(num / 100);
  const rem = num % 100;

  const parts: string[] = [];
  if (crore > 0) parts.push(convertTwoDigit(crore) + " Crore");
  if (lakh > 0) parts.push(convertTwoDigit(lakh) + " Lakh");
  if (thousand > 0) parts.push(convertTwoDigit(thousand) + " Thousand");
  if (hundred > 0) parts.push(units[hundred] + " Hundred");
  if (rem > 0) parts.push(convertTwoDigit(rem));

  return "Rupees " + parts.join(" ") + " Only";
}

export default function QuotePreviewModal({
  invoice,
  isOpen,
  onClose
}: QuotePreviewModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !invoice) return null;

  const docNumber = invoice.invoice_number || invoice.bill_number || `DOC-${invoice.id}`;
  const isInvoice = (invoice.type || "").toUpperCase() === "INVOICE";
  const docTitle = isInvoice ? "TAX INVOICE" : "OFFICIAL QUOTATION";
  const items = invoice.items || [];
  const subtotal = invoice.subtotal || items.reduce((s, it) => s + (it.qty * it.unit_price), 0);
  const taxAmount = invoice.tax_amount || items.reduce((s, it) => s + (it.qty * it.unit_price * ((it.tax_rate || 18) / 100)), 0);
  const discount = invoice.discount || 0;
  const totalAmount = invoice.total_amount || (subtotal + taxAmount - discount);
  const words = getAmountInWords(totalAmount);

  const handlePrint = () => {
    window.print();
  };

  const handleOpenPdfServer = () => {
    window.open(`http://localhost:8000/api/v1/invoices/${invoice.id}/pdf`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 print:p-0 print:bg-white animate-in fade-in duration-150">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:border-none print:rounded-none">
        
        {/* Modal Top Control Bar (Hidden on print) */}
        <div className="px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-2.5">
            <span className="font-bold text-sm tracking-tight">{docNumber}</span>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white/20 text-white">
              {docTitle}
            </span>
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
              invoice.status === "PAID"
                ? "bg-emerald-500/20 text-emerald-300"
                : "bg-blue-500/20 text-blue-300"
            }`}>
              {invoice.status || "DRAFT"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenPdfServer}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Open full page PDF preview"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div
          ref={printRef}
          className="flex-1 overflow-y-auto p-8 sm:p-10 space-y-6 text-slate-800 bg-white custom-scrollbar print:overflow-visible print:p-0"
        >
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-red-600 tracking-tight">ZIGMAA</span>
                <span className="text-xs font-bold uppercase tracking-widest px-2.5 py-0.5 rounded bg-slate-900 text-white">
                  {docTitle}
                </span>
              </div>
              <p className="text-xs font-bold text-slate-700 mt-1.5">
                Zigmaa CRM Technologies Pvt. Ltd.
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Enterprise Cloud Infrastructure & Omnichannel Software
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                GSTIN: 33AAECZ9920K1ZX | support@zigmaa.com
              </p>
            </div>

            <div className="text-left sm:text-right space-y-1">
              <span className="text-lg font-black text-slate-900 block font-mono">
                {docNumber}
              </span>
              <p className="text-xs text-slate-600">
                <span className="font-semibold text-slate-400">Date: </span>
                {invoice.issue_date || (invoice.created_at ? formatDate(invoice.created_at) : new Date().toLocaleDateString())}
              </p>
              {invoice.due_date && (
                <p className="text-xs text-slate-600">
                  <span className="font-semibold text-slate-400">Valid Until: </span>
                  {invoice.due_date}
                </p>
              )}
              <div className="pt-1">
                <span className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-bold uppercase ${
                  invoice.status === "PAID"
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                    : "bg-slate-100 text-slate-700 border border-slate-200"
                }`}>
                  {invoice.status || "DRAFT"}
                </span>
              </div>
            </div>
          </div>

          {/* Billed To & Billed By Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                BILLED TO
              </span>
              <p className="text-sm font-bold text-slate-900">
                {invoice.client_name || invoice.patient_name || "Valued Client"}
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

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                ISSUED BY
              </span>
              <p className="text-sm font-bold text-slate-900">
                Zigmaa CRM Sales Operations
              </p>
              <p className="text-xs text-slate-600">
                Chennai Tech Park, Guindy, Chennai, TN 600032
              </p>
              <p className="text-xs text-slate-500">
                Contact: sales@zigmaa.com | +91 91760 00000
              </p>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/80 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <th className="py-2.5 px-3 text-center w-10">#</th>
                  <th className="py-2.5 px-4">Item Description</th>
                  <th className="py-2.5 px-3 text-center w-16">Qty</th>
                  <th className="py-2.5 px-4 text-right w-28">Unit Price</th>
                  <th className="py-2.5 px-3 text-center w-16">Tax %</th>
                  <th className="py-2.5 px-4 text-right w-28">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((it, idx) => {
                  const lineAmt = it.amount || (it.qty * it.unit_price);
                  return (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-3 px-3 text-center text-slate-400 font-medium">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {it.description || it.name}
                      </td>
                      <td className="py-3 px-3 text-center text-slate-700">
                        {it.qty}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-700">
                        {formatCurrency(it.unit_price)}
                      </td>
                      <td className="py-3 px-3 text-center text-slate-500 font-medium">
                        {it.tax_rate !== undefined ? `${it.tax_rate}%` : "18%"}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        {formatCurrency(lineAmt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Totals & Words Row */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-start pt-2">
            <div className="sm:col-span-7 space-y-3">
              {/* Amount in words */}
              <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 text-xs">
                <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block mb-0.5">
                  Amount In Words
                </span>
                <span className="font-bold text-purple-950 block leading-snug">
                  {words}
                </span>
              </div>

              {/* Payment Details */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1">
                <span className="font-bold text-slate-800 block text-xs">
                  Bank / UPI Payment Instructions:
                </span>
                <p>Bank: HDFC Bank Ltd | A/C: 50200084729104 | IFSC: HDFC0001244</p>
                <p>UPI ID: zigmaa@hdfcbank (Instant settlement)</p>
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
                <span className="text-xl font-black text-red-600">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* Terms & Conditions */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
            <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wider">
              Terms & Conditions
            </span>
            <p className="text-[11px] leading-relaxed">
              {invoice.notes || "Payment terms: 50% advance, balance upon project milestone delivery. Bank Transfer / UPI accepted."}
            </p>
          </div>

          {/* Computer generated disclaimer */}
          <div className="pt-4 text-center text-[10px] text-slate-400">
            This is a computer-generated quote/invoice by Zigmaa CRM Solutions. No physical signature is required.
          </div>
        </div>

      </div>
    </div>
  );
}
