import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { pageForPath, pathForSlug } from "@/content/site";
import { CompanyShell } from "@/components/company/CompanyShell";
import "@/components/company/company.css";

export default async function CompanyLayout({ children, params }: {
  children: ReactNode; params: Promise<{ slug?: string[] }>;
}) {
  const page = pageForPath(pathForSlug((await params).slug));
  if (!page) notFound();
  return <html lang={page.language}><body className="company-site">
    <CompanyShell page={page}>{children}</CompanyShell>
  </body></html>;
}
