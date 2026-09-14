import { companyPages } from "./company-pages.ts";
import { aiServices, AI_ROUTES } from "./ai-services.ts";
import type { CompanyLanguage, CompanyPage } from "./company-types.ts";

export const SITE_URL = "https://sdq-sfb.com/";
export const COMPANY_NAME = "SDQ Management Advisory Group";
export const PHONE = "+998 55 588 90 00";
export const PHONE_HREF = "tel:+998555889000";
export const EMAIL = "info@sdq-sfb.com";
export const absolute = (path: string) => new URL(path, SITE_URL).href;
export const pages: CompanyPage[] = [...companyPages, ...aiServices];
export const canonicalPaths = ["/", ...pages.map(page => page.path)];
export const pageForPath = (path: string) => pages.find(page => page.path === path);
export const pathForSlug = (slug?: string[]) => `/more/${slug?.length ? slug.join("/") + "/" : ""}`;
export const companyHome = (lang: CompanyLanguage) => lang === "en" ? "/more/en/" : "/more/";

export function navigation(lang: CompanyLanguage) {
  return (lang === "en" ? [
    ["About", "about"], ["1C Products", "1c-products"], ["Services", "services"],
    ["1C Cloud", "1c-cloud"], ["Support", "support"], ["Contacts", "contacts"],
  ] : [
    ["О компании", "o-kompanii"], ["Продукты 1С", "1s-produkty"], ["Услуги", "uslugi"],
    ["1C Cloud", "1c-cloud"], ["Поддержка", "podderzhka"], ["Контакты", "kontakty"],
  ]).map(([label, slug]) => ({ label, href: `${companyHome(lang)}${slug}/` }));
}

export function breadcrumbs(page: CompanyPage) {
  const en = page.language === "en";
  const home = companyHome(page.language);
  const result = [{ label: en ? "Company" : "Компания", href: home }];
  if (page.kind === "home") return result;
  if (page.path.includes("/uslugi/") || page.path.includes("/services/")) {
    const href = home + (en ? "services/" : "uslugi/");
    if (page.path !== href) result.push({ label: en ? "Services" : "Услуги", href });
  } else if (page.kind === "product") {
    result.push({ label: "Продукты 1С", href: "/more/1s-produkty/" });
  }
  result.push({ label: page.label, href: page.path });
  return result;
}

export function relatedAI(page: CompanyPage) {
  return ["/more/uslugi/", "/more/en/services/", "/more/uslugi/integratsiya-1s/", "/more/en/services/1c-integration/"].includes(page.path)
    ? pageForPath(AI_ROUTES[page.language]) : undefined;
}

export const organization = {
  "@type": "Organization", "@id": absolute("/#organization"), name: COMPANY_NAME,
  alternateName: "SDQ", url: SITE_URL, email: EMAIL, telephone: PHONE_HREF.slice(4),
  logo: absolute("/more/images/image_2026-04-17_13-49-03-photoroom.png"),
  areaServed: { "@type": "Country", name: "Uzbekistan" },
};
export const website = {
  "@type": "WebSite", "@id": absolute("/#website"), url: SITE_URL, name: COMPANY_NAME,
  publisher: { "@id": organization["@id"] }, inLanguage: ["uz-Latn", "uz-Cyrl", "ru", "en"],
};

export function structuredData(page: CompanyPage) {
  const url = absolute(page.path);
  return { "@context": "https://schema.org", "@graph": [organization, website, {
    "@type": "WebPage", "@id": `${url}#webpage`, url, name: page.title,
    description: page.description, inLanguage: page.language,
    isPartOf: { "@id": website["@id"] }, about: { "@id": organization["@id"] },
    breadcrumb: { "@id": `${url}#breadcrumbs` },
  }, {
    "@type": "BreadcrumbList", "@id": `${url}#breadcrumbs`,
    itemListElement: breadcrumbs(page).map((item, index) => ({
      "@type": "ListItem", position: index + 1, name: item.label, item: absolute(item.href),
    })),
  }, ...(page.kind === "service" ? [{
    "@type": "Service", "@id": `${url}#service`, url, name: page.label,
    description: page.description, provider: { "@id": organization["@id"] },
    areaServed: { "@type": "Country", name: "Uzbekistan" },
  }] : [])] };
}
