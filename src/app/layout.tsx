import type { Metadata, Viewport } from "next";
import { Manrope, Montserrat } from "next/font/google";

import "./globals.css";

export const metadata: Metadata = {
  title: "SDQ Management Advisory Group",
  description: "SDQ Management Advisory Group",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
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
