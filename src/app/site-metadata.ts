import type { Metadata } from "next";
import { organization, website } from "../content/site.ts";

export const SITE_URL = "https://sdq-sfb.com/";
const COMPANY_NAME = "SDQ Management Advisory Group";
const title = "SDQ — O‘zbekistonda 1C va sun’iy intellekt yechimlari";
const description =
  "SDQ — O‘zbekistonda 1C rasmiy hamkori. 1C joriy etish va qo‘llab-quvvatlash, biznes jarayonlarini avtomatlashtirish hamda sun’iy intellekt yechimlari.";

export const siteMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title,
  description,
  alternates: { canonical: SITE_URL },
  robots: { index: true, follow: true },
  verification: { google: process.env.GOOGLE_SITE_VERIFICATION || undefined },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: COMPANY_NAME,
    title,
    description,
    images: [{
      url: "/sdq-share.png",
      width: 1254,
      height: 1254,
      type: "image/png",
      alt: "Plush SDQ letters in navy blue, turquoise, and golden yellow",
    }],
  },
  twitter: {
    card: "summary",
    title,
    description,
    images: [{
      url: "/sdq-share.png",
      alt: "Plush SDQ letters in navy blue, turquoise, and golden yellow",
    }],
  },
};

export const siteStructuredData = { "@context": "https://schema.org", "@graph": [organization, website] };
