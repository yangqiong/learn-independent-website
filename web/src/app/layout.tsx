import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: process.env.SITE_NAME ?? "Demo Store",
  description: "An independent store demo",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
