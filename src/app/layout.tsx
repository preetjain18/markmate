import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MarkMate",
  description: "See exactly which marks you lost in your CA Final Audit answer, rewrite, and watch your marks go up.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
