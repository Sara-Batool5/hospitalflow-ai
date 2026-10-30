import type { Metadata } from "next";
import "./globals.css";
import "./brand-fix.css";

export const metadata: Metadata = {
  title: "HospitalFlow AI | Hospital Operations",
  description:
    "An AI-powered coordination layer for hospital administrative workflows, operational bottlenecks, and auditable follow-ups.",
  applicationName: "HospitalFlow AI"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
