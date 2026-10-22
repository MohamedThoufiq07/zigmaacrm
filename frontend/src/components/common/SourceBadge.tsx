"use client";

import React from "react";
import {
  Globe,
  Share2,
  Mail,
  Instagram as InstagramIcon,
  Linkedin,
  Youtube,
  Megaphone,
  UserCheck,
  FileSpreadsheet,
  Tag
} from "lucide-react";

export interface SourceInfo {
  key: string;
  label: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
}

export function normalizeSource(src?: string): string {
  if (!src) return "Manual";
  const s = src.trim();
  const lower = s.toLowerCase();
  if (lower.includes("whatsapp")) return "WhatsApp";
  if (lower.includes("meta") || lower.includes("facebook")) return "Meta Ads";
  if (lower.includes("google")) return "Google Ads";
  if (lower.includes("web") || lower.includes("site") || lower.includes("form")) return "Website Form";
  if (lower.includes("referral")) return "Referral";
  if (lower.includes("cold") || lower.includes("email") || lower.includes("outreach")) return "Cold Outreach";
  if (lower.includes("instagram") || lower.includes("insta")) return "Instagram";
  if (lower.includes("linkedin")) return "LinkedIn";
  if (lower.includes("youtube")) return "YouTube";
  if (lower.includes("csv") || lower.includes("excel") || lower.includes("import")) return "Excel/CSV Import";
  if (lower.includes("direct") || lower.includes("walk-in")) return "Direct / Walk-in";
  if (lower.includes("manual")) return "Manual";
  return s;
}

export function SourceIcon({
  source,
  className = "w-4 h-4"
}: {
  source?: string;
  className?: string;
}) {
  const norm = normalizeSource(source).toLowerCase();

  // 1. WhatsApp: Official Crisp SVG
  if (norm.includes("whatsapp")) {
    return (
      <svg
        className={`${className} shrink-0`}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M12.004 2C6.48 2 2 6.48 2 12c0 1.83.495 3.548 1.355 5.027L2.1 21.9l5.035-1.222A9.957 9.957 0 0012.004 22c5.523 0 10.003-4.48 10.003-10S17.527 2 12.004 2z"
          fill="#25D366"
        />
        <path
          d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.198.297-.768.966-.942 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.174-.297-.019-.458.13-.606.134-.133.298-.347.446-.52.15-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.501-.669-.51-.173-.008-.372-.01-.57-.01-.199 0-.521.074-.794.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.15.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.227 1.36.195 1.872.118.571-.086 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"
          fill="#FFFFFF"
        />
      </svg>
    );
  }

  // 2. Meta Ads: Blue circular badge with white 'M'
  if (norm.includes("meta")) {
    return (
      <span className="w-4.5 h-4.5 rounded-full bg-blue-100/90 text-blue-600 flex items-center justify-center shrink-0 text-[11px] font-bold border border-blue-200">
        M
      </span>
    );
  }

  // 3. Google Ads: Amber circular badge with amber 'G'
  if (norm.includes("google")) {
    return (
      <span className="w-4.5 h-4.5 rounded-full bg-amber-100/90 text-amber-600 flex items-center justify-center shrink-0 text-[11px] font-bold border border-amber-200">
        G
      </span>
    );
  }

  // 4. Website Form: Green Globe
  if (norm.includes("web") || norm.includes("form") || norm.includes("site")) {
    return <Globe className={`${className} text-emerald-600 shrink-0`} />;
  }

  // 5. Referral: Purple Share network
  if (norm.includes("referral")) {
    return <Share2 className={`${className} text-purple-600 shrink-0`} />;
  }

  // 6. Cold Outreach: Blue/Indigo Mail envelope
  if (norm.includes("cold") || norm.includes("email") || norm.includes("outreach")) {
    return <Mail className={`${className} text-indigo-600 shrink-0`} />;
  }

  // 7. Instagram: Pink camera icon
  if (norm.includes("instagram") || norm.includes("insta")) {
    return <InstagramIcon className={`${className} text-pink-600 shrink-0`} />;
  }

  // 8. LinkedIn: Blue LinkedIn
  if (norm.includes("linkedin")) {
    return <Linkedin className={`${className} text-blue-700 shrink-0`} />;
  }

  // 9. YouTube: Red YouTube
  if (norm.includes("youtube")) {
    return <Youtube className={`${className} text-red-600 shrink-0`} />;
  }

  // 10. Excel/CSV Import
  if (norm.includes("csv") || norm.includes("excel") || norm.includes("import")) {
    return <FileSpreadsheet className={`${className} text-teal-600 shrink-0`} />;
  }

  // 11. Direct / Manual
  if (norm.includes("manual") || norm.includes("direct") || norm.includes("walk-in")) {
    return <UserCheck className={`${className} text-slate-600 shrink-0`} />;
  }

  return <Tag className={`${className} text-slate-400 shrink-0`} />;
}

export function SourceBadge({
  source,
  className = ""
}: {
  source?: string;
  className?: string;
}) {
  const norm = normalizeSource(source);
  const lower = norm.toLowerCase();

  let styleClasses = "bg-slate-50 text-slate-700 border-slate-200";

  if (lower.includes("whatsapp")) {
    styleClasses = "bg-emerald-50 text-emerald-700 border-emerald-200";
  } else if (lower.includes("meta")) {
    styleClasses = "bg-blue-50 text-blue-700 border-blue-200";
  } else if (lower.includes("google")) {
    styleClasses = "bg-amber-50 text-amber-800 border-amber-200";
  } else if (lower.includes("web") || lower.includes("form") || lower.includes("site")) {
    styleClasses = "bg-teal-50 text-teal-700 border-teal-200";
  } else if (lower.includes("referral")) {
    styleClasses = "bg-purple-50 text-purple-700 border-purple-200";
  } else if (lower.includes("cold") || lower.includes("outreach")) {
    styleClasses = "bg-indigo-50 text-indigo-700 border-indigo-200";
  } else if (lower.includes("instagram")) {
    styleClasses = "bg-pink-50 text-pink-700 border-pink-200";
  } else if (lower.includes("linkedin")) {
    styleClasses = "bg-sky-50 text-sky-700 border-sky-200";
  } else if (lower.includes("youtube")) {
    styleClasses = "bg-red-50 text-red-700 border-red-200";
  } else if (lower.includes("csv") || lower.includes("excel") || lower.includes("import")) {
    styleClasses = "bg-cyan-50 text-cyan-700 border-cyan-200";
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border shadow-2xs whitespace-nowrap transition-all ${styleClasses} ${className}`}
    >
      <SourceIcon source={source} className="w-3.5 h-3.5" />
      <span>{norm}</span>
    </span>
  );
}

export default SourceBadge;
