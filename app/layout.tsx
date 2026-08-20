import { Cinzel, Cormorant_Garamond, Inter } from "next/font/google";
import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-serif",
});

const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: {
    default: "Bharwana Estates Developer",
    template: "%s · Bharwana Estates",
  },
  description:
    "A considered marketplace for private homes and developer-verified residences across Pakistan.",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${cormorant.variable} ${cinzel.variable} font-sans`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
