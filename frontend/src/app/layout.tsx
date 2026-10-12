import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Zigmaa CRM - Omnichannel Sales & Operations",
  description: "Production-grade SaaS CRM inspired by Pixelize CRM and HubSpot",
  icons: {
    icon: "/crmlogo.png",
    shortcut: "/crmlogo.png",
    apple: "/crmlogo.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased light">
      <head>
        <link rel="icon" href="/crmlogo.png" type="image/png" sizes="any" />
        <link rel="apple-touch-icon" href="/crmlogo.png" />
      </head>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 font-sans">{children}</body>
    </html>
  );
}
