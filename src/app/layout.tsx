import "./globals.css";
import Nav from "@/components/nav";
import ThemeProvider from "@/components/theme-provider";

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
