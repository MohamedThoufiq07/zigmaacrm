"use client";

import { useState, useRef, useEffect } from "react";
import { Check } from "lucide-react";

interface MoreViewsDropdownProps {
  views: string[];
  activeView: string;
  onSelect: (view: string) => void;
  className?: string;
}

export default function MoreViewsDropdown({
  views,
  activeView,
  onSelect,
  className = "",
}: MoreViewsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      {/* More Button: ··· */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`px-2.5 py-1.5 rounded-lg font-bold text-sm transition-colors cursor-pointer select-none ${
          isOpen
            ? "bg-purple-100 text-[#6941C6]"
            : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
        }`}
        title="More views"
      >
        ···
      </button>

      {/* Popover Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-60 max-h-80 overflow-y-auto bg-white border border-slate-200/90 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="space-y-0.5">
            {views.map((view) => {
              const isSelected = activeView === view;
              return (
                <button
                  key={view}
                  type="button"
                  onClick={() => {
                    onSelect(view);
                    setIsOpen(false);
                  }}
                  className={`w-[calc(100%-8px)] mx-1 text-left px-3.5 py-2 text-sm transition-colors cursor-pointer flex items-center justify-between rounded-xl select-none ${
                    isSelected
                      ? "text-[#6941C6] font-semibold bg-purple-50/80"
                      : "text-slate-700 hover:bg-purple-50/50 hover:text-[#6941C6] font-medium"
                  }`}
                >
                  <span className="truncate">{view}</span>
                  {isSelected && (
                    <Check className="w-4 h-4 text-[#6941C6] shrink-0 ml-2" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
