"use client";

import React from "react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import ModulesAndFieldsManager from "@/components/settings/ModulesAndFieldsManager";
import { Sliders } from "lucide-react";
import Link from "next/link";

export default function SettingsModulesPage() {
  return (
    <div className="flex h-screen bg-[#F8FAFC] dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 font-sans overflow-hidden select-none">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />

        <main className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6 custom-scrollbar bg-[#F8FAFC] dark:bg-[#0b0f19]">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-red-50 text-red-600 border border-red-100">
                <Sliders className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Link href="/settings" className="text-xs font-semibold text-slate-400 hover:text-slate-700">
                    Settings
                  </Link>
                  <span className="text-slate-300">/</span>
                  <span className="text-xs font-semibold text-slate-600">Modules & Fields</span>
                </div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight mt-0.5">
                  Modules & Custom Fields Engine
                </h1>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Customize and extend data schemas for Contacts, Deals, and Accounts with dynamic enterprise attributes.
                </p>
              </div>
            </div>
          </div>

          <div className="w-full max-w-5xl mx-auto">
            <ModulesAndFieldsManager />
          </div>
        </main>
      </div>
    </div>
  );
}
