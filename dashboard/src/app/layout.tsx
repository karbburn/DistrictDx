import type { Metadata } from "next";
import { Fraunces, JetBrains_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

// ── Google Font Configurations ───────────────────────────────────────────────
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

// ── SEO & Page Metadata ──────────────────────────────────────────────────────
export const metadata: Metadata = {
  title: "DistrictDx — Pharmaceutical Market Attractiveness Index (MAI)",
  description:
    "An analytical research instrument providing district-level chronic and acute attractiveness index scores across 785 Indian districts. Tailored for Sun Pharmaceutical Industries portfolio planning.",

};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${jetbrainsMono.variable} ${ibmPlexSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-void text-primary font-sans">
        {children}
      </body>
    </html>
  );
}
