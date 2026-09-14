import type { Metadata, Viewport } from "next";
import { Manrope, Montserrat } from "next/font/google";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://sdq-sfb.com"),
  title: "SDQ Management Advisory Group",
  description: "SDQ Management Advisory Group",
  openGraph: {
    type: "website",
    url: "/",
    siteName: "SDQ Management Advisory Group",
    title: "SDQ Management Advisory Group",
    description: "SDQ Management Advisory Group",
    images: [
      {
        url: "/sdq-share.png",
        width: 1254,
        height: 1254,
        type: "image/png",
        alt: "Plush SDQ letters in navy blue, turquoise, and golden yellow",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "SDQ Management Advisory Group",
    description: "SDQ Management Advisory Group",
    images: [
      {
        url: "/sdq-share.png",
        alt: "Plush SDQ letters in navy blue, turquoise, and golden yellow",
      },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "light",
  themeColor: "#eee7dc",
};

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  variable: "--font-sdq-body",
});

const montserrat = Montserrat({
  subsets: ["latin", "cyrillic"],
  variable: "--font-sdq-heading",
});

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body className={`${manrope.variable} ${montserrat.variable}`}>
        {children}
      </body>
    </html>
  );
}
