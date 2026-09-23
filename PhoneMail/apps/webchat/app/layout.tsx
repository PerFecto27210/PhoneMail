import type { Metadata } from "next";
import Script from "next/script";
import { ConvexClientProvider } from "./ConvexClientProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "PhoneMail Chat",
  description: "WhatsApp-inspired mobile-first chat email client",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <Script id="phonemail-theme-init" strategy="beforeInteractive">
          {`try { var savedTheme = localStorage.getItem("phonemail.theme"); document.documentElement.dataset.theme = savedTheme === "light" ? "light" : "dark"; } catch { document.documentElement.dataset.theme = "dark"; }`}
        </Script>
      </head>
      <body>
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
