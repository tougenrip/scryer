import type { Metadata } from "next";
import { Inter, Cinzel, Kalam } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: {
    default: "Scryer - D&D 5e Digital Suite",
    template: "%s | Scryer",
  },
  description: "A free, comprehensive web-based D&D 5th Edition digital suite for remote gameplay. Virtual tabletop, character sheets, dice rolling, and campaign management.",
  keywords: ["D&D", "Dungeons & Dragons", "5e", "VTT", "virtual tabletop", "character sheet", "campaign manager"],
};

const inter = Inter({
  variable: "--font-inter",
  display: "swap",
  subsets: ["latin"],
});

const cinzel = Cinzel({
  variable: "--font-cinzel",
  display: "swap",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const kalam = Kalam({
  variable: "--font-kalam",
  display: "swap",
  subsets: ["latin"],
  weight: ["300", "400", "700"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${cinzel.variable} ${kalam.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
