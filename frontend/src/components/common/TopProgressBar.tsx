"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function TopProgressBar() {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // When pathname changes, complete progress and fade out
    if (visible) {
      setProgress(100);
      const timer = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [pathname]);

  useEffect(() => {
    const handleStart = () => {
      setVisible(true);
      setProgress(30);
      const timer1 = setTimeout(() => setProgress(65), 100);
      const timer2 = setTimeout(() => setProgress(85), 300);
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    };

    window.addEventListener("zigmaa_nav_start", handleStart);
    return () => {
      window.removeEventListener("zigmaa_nav_start", handleStart);
    };
  }, []);

  if (!visible && progress === 0) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 h-[2.5px] z-[9999] pointer-events-none overflow-hidden bg-transparent"
      aria-hidden="true"
    >
      <div
        className="h-full bg-gradient-to-r from-red-600 via-rose-500 to-amber-400 shadow-[0_0_10px_rgba(225,29,72,0.8)] transition-all duration-200 ease-out"
        style={{
          width: `${progress}%`,
          opacity: visible ? 1 : 0,
          transitionProperty: "width, opacity"
        }}
      />
    </div>
  );
}
