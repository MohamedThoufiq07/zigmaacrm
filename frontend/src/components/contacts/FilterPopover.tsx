"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  SlidersHorizontal,
  X,
  RotateCcw,
  Check,
  Calendar,
  User,
  Tag,
  Briefcase,
  ChevronDown,
  Layers
} from "lucide-react";

export interface ContactFiltersState {
  stages: string[];
  sources: string[];
  owner: string;
  dateRange: "All Time" | "Today" | "Last 7 Days" | "This Month";
  hasActiveDeals: boolean;
}

export const DEFAULT_CONTACT_FILTERS: ContactFiltersState = {
  stages: [],
  sources: [],
  owner: "ALL",
  dateRange: "All Time",
  hasActiveDeals: false,
};

interface FilterPopoverProps {
  filters: ContactFiltersState;
  onApply: (newFilters: ContactFiltersState) => void;
  onReset: () => void;
  availableOwners?: string[];
  activeCount: number;
}

const STAGE_OPTIONS = ["New", "Contacted", "Interested", "Qualified", "Customer"];
const SOURCE_OPTIONS = ["Meta Ads", "Google Ads", "Website Form", "Manual"];
const DATE_RANGES: Array<ContactFiltersState["dateRange"]> = [
  "All Time",
  "Today",
  "Last 7 Days",
  "This Month"
];

export default function FilterPopover({
  filters,
  onApply,
  onReset,
  availableOwners = [],
  activeCount,
}: FilterPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState<ContactFiltersState>(filters);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync draft when opened or external filters change
  useEffect(() => {
    setDraft(filters);
  }, [filters, isOpen]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Toggle stage selection
  const toggleStage = (stage: string) => {
    setDraft((prev) => {
      const exists = prev.stages.includes(stage);
      return {
        ...prev,
        stages: exists
          ? prev.stages.filter((s) => s !== stage)
          : [...prev.stages, stage],
      };
    });
  };

  // Toggle source selection
  const toggleSource = (source: string) => {
    setDraft((prev) => {
      const exists = prev.sources.includes(source);
      return {
        ...prev,
        sources: exists
          ? prev.sources.filter((s) => s !== source)
          : [...prev.sources, source],
      };
    });
  };

  const handleApply = () => {
    onApply(draft);
    setIsOpen(false);
  };

  const handleResetInternal = () => {
    setDraft(DEFAULT_CONTACT_FILTERS);
    onReset();
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      {/* Filter Trigger Button */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`h-9.5 px-4 flex items-center gap-2 rounded-xl text-sm font-semibold border transition-all cursor-pointer select-none shadow-2xs ${
            isOpen || activeCount > 0
              ? "bg-red-50 text-red-600 border-red-200 shadow-xs ring-2 ring-red-100/50"
              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:text-slate-900"
          }`}
          title="Filter contacts by stage, source, owner, dates, and active deals"
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>Filters</span>

          {activeCount > 0 && (
            <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-red-600 text-white">
              {activeCount}
            </span>
          )}
        </button>

        {activeCount > 0 && (
          <button
            type="button"
            onClick={onReset}
            className="text-[11px] font-semibold text-slate-500 hover:text-red-600 underline underline-offset-2 transition-colors cursor-pointer px-1"
            title="Clear all active filters"
          >
            Clear
          </button>
        )}
      </div>

      {/* Popover Flyout Card */}
      {isOpen && (
        <div className="absolute right-0 sm:left-0 sm:right-auto mt-2 w-[340px] sm:w-[380px] bg-white rounded-2xl shadow-[0_18px_45px_rgba(0,0,0,0.12)] border border-slate-200/90 z-40 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-3.5 h-3.5 text-red-600" />
              <h4 className="text-xs font-bold text-slate-900">Filter Contacts</h4>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-4 space-y-4 max-h-[460px] overflow-y-auto custom-scrollbar text-xs">
            {/* 1. Lifecycle Stage Multi-Select */}
            <div>
              <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                <Layers className="w-3 h-3 text-slate-400" />
                <span>Lifecycle Stage</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {STAGE_OPTIONS.map((stg) => {
                  const selected = draft.stages.includes(stg);
                  return (
                    <button
                      key={stg}
                      type="button"
                      onClick={() => toggleStage(stg)}
                      className={`px-2.5 py-1 rounded-lg font-medium text-xs border transition-all cursor-pointer flex items-center gap-1 select-none ${
                        selected
                          ? "bg-red-600 text-white border-red-600 shadow-2xs font-semibold"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                      }`}
                    >
                      {selected && <Check className="w-3 h-3" />}
                      <span>{stg}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Lead Source Multi-Select */}
            <div>
              <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                <Tag className="w-3 h-3 text-slate-400" />
                <span>Lead Source</span>
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {SOURCE_OPTIONS.map((src) => {
                  const selected = draft.sources.includes(src);
                  return (
                    <button
                      key={src}
                      type="button"
                      onClick={() => toggleSource(src)}
                      className={`px-2.5 py-1.5 rounded-lg font-medium text-xs border transition-all cursor-pointer flex items-center justify-between select-none text-left ${
                        selected
                          ? "bg-red-50 text-red-700 border-red-300 font-semibold"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <span>{src}</span>
                      <div
                        className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${
                          selected
                            ? "bg-red-600 border-red-600 text-white"
                            : "border-slate-300 bg-white"
                        }`}
                      >
                        {selected && <Check className="w-2.5 h-2.5" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Lead Owner / Assigned Agent */}
            <div>
              <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                <User className="w-3 h-3 text-slate-400" />
                <span>Assigned Owner</span>
              </label>
              <div className="relative">
                <select
                  value={draft.owner}
                  onChange={(e) => setDraft((prev) => ({ ...prev, owner: e.target.value }))}
                  className="w-full bg-slate-50 text-slate-900 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white appearance-none cursor-pointer pr-8"
                >
                  <option value="ALL">All Owners</option>
                  {availableOwners.map((owner) => (
                    <option key={owner} value={owner}>
                      {owner}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* 4. Date Created Ranges */}
            <div>
              <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                <Calendar className="w-3 h-3 text-slate-400" />
                <span>Date Created</span>
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {DATE_RANGES.map((range) => {
                  const selected = draft.dateRange === range;
                  return (
                    <button
                      key={range}
                      type="button"
                      onClick={() => setDraft((prev) => ({ ...prev, dateRange: range }))}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border text-center transition-all cursor-pointer ${
                        selected
                          ? "bg-slate-900 text-white border-slate-900 font-semibold shadow-2xs"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {range}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 5. Has Active Deals Toggle */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                <div>
                  <span className="font-semibold text-slate-800 block text-xs">
                    Has Active Deals
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    Only show contacts with attached deals
                  </span>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={draft.hasActiveDeals}
                onClick={() =>
                  setDraft((prev) => ({ ...prev, hasActiveDeals: !prev.hasActiveDeals }))
                }
                className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                  draft.hasActiveDeals ? "bg-red-600" : "bg-slate-200"
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    draft.hasActiveDeals ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-4 py-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={handleResetInternal}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3 text-slate-400" />
              <span>Reset</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
