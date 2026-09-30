import type { Metadata } from "next";
import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "leaflet/dist/leaflet.css";
import "./globals.css";

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
});

export const metadata: Metadata = {
  title: "CHAPAA-GUARD: Unified Fraud Defense & QoS Intelligence Center",
  description:
    "Africa's Talking Telecom Innovate Hackathon: real-time smishing defense, Paybill fraud interception, and distributed QoS telemetry.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body className="bg-slate-50 text-slate-800 font-sans antialiased overflow-x-hidden selection:bg-sky-200 selection:text-slate-900">
        {children}
      </body>
    </html>
  );
}
