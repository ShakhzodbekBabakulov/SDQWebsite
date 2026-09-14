/* eslint-disable @next/next/no-img-element -- Imported local artwork is served by the static export. */
/* eslint-disable @next/next/no-html-link-for-pages -- Native document navigation isolates the train root layout and language documents. */
import type { ReactNode } from "react";
import type { CompanyPage, CompanyLanguage } from "@/content/company-types";
import { AI_ROUTES } from "@/content/ai-services";
import { companyHome, navigation, pages, PHONE, PHONE_HREF, EMAIL } from "@/content/site";
import { MobileMenu } from "./MobileMenu";

function LanguageLink({ page }: { page: CompanyPage }) {
  return page.counterpart ? <a className="language-link" href={page.counterpart}
    hrefLang={page.language === "en" ? "ru" : "en"} lang={page.language === "en" ? "ru" : "en"}
    aria-label={page.language === "en" ? "Русская версия" : "English version"}>
    {page.language === "en" ? "RU" : "EN"}
  </a> : null;
}
function Nav({ page, label }: { page: CompanyPage; label: string }) {
  return <nav aria-label={label}><ul>{navigation(page.language).map(link => <li key={link.href}>
    <a href={link.href} aria-current={page.path === link.href ? "page" : undefined}>{link.label}</a>
  </li>)}</ul></nav>;
}
export function ContactPanel({ language }: { language: CompanyLanguage }) {
  const en = language === "en";
  return <aside className="contact-panel" aria-label={en ? "Contact SDQ" : "Контакты SDQ"}>
    <p className="contact-title">{en ? "Let’s discuss your project" : "Обсудим ваш проект"}</p>
    <p>{en ? "Call or email us to discuss your project." : "Позвоните или напишите нам, чтобы обсудить ваш проект."}</p>
    <a className="button" href={PHONE_HREF}>{PHONE}</a>
    <a className="contact-email" href={`mailto:${EMAIL}`}>{EMAIL}</a>
  </aside>;
}
export function CompanyShell({ page, children }: { page: CompanyPage; children: ReactNode }) {
  const en = page.language === "en";
  const services = pages.filter(p => p.language === page.language && p.kind === "service" && p.path !== AI_ROUTES[page.language]);
  return <>
    <a className="skip-link" href="#company-content">{en ? "Skip to content" : "Перейти к содержанию"}</a>
    <header className="company-header"><div className="header-inner">
      <a className="company-logo" href={companyHome(page.language)} aria-label={en ? "SDQ company homepage" : "SDQ — главная страница компании"}>
        <img src="/more/images/image_2026-04-17_13-49-03-photoroom.png" alt="SDQ Management Advisory Group" width="148" height="70" />
      </a>
      <div className="desktop-nav"><Nav page={page} label={en ? "Main navigation" : "Основная навигация"} /></div>
      <a className="header-phone" href={PHONE_HREF}>{PHONE}</a><LanguageLink page={page} />
      <MobileMenu english={en}>
        <Nav page={page} label={en ? "Mobile navigation" : "Мобильная навигация"} />
        <a className="button" href={PHONE_HREF}>{PHONE}</a><a href={`mailto:${EMAIL}`}>{EMAIL}</a>
      </MobileMenu>
    </div>
      <noscript><style>{".mobile-menu{display:none!important}"}</style><div className="no-script-nav"><Nav page={page} label={en ? "Navigation" : "Навигация"} /></div></noscript>
    </header>
    {children}
    <footer className="company-footer"><div className="footer-grid container">
      <div><a className="footer-brand" href={companyHome(page.language)}>SDQ</a><p>MANAGEMENT ADVISORY GROUP</p>
        <p>{en ? "Your reliable partner in business automation. Official 1C partner." : "Ваш надёжный партнёр в автоматизации бизнеса. Официальный партнёр 1С."}</p>
        <a href="/">{en ? "SDQ animated homepage" : "Главная страница SDQ"} →</a>
      </div>
      <nav aria-label={en ? "Company links" : "Разделы компании"}><h2>{en ? "Company" : "Компания"}</h2>
        <ul>{navigation(page.language).map(item => <li key={item.href}><a href={item.href}>{item.label}</a></li>)}</ul>
      </nav>
      <nav aria-label={en ? "Service links" : "Все услуги"}><h2>{en ? "Services" : "Услуги"}</h2>
        <ul>{services.map(item => <li key={item.path}><a href={item.path}>{item.label}</a></li>)}
          <li><a href={AI_ROUTES[page.language]}>{en ? "AI and 1C integration" : "Искусственный интеллект и 1С"}</a></li>
        </ul>
      </nav>
      <div><h2>{en ? "Contacts" : "Контакты"}</h2><address>
        <a href={PHONE_HREF}>{PHONE}</a><a href={`mailto:${EMAIL}`}>{EMAIL}</a>
        <p>{en ? "Tashkent, Yakkasaray district, Abdulla Qahhor street, 1A" : "г. Ташкент, Яккасарайский район, ул. Абдуллы Каххара, 1А"}</p>
      </address></div>
    </div><div className="footer-bottom container">© SDQ Management Advisory Group</div></footer>
  </>;
}
