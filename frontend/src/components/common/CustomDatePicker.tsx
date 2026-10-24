"use client";

import React, { useState, useRef, useEffect } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, Clock } from "lucide-react";

export interface CustomDatePickerProps {
  value?: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  minDate?: string;
  maxDate?: string;
  size?: "sm" | "md" | "lg";
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const DAY_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export default function CustomDatePicker({
  value,
  onChange,
  placeholder = "Select date",
  className = "",
  disabled = false,
  minDate,
  maxDate,
  size = "md"
}: CustomDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse current selected date
  const parsedDate = value ? new Date(value) : null;
  const isValidDate = parsedDate && !isNaN(parsedDate.getTime());

  // View state for month & year navigation
  const [viewDate, setViewDate] = useState<Date>(
    isValidDate ? new Date(parsedDate.getTime()) : new Date()
  );

  useEffect(() => {
    if (isValidDate) {
      setViewDate(new Date(parsedDate.getTime()));
    }
  }, [value]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth();

  // Days calculations
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();

  // Month navigation
  const prevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const nextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleSelectDay = (day: number) => {
    const mm = String(currentMonth + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    const dateStr = `${currentYear}-${mm}-${dd}`;
    onChange(dateStr);
    setIsOpen(false);
  };

  const handleSetToday = (e: React.MouseEvent) => {
    e.stopPropagation();
    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    onChange(`${today.getFullYear()}-${mm}-${dd}`);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
  };

  // Format display label
  const formatDisplay = (dateStr?: string) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  const todayStr = (() => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
  })();

  const sizeClasses =
    size === "sm"
      ? "h-8 px-2.5 text-xs rounded-lg"
      : size === "lg"
      ? "h-11 px-4 text-sm rounded-xl"
      : "h-10 px-3.5 text-xs sm:text-sm rounded-xl";

  return (
    <div
      ref={containerRef}
      className={`relative inline-block w-full ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between gap-2.5 bg-slate-50 hover:bg-slate-100/80 border text-slate-800 font-medium transition-all cursor-pointer shadow-2xs select-none ${sizeClasses} ${
          isOpen
            ? "border-red-500 ring-2 ring-red-100 bg-white"
            : "border-slate-200 hover:border-slate-300"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <div className="flex items-center gap-2.5 truncate">
          <CalendarIcon
            className={`w-4 h-4 shrink-0 transition-colors ${
              value ? "text-red-600" : "text-slate-400"
            }`}
          />
          <span className={`truncate ${value ? "text-slate-800 font-medium" : "text-slate-400 font-normal"}`}>
            {formatDisplay(value) || placeholder}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {value && !disabled && (
            <span
              onClick={handleClear}
              title="Clear date"
              className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-200/60 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
        </div>
      </button>

      {/* Calendar Floating Popover */}
      {isOpen && (
        <div className="absolute z-60 left-0 mt-1.5 w-68 bg-white border border-slate-200/90 rounded-2xl shadow-xl p-3 animate-in fade-in zoom-in-95 duration-100 select-none">
          {/* Calendar Header: Month, Year, Arrows */}
          <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-slate-100">
            <span className="font-bold text-slate-800 text-xs tracking-tight">
              {MONTH_NAMES[currentMonth]} {currentYear}
            </span>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={prevMonth}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={nextMonth}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Days of week header */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {DAY_NAMES.map((d) => (
              <span key={d} className="text-[10px] font-bold text-slate-400 py-0.5">
                {d}
              </span>
            ))}
          </div>

          {/* Month Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {/* Empty slots before first day */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <span key={`empty-${i}`} className="w-7 h-7" />
            ))}

            {/* Days in Month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const mm = String(currentMonth + 1).padStart(2, "0");
              const dd = String(day).padStart(2, "0");
              const fullDateStr = `${currentYear}-${mm}-${dd}`;
              const isSelected = value === fullDateStr;
              const isToday = todayStr === fullDateStr;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleSelectDay(day)}
                  className={`w-7 h-7 mx-auto flex items-center justify-center text-xs rounded-lg transition-all cursor-pointer ${
                    isSelected
                      ? "bg-red-600 text-white font-bold shadow-xs hover:bg-red-700"
                      : isToday
                      ? "border border-red-300 text-red-600 font-bold hover:bg-red-50"
                      : "text-slate-700 hover:bg-slate-100 hover:text-slate-900 font-medium"
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Footer Actions: Today & Clear */}
          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <button
              type="button"
              onClick={handleSetToday}
              className="text-red-600 hover:text-red-700 font-semibold cursor-pointer px-1.5 py-0.5 rounded hover:bg-red-50 transition-colors"
            >
              Today
            </button>
            {value && (
              <button
                type="button"
                onClick={handleClear}
                className="text-slate-400 hover:text-slate-600 font-medium cursor-pointer px-1.5 py-0.5 rounded hover:bg-slate-100 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
