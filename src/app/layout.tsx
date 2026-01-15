import "./globals.css";
import Nav from "@/components/nav";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="light">
      <body>
        <Nav />
        {children}
      </body>
    </html>
  );
}
