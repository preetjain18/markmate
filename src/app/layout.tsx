import type { Metadata, Viewport } from "next";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";

// Manrope: headings, navigation, buttons. Inter: body text and application UI.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });

export const metadata: Metadata = {
  title: "MarkMate – Stop losing marks on answers you thought were right",
  description:
    "Practise CA answer-writing with feedback that shows what you missed, why it matters, and how to write a better answer next time. Evaluation starts with CA Final Audit.",
};

export const viewport: Viewport = { themeColor: "#f7f6f2" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${manrope.variable}`}>
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
