"use client";

import { useState, useEffect } from "react";
import { Stethoscope, Plus, CheckCircle2, Clock, UserCheck, MessageSquare, Send, Sparkles } from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import TokenGeneratorModal from "@/components/clinic/TokenGeneratorModal";
import { api } from "@/lib/api";
import { OPDToken } from "@/lib/mockData";

export default function OPDQueuePage() {
  const [tokens, setTokens] = useState<OPDToken[]>([]);
  const [selectedToken, setSelectedToken] = useState<OPDToken | null>(null);
  const [showAddToken, setShowAddToken] = useState(false);

  // Doctor Desk Vitals Form
  const [bp, setBp] = useState("120/80");
  const [pulse, setPulse] = useState("72");
  const [temp, setTemp] = useState("98.4");
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [reviewDate, setReviewDate] = useState("2026-10-24");
  const [sendWhatsapp, setSendWhatsapp] = useState(true);
  const [savingConsult, setSavingConsult] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    async function loadQueue() {
      const data = await api.getTodayTokens();
      setTokens(data);
    }
    loadQueue();
  }, []);

  async function handleStatusChange(tokenId: number, newStatus: "Waiting" | "With Doctor" | "Completed") {
    const updated = await api.updateTokenStatus(tokenId, newStatus);
    setTokens(prev => prev.map(t => t.id === tokenId ? updated : t));
    if (selectedToken && selectedToken.id === tokenId) {
      setSelectedToken(updated);
    }
  }

  async function handleSaveConsultation(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedToken) return;
    setSavingConsult(true);
    setSavedSuccess(false);

    try {
      const updated = await api.saveConsultation(selectedToken.id, {
        bp,
        pulse,
        temp,
        clinical_notes: clinicalNotes,
        review_date: reviewDate,
        send_whatsapp: sendWhatsapp
      });

      setTokens(prev => prev.map(t => t.id === selectedToken.id ? updated : t));
      setSelectedToken(updated);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error("Save failed", err);
    } finally {
      setSavingConsult(false);
    }
  }

  const waitingTokens = tokens.filter(t => t.status === "Waiting");
  const engagedToken = tokens.find(t => t.status === "With Doctor");
  const completedTokens = tokens.filter(t => t.status === "Completed");

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />

        <main className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-gradient-to-b from-slate-900 to-slate-950">
          {/* Top Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-900 border border-amber-500/20 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Stethoscope className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
                  Clinic OPD Live Token Queue & Doctor Desk
                </h1>
                <p className="text-xs text-slate-400">Sequential token management, vitals recording, and WhatsApp prescriptions</p>
              </div>
            </div>

            <button
              onClick={() => setShowAddToken(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-amber-600/30 transition-all hover:scale-[1.02] shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Issue OPD Token</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Live Queue Lists */}
            <div className="space-y-4">
              {/* Active Token Card */}
              <div className="p-5 rounded-2xl bg-slate-900/90 border border-amber-500/40 shadow-xl space-y-3">
                <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
                  <span className="font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4" /> Currently With Doctor
                  </span>
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[10px]">
                    Consultation Room #1
                  </span>
                </div>

                {engagedToken ? (
                  <div
                    onClick={() => {
                      setSelectedToken(engagedToken);
                      setBp(engagedToken.bp || "120/80");
                      setPulse(engagedToken.pulse || "72");
                      setTemp(engagedToken.temp || "98.4");
                      setClinicalNotes(engagedToken.clinical_notes || "");
                    }}
                    className="p-4 rounded-xl bg-slate-950 border border-amber-500/30 cursor-pointer hover:border-amber-400 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-black text-amber-400">Token #{engagedToken.token_number}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStatusChange(engagedToken.id, "Completed");
                        }}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold rounded-lg"
                      >
                        Mark Completed
                      </button>
                    </div>
                    <div className="text-sm font-bold text-slate-100 mt-2">{engagedToken.patient_name}</div>
                    <div className="text-xs text-slate-400">{engagedToken.phone}</div>
                  </div>
                ) : (
                  <div className="p-4 text-center text-xs text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800">
                    No patient currently with doctor. Call next patient from queue below.
                  </div>
                )}
              </div>

              {/* Waiting Queue List */}
              <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-3">
                <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
                  <span className="font-bold text-slate-200 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-400" /> Waiting Lounge Queue ({waitingTokens.length})
                  </span>
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar">
                  {waitingTokens.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500">No waiting patients in queue.</div>
                  ) : (
                    waitingTokens.map(token => (
                      <div
                        key={token.id}
                        onClick={() => {
                          setSelectedToken(token);
                          setBp(token.bp || "120/80");
                          setPulse(token.pulse || "72");
                          setTemp(token.temp || "98.4");
                          setClinicalNotes(token.clinical_notes || "");
                        }}
                        className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-amber-500/40 cursor-pointer transition-colors flex items-center justify-between"
                      >
                        <div>
                          <div className="text-xs font-bold text-amber-400">Token #{token.token_number} - {token.patient_name}</div>
                          <div className="text-[11px] text-slate-400">{token.phone}</div>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStatusChange(token.id, "With Doctor");
                          }}
                          className="px-2.5 py-1 bg-amber-600/20 text-amber-300 border border-amber-500/30 hover:bg-amber-600 hover:text-white text-[10px] font-bold rounded-lg transition-colors"
                        >
                          Call Doctor Room
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right 2 Columns: Doctor Consultation Form Drawer */}
            <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
              {selectedToken ? (
                <form onSubmit={handleSaveConsultation} className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold uppercase">
                        Token #{selectedToken.token_number}
                      </span>
                      <h3 className="text-base font-extrabold text-slate-100 mt-1">{selectedToken.patient_name}</h3>
                      <p className="text-xs text-slate-400">{selectedToken.phone}</p>
                    </div>

                    <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-semibold">
                      {selectedToken.status}
                    </span>
                  </div>

                  {savedSuccess && (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Consultation notes saved & WhatsApp summary sent to {selectedToken.phone}!</span>
                    </div>
                  )}

                  {/* Vitals Input Row */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">Patient Vitals</label>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <span className="block text-[10px] text-slate-500 font-medium mb-1">Blood Pressure (BP)</span>
                        <input
                          type="text"
                          value={bp}
                          onChange={(e) => setBp(e.target.value)}
                          placeholder="120/80"
                          className="w-full bg-slate-950 text-slate-100 text-xs px-3 py-2 rounded-xl border border-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-500 font-medium mb-1">Pulse Rate (bpm)</span>
                        <input
                          type="text"
                          value={pulse}
                          onChange={(e) => setPulse(e.target.value)}
                          placeholder="72"
                          className="w-full bg-slate-950 text-slate-100 text-xs px-3 py-2 rounded-xl border border-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-500 font-medium mb-1">Temperature (°F)</span>
                        <input
                          type="text"
                          value={temp}
                          onChange={(e) => setTemp(e.target.value)}
                          placeholder="98.4"
                          className="w-full bg-slate-950 text-slate-100 text-xs px-3 py-2 rounded-xl border border-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Clinical Notes */}
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-400 tracking-wider mb-1">Doctor Clinical Diagnosis & Prescription Notes</label>
                    <textarea
                      rows={4}
                      value={clinicalNotes}
                      onChange={(e) => setClinicalNotes(e.target.value)}
                      placeholder="e.g. Patient reports fatigue and mild fever. Advised B12 supplements, hydration, and rest for 3 days."
                      className="w-full bg-slate-950 text-slate-100 text-xs p-3 rounded-xl border border-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  {/* Review Date & WhatsApp Toggle */}
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1">Next Review Date</label>
                      <input
                        type="date"
                        value={reviewDate}
                        onChange={(e) => setReviewDate(e.target.value)}
                        className="w-full bg-slate-950 text-slate-100 text-xs px-3 py-2 rounded-xl border border-slate-800 focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-5">
                      <input
                        type="checkbox"
                        id="waToggle"
                        checked={sendWhatsapp}
                        onChange={(e) => setSendWhatsapp(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-800 text-amber-500 focus:ring-amber-500"
                      />
                      <label htmlFor="waToggle" className="text-xs font-semibold text-slate-300 cursor-pointer flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Send prescription summary via WhatsApp</span>
                      </label>
                    </div>
                  </div>

                  <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-800">
                    <button
                      type="submit"
                      disabled={savingConsult}
                      className="flex items-center gap-2 px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-extrabold shadow-lg shadow-amber-600/30 transition-all disabled:opacity-50"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>{savingConsult ? "Saving..." : "Save Consultation & Complete Token"}</span>
                    </button>
                  </div>
                </form>
              ) : (
                <div className="p-12 text-center text-slate-500 space-y-2">
                  <Stethoscope className="w-12 h-12 text-slate-700 mx-auto" />
                  <div className="text-sm font-bold text-slate-400">No Patient Selected</div>
                  <p className="text-xs text-slate-500">Click any patient token from the waiting lounge on the left to start consultation</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {showAddToken && <TokenGeneratorModal isOpen={showAddToken} onClose={() => setShowAddToken(false)} />}
    </div>
  );
}
