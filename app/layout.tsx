import { Rajdhani, Yantramanav } from "next/font/google";
import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import "./globals.css";

/** Body / UI — matches Imarat (Yantramanav) */
const yantramanav = Yantramanav({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-sans",
  display: "swap",
});

/** Headings / display — matches Imarat (Rajdhani) */
const rajdhani = Rajdhani({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Bharwana Estates Dealer",
    template: "%s · Bharwana Estates",
  },
  description:
    "A considered marketplace for private homes and Dealer-verified residences across Pakistan.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/logo.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${yantramanav.variable} ${rajdhani.variable} font-sans`}
        style={{ ["--font-display" as string]: "var(--font-serif)" }}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
