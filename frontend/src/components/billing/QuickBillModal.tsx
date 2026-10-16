"use client";

import { useState } from "react";
import { X, Receipt, Plus, Trash2, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api";
import ThermalReceiptModal from "@/components/billing/ThermalReceiptModal";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onBillCreated?: () => void;
}

export default function QuickBillModal({ isOpen, onClose, onBillCreated }: Props) {
  const [patientName, setPatientName] = useState("");
  const [phone, setPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"Cash" | "UPI">("UPI");
  const [items, setItems] = useState<Array<{ name: string; qty: number; unit_price: number }>>([
    { name: "Zigmaa CRM Enterprise Annual License", qty: 1, unit_price: 450000 }
  ]);
  const [createdInvoice, setCreatedInvoice] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  function handleAddItem() {
    setItems([...items, { name: "Omnichannel WhatsApp Module Integration", qty: 1, unit_price: 50000 }]);
  }

  function handleRemoveItem(idx: number) {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== idx));
  }

  function handleItemChange(idx: number, field: string, value: any) {
    const next = [...items];
    (next[idx] as any)[field] = value;
    setItems(next);
  }

  const grandTotal = items.reduce((sum, item) => sum + (item.qty * item.unit_price), 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!patientName || !phone) {
      setError("Please fill in Client Name and Phone Number.");
      return;
    }
    setSubmitting(true);
    setError("");

    try {
      const formattedItems = items.map(item => ({
        name: item.name,
        qty: Number(item.qty),
        unit_price: Number(item.unit_price),
        total: Number(item.qty) * Number(item.unit_price)
      }));

      const invoice = await api.createInvoice({
        patient_name: patientName,
        phone,
        items: formattedItems,
        total_amount: grandTotal,
        payment_method: paymentMethod
      });

      setCreatedInvoice(invoice);
      if (onBillCreated) onBillCreated();
    } catch (err: any) {
      setError(err.message || "Failed to create invoice.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in text-slate-800">
        <div className="relative w-full max-w-xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Create Sales Invoice / Receipt</h3>
                <p className="text-xs text-slate-500">Generate B2B / B2C receipt & trigger WhatsApp notification</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Client Name / Company *</label>
                <input
                  type="text"
                  required
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="e.g. TechCorp India"
                  className="w-full bg-slate-50 text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Contact Phone Number *</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full bg-slate-50 text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                />
              </div>
            </div>

            {/* Item Rows */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Invoice Items</label>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Product / Service
                </button>
              </div>

              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => handleItemChange(idx, "name", e.target.value)}
                      placeholder="Product / Service Name"
                      className="flex-1 bg-white text-slate-900 text-xs px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none font-semibold"
                    />
                    <input
                      type="number"
                      min="1"
                      value={item.qty}
                      onChange={(e) => handleItemChange(idx, "qty", Number(e.target.value))}
                      className="w-16 bg-white text-slate-900 text-xs px-2 py-1.5 rounded-lg border border-slate-200 text-center font-bold"
                    />
                    <input
                      type="number"
                      value={item.unit_price}
                      onChange={(e) => handleItemChange(idx, "unit_price", Number(e.target.value))}
                      className="w-28 bg-white text-slate-900 text-xs px-2 py-1.5 rounded-lg border border-slate-200 text-right font-bold"
                    />
                    <div className="w-24 text-right text-xs font-black text-emerald-600">
                      ₹{(item.qty * item.unit_price).toLocaleString("en-IN")}
                    </div>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="p-1 text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Payment & Total */}
            <div className="pt-3 flex items-center justify-between border-t border-slate-200">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">Payment:</span>
                <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("UPI")}
                    className={`px-3 py-1 text-xs rounded-lg font-bold transition-colors ${
                      paymentMethod === "UPI" ? "bg-emerald-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    UPI / Online
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("Cash")}
                    className={`px-3 py-1 text-xs rounded-lg font-bold transition-colors ${
                      paymentMethod === "Cash" ? "bg-emerald-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Cash / Bank
                  </button>
                </div>
              </div>

              <div className="text-right">
                <div className="text-[10px] text-slate-500 font-bold uppercase">Grand Total</div>
                <div className="text-xl font-black text-emerald-600">₹{grandTotal.toLocaleString("en-IN")}</div>
              </div>
            </div>

            <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{submitting ? "Processing..." : "Generate Receipt"}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {createdInvoice && (
        <ThermalReceiptModal
          invoice={createdInvoice}
          onClose={() => {
            setCreatedInvoice(null);
            onClose();
          }}
        />
      )}
    </>
  );
}
