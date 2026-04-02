import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { GlobalSearchModal } from "@/components/global-search/GlobalSearchModal";
import { LocaleProvider } from "@/components/layout/LocaleProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { APP_META } from "@/lib/app-meta";
import { getCanonicalUrl, getRepositoryUrl, getSiteUrl } from "@/lib/site-config";

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
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: `${APP_META.displayName} | ${APP_META.tagline}`,
    template: `%s | ${APP_META.displayName}`,
  },
  description: APP_META.description,
  applicationName: APP_META.displayName,
  keywords: [
    "local ai workspace",
    "claude",
    "codex",
    "gemini",
    "meeting notes",
    "prd",
    "developer tools",
    "desktop app",
    "info hub",
    "signal writer",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: getCanonicalUrl("/"),
    siteName: APP_META.displayName,
    title: `${APP_META.displayName} | ${APP_META.tagline}`,
    description: APP_META.description,
    locale: "en_US",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: `${APP_META.displayName} preview`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${APP_META.displayName} | ${APP_META.tagline}`,
    description: APP_META.description,
    images: ["/twitter-image"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  category: "technology",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: APP_META.displayName,
    applicationCategory: "BusinessApplication",
    operatingSystem: "macOS, Windows, Linux",
    description: APP_META.description,
    url: getCanonicalUrl("/"),
    sameAs: [getRepositoryUrl()],
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    featureList: [
      "Local-first AI workspace",
      "Meeting Hub",
      "Call to PRD",
      "CS Helper",
      "Info Hub",
      "Signal Writer",
    ],
  };

  return (
    <html lang="ko" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
          }}
        />
        <LocaleProvider>
          <ToastProvider>
            {children}
            <GlobalSearchModal />
          </ToastProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
