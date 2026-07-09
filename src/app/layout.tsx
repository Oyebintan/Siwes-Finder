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

export const metadata: Metadata = {
  title: "SIWES Finder",
  description: "Connect with top organizations for SIWES placements in Nigeria.",
};

export const viewport: Viewport = {
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
