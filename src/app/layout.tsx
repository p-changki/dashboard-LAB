import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { GlobalSearchModal } from "@/components/global-search/GlobalSearchModal";
import { APP_META } from "@/lib/app-meta";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: APP_META.displayName,
  description: APP_META.description,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <GlobalSearchModal />
      </body>
    </html>
  );
}
