import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Bricolage_Grotesque } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeColorMeta } from "@/components/ThemeColorMeta";
import AuthProvider from "@/components/Provider";
import AmbientBackground from "@/components/AmbientBackground";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"] });

const SITE_URL = process.env.NEXTAUTH_URL || "https://siwes-finder-eight.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "SIWES Finder — Verified SIWES placements in Nigeria",
    template: "%s · SIWES Finder",
  },
  description:
    "Find and apply to verified SIWES placements, track applications, and keep your e-logbook — built for Nigerian students, employers, and institutions.",
  openGraph: {
    siteName: "SIWES Finder",
    type: "website",
    title: "SIWES Finder — Verified SIWES placements in Nigeria",
    description:
      "Find and apply to verified SIWES placements, track applications, and keep your e-logbook.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7fa" },
    { media: "(prefers-color-scheme: dark)", color: "#07080d" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${bricolage.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col transition-colors duration-300" suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <ThemeColorMeta />
          <AuthProvider>
            <AmbientBackground />
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
