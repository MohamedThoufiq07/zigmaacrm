"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface LogoLoaderProps {
  size?: "sm" | "md" | "lg" | "xl";
  text?: string;
  fullScreen?: boolean;
  className?: string;
}

export default function LogoLoader({
  size = "lg",
  text = "ZIGMAA CRM",
  fullScreen = false,
  className
}: LogoLoaderProps) {
  const sizeMap = {
    sm: {
      logo: "w-12 h-12",
      ripple: "w-20 h-20",
      bar: "w-28 h-1",
      beam: "w-14",
      textSize: "text-[10px]"
    },
    md: {
      logo: "w-20 h-20",
      ripple: "w-32 h-32",
      bar: "w-36 h-1",
      beam: "w-16",
      textSize: "text-[11px]"
    },
    lg: {
      logo: "w-28 h-28",
      ripple: "w-44 h-44",
      bar: "w-44 h-1.5",
      beam: "w-20",
      textSize: "text-xs"
    },
    xl: {
      logo: "w-36 h-36",
      ripple: "w-56 h-56",
      bar: "w-52 h-1.5",
      beam: "w-24",
      textSize: "text-sm"
    }
  }[size];

  const content = (
    <div className={cn("flex flex-col items-center justify-center gap-6 select-none relative", className)}>
      {/* Logo Hero Area */}
      <div className="relative flex items-center justify-center">
        {/* Deep ambient background red blur */}
        <div className="absolute inset-0 rounded-full bg-red-600/25 blur-3xl transform scale-150 pointer-events-none" />

        {/* Concentric ambient ripples radiating from behind the logo */}
        <div
          className={cn(
            "absolute rounded-full border border-white/25 pointer-events-none animate-ripple-1",
            sizeMap.ripple
          )}
        />
        <div
          className={cn(
            "absolute rounded-full border border-rose-200/20 pointer-events-none animate-ripple-2",
            sizeMap.ripple
          )}
        />

        {/* The Pure Floating Logo */}
        <div className="relative z-10 flex items-center justify-center">
          <div
            className={cn(
              "rounded-3xl p-3.5 bg-white shadow-2xl shadow-black/40 border border-white/90 flex items-center justify-center animate-logo-breathe select-none pointer-events-none backdrop-blur-md",
              sizeMap.logo
            )}
          >
            <img
              src="/loadinglogo.png"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = "/crmlogo.png";
              }}
              alt="Zigmaa CRM"
              className="h-full w-full object-contain"
            />
          </div>
        </div>
      </div>

      {/* Modern High-Tech Capsule Progress Track */}
      <div className="flex flex-col items-center gap-3">
        <div
          className={cn(
            "relative rounded-full overflow-hidden bg-black/30 border border-white/20 shadow-inner",
            sizeMap.bar
          )}
        >
          {/* Luminous laser beam gliding through the track */}
          <div
            className={cn(
              "absolute inset-y-0 bg-gradient-to-r from-transparent via-white to-transparent rounded-full animate-progress-slide shadow-[0_0_12px_rgba(255,255,255,0.9)]",
              sizeMap.beam
            )}
          />
        </div>

        {/* Minimalist Branded Status Text */}
        {text && (
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "font-bold uppercase tracking-[0.25em] text-white/95 drop-shadow-sm",
                sizeMap.textSize
              )}
            >
              {text}
            </span>
            <span className="flex gap-1 items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
            </span>
          </div>
        )}
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-[#7f1d1d] via-[#dc2626] to-[#991b1b] backdrop-blur-2xl animate-in fade-in duration-200">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/10 via-transparent to-black/30 pointer-events-none" />
        <div className="p-10 flex items-center justify-center relative z-10">
          {content}
        </div>
      </div>
    );
  }

  return content;
}
