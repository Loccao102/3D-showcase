import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import "./showcase-v1.css";
import "./showcase-motion.css";

export const metadata: Metadata = {
  title: "3D Showcase",
  description: "A reusable 3D-first product showcase platform.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
