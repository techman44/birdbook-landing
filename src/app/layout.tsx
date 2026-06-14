import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "BirdBook - Social Bird Photography",
  description: "AI-powered bird identification and social network for bird photographers",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.png", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
    shortcut: "/favicon.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "BirdBook",
  },
  formatDetection: {
    telephone: false,
  },
  applicationName: "BirdBook",
  keywords: ["bird identification", "birding", "bird photography", "bird watching", "AI identification", "ornithology"],
  authors: [{ name: "BirdBook" }],
  creator: "BirdBook",
  publisher: "BirdBook",
  openGraph: {
    type: "website",
    locale: "en_AU",
    url: "https://birbook.net",
    title: "BirdBook - Social Bird Photography",
    description: "AI-powered bird identification and social network for bird photographers",
    siteName: "BirdBook",
    images: [
      {
        url: "/icon-512.png",
        width: 512,
        height: 512,
        alt: "BirdBook Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "BirdBook - Social Bird Photography",
    description: "AI-powered bird identification and social network for bird photographers",
    images: ["/icon-512.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#10b981",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased bg-gray-50 min-h-screen`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
