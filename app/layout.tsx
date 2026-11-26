import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CareerOS // Personal Career Command Center & AI Application Engine",
  description:
    "Job vault, Anchor Tab clipper, application kit studio, master career profile, and MCP server for a zero-hallucination job hunt.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${jetbrains.variable}`}>
      <body className="min-h-screen flex flex-col bg-canvas text-zinc-100 font-sans antialiased selection:bg-indigo-500/30 selection:text-indigo-200">
        {children}
        <Script
          src="https://unpkg.com/@phosphor-icons/web@2.1.2"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
