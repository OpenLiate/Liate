import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import { RootProvider } from "fumadocs-ui/provider/next";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://openliate.tech"),
  title: {
    default: "OpenLiate — Open Source OOP Framework for AI Agents",
    template: "%s | OpenLiate",
  },
  description:
    "Open Source OOP Framework for AI Agents. Where Classes Are AI Agents. Sovereign AI Infrastructure runtime. Selected for India's Sarvam AI Startup Program 2026.",
  applicationName: "OpenLiate",
  keywords: [
    "OpenLiate",
    "Liate",
    "Where Classes Are AI Agents",
    "AI Agents",
    "OOP Framework for AI Agents",
    "Open Source OOP Framework for AI Agents",
    "AI Agent Runtime",
    "Open Source AI",
    "Sovereign AI",
    "Sarvam AI",
    "Autonomous Agents",
    "Bun AI",
    "Multi-LLM",
    "Y Combinator",
    "Vinod Hatti",
  ],
  authors: [{ name: "Vinod Hatti", url: "https://openliate.tech" }],
  creator: "Vinod Hatti",
  publisher: "OpenLiate",
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png" },
      { url: "/liate-emblem.png", type: "image/png" },
    ],
    shortcut: "/icon.png",
    apple: "/apple-icon.png",
  },
  manifest: "/manifest.json",
  alternates: {
    canonical: "https://openliate.tech",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://openliate.tech",
    siteName: "OpenLiate",
    title: "OpenLiate — Open Source OOP Framework for AI Agents",
    description: "Where Classes Are AI Agents. Sovereign Open Source OOP Framework and runtime for autonomous AI agents.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "OpenLiate — Open Source OOP Framework for AI Agents",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "OpenLiate — Open Source OOP Framework for AI Agents",
    description: "Where Classes Are AI Agents. Sovereign Open Source OOP Framework and runtime for autonomous AI agents.",
    creator: "@OpenLiate",
    images: ["/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "OpenLiate",
  operatingSystem: "Cross-platform (macOS, Linux, Windows)",
  applicationCategory: "DeveloperApplication",
  description: "Open Source OOP Framework for AI Agents. OOP — Class is an Agent, Agent is an API.",
  url: "https://openliate.tech",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  author: {
    "@type": "Person",
    name: "Vinod Hatti",
    url: "https://openliate.tech",
  },
  publisher: {
    "@type": "Organization",
    name: "OpenLiate",
    url: "https://openliate.tech",
    logo: "https://openliate.tech/icon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} antialiased`}
      suppressHydrationWarning
    >
      <head>
        <link rel="icon" href="/icon.png" type="image/png" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-icon.png" />
      </head>
      <body className="flex flex-col min-h-screen">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <RootProvider>
          {children}
        </RootProvider>
      </body>
    </html>
  );
}
