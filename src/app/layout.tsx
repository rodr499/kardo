import "./globals.css";
import Nav from "@/components/nav";
import ThemeProvider from "@/components/theme-provider";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kardo - Your Digital Business Card",
  description: "Share your contact information instantly. No apps, no downloads—just scan and connect.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="light">
      <body>
        <ThemeProvider />
        <Nav />
        {children}
      </body>
    </html>
  );
}
