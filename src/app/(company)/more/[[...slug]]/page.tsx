import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CompanyContent } from "@/components/company/CompanyContent";
import { absolute, COMPANY_NAME, pageForPath, pages, pathForSlug, SITE_URL, structuredData } from "@/content/site";

export const dynamicParams = false;
export function generateStaticParams() {
  return pages.map(page => ({ slug: page.path.slice(6).split("/").filter(Boolean) }));
}
type Props = { params: Promise<{ slug?: string[] }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = pageForPath(pathForSlug((await params).slug));
  if (!page) notFound();
  const url = absolute(page.path);
  const languages = page.counterpart ? {
    [page.language]: url,
    [page.language === "en" ? "ru" : "en"]: absolute(page.counterpart),
  } : undefined;
  return {
    metadataBase: new URL(SITE_URL), title: page.title, description: page.description,
    alternates: { canonical: url, languages }, robots: { index: true, follow: true },
    openGraph: { type: "website", siteName: COMPANY_NAME, title: page.title, description: page.description,
      url, locale: page.language === "en" ? "en_US" : "ru_RU", images: [{ url: "/sdq-share.png", alt: "SDQ" }] },
    twitter: { card: "summary", title: page.title, description: page.description, images: ["/sdq-share.png"] },
  };
}
export default async function CompanyPage({ params }: Props) {
  const page = pageForPath(pathForSlug((await params).slug));
  if (!page) notFound();
  return <>
    <CompanyContent page={page} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData(page)).replace(/</g, "\\u003c") }} />
  </>;
}
