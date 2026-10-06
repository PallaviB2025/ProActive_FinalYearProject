import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "ProActive — Password security, made clear",
  description:
    "Zero-knowledge encrypted credential vault with local heuristic audit, k-anonymity breach detection, and proactive security missions.",
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased relative">
        {children}
      </body>
    </html>
  );
}
