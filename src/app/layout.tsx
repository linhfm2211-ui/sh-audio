import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  applicationName: "SH Audio",
  title: {
    default: "SH Audio - Nghe truyen audio",
    template: "%s | SH Audio",
  },
  description:
    "PWA nghe truyen audio tu metadata YouTube, toi uu cho mobile, bookmark va tiep tuc nghe.",
  manifest: "/manifest.webmanifest",
  metadataBase: new URL("https://xzzlrmlapawecahoavqn.supabase.co"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">{children}</body>
    </html>
  );
}
