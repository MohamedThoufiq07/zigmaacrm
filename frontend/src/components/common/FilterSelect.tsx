"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import {
  ChevronDown,
  X,
  Check,
  Search,
  Tag
} from "lucide-react";
import { SourceIcon } from "@/components/common/SourceBadge";

export interface FilterSelectProps {
  placeholder: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  className?: string;
}

export default function FilterSelect({
  placeholder,
  value,
  options,
  onChange,
  className = "",
}: FilterSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const isSelected = Boolean(value && value !== "ALL" && value !== "All Sources");

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      setSearch("");
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("ALL");
    setIsOpen(false);
  };

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    return options.filter((opt) =>
      opt.toLowerCase().includes(search.toLowerCase())
    );
  }, [options, search]);

  const getSourceIcon = (name: string) => {
    return <SourceIcon source={name} className="w-4.5 h-4.5 shrink-0" />;
  };

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`h-10 px-3.5 flex items-center justify-between gap-2.5 bg-white border rounded-xl text-sm transition-all cursor-pointer shadow-2xs select-none ${
          isOpen
            ? "border-red-500 ring-2 ring-red-100"
            : isSelected
            ? "border-red-200 bg-red-50/30 hover:border-red-300"
            : "border-slate-200 hover:border-slate-300"
        }`}
      >
        <div className="flex items-center gap-2">
          {isSelected ? (
            <>
              {getSourceIcon(value)}
              <span className="font-semibold text-slate-900 text-xs sm:text-sm">{value}</span>
            </>
          ) : (
            <>
              <Tag className="w-4 h-4 text-slate-400" />
              <span className="text-slate-500 font-medium text-xs sm:text-sm">{placeholder}</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5 ml-1 text-slate-400">
          {isSelected && (
            <span
              onClick={handleClear}
              className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer transition-colors"
              title="Clear filter"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${
              isOpen ? "rotate-180 text-red-600" : "text-slate-400"
            }`}
          />
        </div>
      </button>

      {/* Modern Popover Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 sm:left-0 top-full mt-1.5 w-64 bg-white border border-slate-200/90 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
          {/* Header & Quick Search */}
          <div className="px-3 pb-2 pt-1 border-b border-slate-100">
            <div className="flex items-center justify-between mb-1.5 px-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Select {placeholder}
              </span>
              {isSelected && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-[11px] font-semibold text-red-600 hover:text-red-700 cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
            {options.length > 5 && (
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Filter sources..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-red-500 focus:bg-white"
                />
              </div>
            )}
          </div>

          {/* Options List */}
          <div className="max-h-64 overflow-y-auto custom-scrollbar p-1.5 space-y-0.5">
            {filteredOptions.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-400 font-medium">
                No matching sources
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const active = value === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      onChange(opt);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-between ${
                      active
                        ? "bg-red-50 text-red-600 font-bold"
                        : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      {getSourceIcon(opt)}
                      <span className="truncate">{opt}</span>
                    </div>
                    {active && <Check className="w-4 h-4 text-red-600 shrink-0 ml-2" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
