"use client";

import { Printer, X, CheckCircle2 } from "lucide-react";
import { Invoice } from "@/lib/mockData";
import { formatDate } from "@/lib/utils";

interface Props {
  invoice: Invoice;
  onClose: () => void;
}

export default function ThermalReceiptModal({ invoice, onClose }: Props) {
  function handlePrint() {
    window.print();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Top Control Bar (Hidden on print) */}
        <div className="no-print p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
            <CheckCircle2 className="w-4 h-4" />
            <span>Bill Confirmed</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-md transition-all"
            >
              <Printer className="w-3.5 h-3.5" /> Print Receipt
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Thermal Slip Content */}
        <div className="p-6 bg-white text-slate-900 font-mono text-xs overflow-y-auto max-h-[75vh] printable-area shadow-inner">
          <div className="text-center space-y-1 pb-4 border-b border-dashed border-slate-300">
            <div className="text-base font-black tracking-tight text-slate-950 uppercase">ZIGMAA / AMUTHAM HEALTHCARE</div>
            <div className="text-[10px] text-slate-600 font-sans font-medium">Multi-Specialty OPD & Pharmacy</div>
            <div className="text-[10px] text-slate-500 font-sans">GSTIN: 33AAAAA0000A1Z5 | Reg: #MCH-4891</div>
            <div className="text-[10px] text-slate-500 font-sans">Chennai, TN • Ph: +91 44 2819 0000</div>
          </div>

          <div className="py-3 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-600">Bill No:</span>
              <span className="font-bold">{invoice.bill_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Date:</span>
              <span>{formatDate(invoice.created_at || new Date().toISOString())}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Patient:</span>
              <span className="font-bold text-slate-900">{invoice.patient_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Phone:</span>
              <span>{invoice.phone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Payment:</span>
              <span className="font-semibold uppercase text-emerald-700">{invoice.payment_method}</span>
            </div>
          </div>

          {/* Line Items */}
          <div className="py-3 border-b border-dashed border-slate-300">
            <div className="grid grid-cols-12 font-bold text-[10px] uppercase text-slate-500 mb-2">
              <div className="col-span-6">Item</div>
              <div className="col-span-2 text-center">Qty</div>
              <div className="col-span-4 text-right">Amt (₹)</div>
            </div>
            <div className="space-y-1.5 text-[11px]">
              {invoice.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 items-start">
                  <div className="col-span-6 font-semibold truncate leading-snug">{item.name}</div>
                  <div className="col-span-2 text-center">{item.qty}</div>
                  <div className="col-span-4 text-right font-semibold">₹{(item.qty * item.unit_price).toLocaleString("en-IN")}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="py-3 space-y-1 text-[11px]">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span>₹{(invoice.total_amount * 0.95).toFixed(0)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>CGST + SGST (5%):</span>
              <span>₹{(invoice.total_amount * 0.05).toFixed(0)}</span>
            </div>
            <div className="flex justify-between font-black text-sm pt-2 border-t border-slate-950 text-slate-950">
              <span>NET TOTAL:</span>
              <span>₹{invoice.total_amount.toLocaleString("en-IN")}</span>
            </div>
          </div>

          <div className="pt-4 text-center border-t border-dashed border-slate-300 space-y-1">
            <p className="text-[10px] text-slate-600 font-sans font-medium">Thank you for visiting Zigmaa Healthcare!</p>
            <p className="text-[9px] text-slate-400 font-sans">WhatsApp summary sent to {invoice.phone}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
