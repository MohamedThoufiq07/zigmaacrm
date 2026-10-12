"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, X } from "lucide-react";

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
  const containerRef = useRef<HTMLDivElement>(null);

  const isSelected = Boolean(value && value !== "ALL");

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

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("ALL");
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`h-10 px-4 flex items-center justify-between gap-2.5 bg-white border rounded-xl text-sm transition-all cursor-pointer shadow-2xs select-none ${
          isOpen
            ? "border-red-500 ring-2 ring-red-100"
            : "border-slate-200 hover:border-red-300"
        }`}
      >
        <span
          className={
            isSelected
              ? "font-semibold text-slate-800"
              : "italic text-slate-500 font-medium"
          }
        >
          {isSelected ? value : placeholder}
        </span>

        <div className="flex items-center gap-1.5 ml-1 text-slate-400">
          {isSelected && (
            <span
              onClick={handleClear}
              className="p-0.5 rounded-full hover:bg-slate-100 hover:text-slate-700 cursor-pointer transition-colors"
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

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 mt-1.5 min-w-[190px] w-max max-w-xs bg-white border border-slate-200/90 rounded-xl shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="max-h-60 overflow-y-auto">
            {options.map((opt) => {
              const active = value === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    onChange(opt);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm transition-colors cursor-pointer flex items-center justify-between ${
                    active
                      ? "bg-red-50 text-red-600 font-semibold"
                      : "text-slate-700 hover:bg-red-50/60 hover:text-red-600 font-medium"
                  }`}
                >
                  <span>{opt}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
