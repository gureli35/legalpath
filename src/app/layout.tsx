import type { Metadata } from "next";
import { Instrument_Serif } from "next/font/google";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navigation } from "@/components/ui/navigation";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  weight: "400",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "LegalPath - Akıllı Hukuk Platformu",
  description: "Yapay zeka destekli içtihat arama, hukuk asistanı ve akıllı belge yazım platformu.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable}`}>
      <body className="font-sans bg-rx-bg text-dark-charcoal antialiased min-h-screen flex flex-col">
        <Navigation />
        <main className="relative z-2 flex-1 flex flex-col bg-rx-bg">
          {children}
        </main>
      </body>
    </html>
  );
}
