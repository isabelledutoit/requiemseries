import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Requiem — Isabelle du Toit",
  description:
    "Isabelle du Toit — the Requiem series and portfolio of works.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
