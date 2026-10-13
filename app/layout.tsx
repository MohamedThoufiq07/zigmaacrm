import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/common/ToastProvider";
import AuthGuard from "@/components/common/AuthGuard";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Zigmaa CRM - Omnichannel Sales & Operations",
  description: "Modern CRM & Sales Pipeline Management",
  icons: {
    icon: "/crmlogo.png",
    shortcut: "/crmlogo.png",
    apple: "/crmlogo.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="icon" href="/crmlogo.png" type="image/png" sizes="any" />
        <link rel="apple-touch-icon" href="/crmlogo.png" />
      </head>
      <body className="min-h-full flex flex-col">
        <ToastProvider>
          <AuthGuard>{children}</AuthGuard>
        </ToastProvider>
      </body>
    </html>
  );
}

