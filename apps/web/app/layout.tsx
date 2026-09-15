import type { Metadata } from "next";
import { Be_Vietnam_Pro, Darker_Grotesque } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";
import "./showcase-v1.css";
import "./showcase-motion.css";
import "./showcase-fonts.css";

const displayFont = Darker_Grotesque({
  subsets: ["latin", "vietnamese"],
  weight: ["500", "600", "700"],
  variable: "--font-showcase-display",
  display: "swap",
});

const bodyFont = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-showcase-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "3D Showcase",
  description: "A reusable 3D-first product showcase platform.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={`${displayFont.variable} ${bodyFont.variable}`}>
      <body>{children}</body>
    </html>
  );
}
