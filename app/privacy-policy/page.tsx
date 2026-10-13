"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import {
  ShieldCheck,
  ChevronLeft,
  CheckCircle2,
  Lock,
  Mail,
  Phone,
  Building,
  KeyRound,
  FileText,
  Clock,
  Sparkles
} from "lucide-react";

export default function PrivacyPolicyPage() {
  const router = useRouter();

  const usagePoints = [
    "To provide, operate, and maintain our services efficiently and reliably",
    "To personalize your experience and improve the overall usability of our platform",
    "To send important updates such as service notifications, security alerts, and policy changes",
    "To provide customer support, respond to inquiries, and resolve issues effectively",
    "To analyze usage patterns and enhance features, performance, and functionality",
    "To ensure platform security, prevent fraud, and protect user data from unauthorized access"
  ];

  const securityPoints = [
    {
      title: "Encrypted Data Storage",
      desc: "All database stores and backups are encrypted at rest with industry-standard AES-256."
    },
    {
      title: "Secure Communication & Firewalls",
      desc: "Transport Layer Security (TLS 1.3) protects all traffic in transit with strict cloud firewalls."
    },
    {
      title: "Role-Based Access Control (RBAC)",
      desc: "Fine-grained permissions ensure only authorized users access specified leads, contacts, and deals."
    },
    {
      title: "Zero Plaintext Credentials",
      desc: "Passwords, tokens, and sensitive contact numbers are securely hashed using bcrypt and salted."
    }
  ];

  return (
    <div className="flex h-screen bg-[#F8FAFC] text-slate-900 font-sans overflow-hidden select-none">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header title="Privacy Policy" />

        <main className="flex-1 overflow-y-auto p-5 sm:p-7 lg:p-9 space-y-6 custom-scrollbar">
          {/* Back Navigation Button */}
          <div>
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-red-600 transition-colors cursor-pointer group px-3 py-1.5 rounded-lg hover:bg-white border border-transparent hover:border-slate-200"
            >
              <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              <span>Back</span>
            </button>
          </div>

          {/* Main Privacy Policy Card */}
          <div className="w-full max-w-5xl mx-auto bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            {/* Top Header Banner */}
            <div className="p-6 sm:p-8 border-b border-slate-100 bg-gradient-to-r from-red-50/60 via-white to-white flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-600 text-white flex items-center justify-center shadow-sm shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <span>Privacy Policy</span>
                  <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200/80">
                    Zigmaa CRM
                  </span>
                </h1>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Effective Date: October 2026 • Last updated: October 13, 2026
                </p>
              </div>
            </div>

            {/* Document Content */}
            <div className="p-6 sm:p-9 space-y-8 text-slate-700 leading-relaxed text-sm">
              {/* Section 1 */}
              <section className="space-y-2">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-red-50 text-red-600 text-xs font-bold flex items-center justify-center shrink-0">
                    1
                  </span>
                  Data Collection
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 pl-8 leading-relaxed">
                  We collect personal information such as your <strong>Name</strong>, <strong>email address</strong>,{" "}
                  <strong>Mobile Number</strong>, <strong>Organization Details</strong>, and usage data when you interact
                  with our platform. This helps us deliver a better, faster, and more personalized CRM experience.
                </p>
              </section>

              {/* Section 2 */}
              <section className="space-y-3">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-red-50 text-red-600 text-xs font-bold flex items-center justify-center shrink-0">
                    2
                  </span>
                  How We Use Your Data
                </h2>
                <div className="pl-8 space-y-2">
                  {usagePoints.map((point, idx) => (
                    <div key={idx} className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span className="text-xs sm:text-sm text-slate-600 leading-snug">{point}</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Section 3 */}
              <section className="space-y-2">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-red-50 text-red-600 text-xs font-bold flex items-center justify-center shrink-0">
                    3
                  </span>
                  Cookies &amp; Tracking
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 pl-8 leading-relaxed">
                  We use essential cookies and lightweight session storage technologies to maintain secure authentication,
                  store user theme and layout preferences, and enhance CRM dashboard responsiveness. You can control cookie
                  preferences via your browser settings anytime.
                </p>
              </section>

              {/* Section 4 */}
              <section className="space-y-3">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-red-50 text-red-600 text-xs font-bold flex items-center justify-center shrink-0">
                    4
                  </span>
                  Data Security
                </h2>
                <div className="pl-8 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {securityPoints.map((sec, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/60 space-y-1 hover:border-red-200 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Lock className="w-3.5 h-3.5 text-red-600 shrink-0" />
                        <h4 className="text-xs font-bold text-slate-900">{sec.title}</h4>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-normal">{sec.desc}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Section 5 */}
              <section className="space-y-2">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-red-50 text-red-600 text-xs font-bold flex items-center justify-center shrink-0">
                    5
                  </span>
                  Data Sharing &amp; Non-Disclosure
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 pl-8 leading-relaxed">
                  We <strong>never</strong> sell, rent, or monetize your personal information or your clients&apos; lead data.
                  Data may only be processed through trusted cloud infrastructure partners (e.g. secure database hosts) strictly
                  for platform operations under binding confidentiality agreements.
                </p>
              </section>

              {/* Section 6 */}
              <section className="space-y-2">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-red-50 text-red-600 text-xs font-bold flex items-center justify-center shrink-0">
                    6
                  </span>
                  Your Rights
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 pl-8 leading-relaxed">
                  You have the right to access, inspect, export, update, or permanently delete your personal and organizational
                  data. You can trigger exports from the table views or request complete account erasure by contacting support.
                </p>
              </section>

              {/* Section 7 */}
              <section className="space-y-2">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-red-50 text-red-600 text-xs font-bold flex items-center justify-center shrink-0">
                    7
                  </span>
                  Data Retention
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 pl-8 leading-relaxed">
                  We retain your CRM workspace data only as long as your account remains active or as required for verified legal
                  and compliance purposes. Once an account is scheduled for closure, data is safely sanitized and permanently deleted.
                </p>
              </section>

              {/* Section 8 */}
              <section className="space-y-2">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-red-50 text-red-600 text-xs font-bold flex items-center justify-center shrink-0">
                    8
                  </span>
                  Policy Updates
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 pl-8 leading-relaxed">
                  This Privacy Policy may be updated periodically to reflect security advancements and regulatory standards.
                  We encourage users to review this page periodically for any changes.
                </p>
              </section>

              {/* Section 9: Contact Us */}
              <section className="space-y-3 pt-2">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-red-50 text-red-600 text-xs font-bold flex items-center justify-center shrink-0">
                    9
                  </span>
                  Contact Us
                </h2>
                <div className="pl-8">
                  <p className="text-xs sm:text-sm text-slate-600 mb-4">
                    If you have questions, inquiries, or data requests regarding this Privacy Policy, please contact our
                    support and compliance team directly:
                  </p>

                  <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-red-50/30 border border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2.5 text-xs text-slate-800">
                        <Mail className="w-4 h-4 text-red-600 shrink-0" />
                        <span className="font-semibold">Support Email:</span>
                        <a
                          href="mailto:support@zigmaatech.com"
                          className="font-medium text-red-600 hover:underline"
                        >
                          support@zigmaatech.com
                        </a>
                      </div>

                      <div className="flex items-center gap-2.5 text-xs text-slate-800">
                        <Phone className="w-4 h-4 text-red-600 shrink-0" />
                        <span className="font-semibold">Contact Number:</span>
                        <a
                          href="tel:+918870235207"
                          className="font-mono font-medium text-slate-900 hover:text-red-600"
                        >
                          +91 8870235207
                        </a>
                      </div>

                      <div className="flex items-center gap-2.5 text-xs text-slate-800">
                        <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="text-slate-500">Business Hours: Mon–Sat, 9:00 AM – 6:00 PM IST</span>
                      </div>
                    </div>

                    <a
                      href="mailto:support@zigmaatech.com?subject=Privacy%20Policy%20Inquiry%20-%20Zigmaa%20CRM"
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer whitespace-nowrap"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Email Support</span>
                    </a>
                  </div>
                </div>
              </section>

              {/* Security Focus Callout */}
              <div className="mt-8 p-5 sm:p-6 rounded-2xl bg-red-500/5 border border-red-200/60 space-y-3">
                <div className="flex items-center gap-2 text-red-700 font-bold text-sm">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Security Focus Guarantee</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-700">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                    <span>Personal data including email &amp; mobile numbers are securely encrypted.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                    <span>Protected against unauthorized access using secure authentication tokens.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                    <span>Role-based access control ensures only authorized personnel view data.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                    <span>Regular security updates &amp; zero sensitive data in plain text format.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
