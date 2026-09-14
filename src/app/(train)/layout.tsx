import type { Metadata, Viewport } from "next";
import { Manrope, Montserrat } from "next/font/google";
import { siteMetadata, siteStructuredData } from "../site-metadata";

import "./globals.css";

export const metadata: Metadata = siteMetadata;

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
    <html lang="uz-Latn">
      <body className={`${manrope.variable} ${montserrat.variable}`}>
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(siteStructuredData).replace(/</g, "\\u003c"),
          }}
        />
      </body>
    </html>
  );
}
