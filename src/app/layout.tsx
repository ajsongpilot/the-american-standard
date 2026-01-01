import type { Metadata, Viewport } from "next";
import { Playfair_Display, Source_Serif_4 } from "next/font/google";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-headline",
  weight: ["400", "500", "600", "700", "800", "900"],
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "The American Standard - Clear. Fair. American.",
  description:
    "Your trusted daily source for American political news. Clear reporting, fair analysis, distinctly American perspective.",
  keywords: [
    "American news",
    "political news",
    "US politics",
    "daily newspaper",
    "American Standard",
  ],
  authors: [{ name: "The American Standard Staff" }],
  creator: "The American Standard",
  publisher: "The American Standard",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_BASE_URL || "https://theamericanstandard.news"
  ),
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "The American Standard",
    title: "The American Standard - Clear. Fair. American.",
    description:
      "Your trusted daily source for American political news. Clear reporting, fair analysis, distinctly American perspective.",
  },
  twitter: {
    card: "summary_large_image",
    title: "The American Standard",
    description: "Clear. Fair. American.",
  },
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "The American Standard",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#1e40af",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${playfair.variable} ${sourceSerif.variable}`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body className="min-h-screen bg-background antialiased">
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
