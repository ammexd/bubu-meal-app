import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NourishSelect",
  description: "Smart meal & hydration guidance",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* The Serious Font Fix: Standard CSS Links */}
        <link href="https://googleapis.com" rel="stylesheet" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
