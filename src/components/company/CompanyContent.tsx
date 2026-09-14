/* eslint-disable @next/next/no-img-element -- Local artwork keeps its aspect ratio in static output. */
import { Fragment } from "react";
import type { CompanyPage, ContentBlock, RichNode } from "@/content/company-types";
import { breadcrumbs, relatedAI } from "@/content/site";
import { ContactPanel } from "./CompanyShell";

function firstHeading(page: CompanyPage) {
  for (const section of page.sections) for (const column of section.columns) for (const block of column.blocks) {
    const node = block.content?.find(node => node.tag === "heading");
    if (node) return node;
  }
}
function Text({ text }: { text: string }) {
  const pattern = /([\w.+-]+@[\w.-]+\.[a-z]{2,}|(?:\+998[ -]?)?\d{2}[ -]\d{3}[ -]\d{2}[ -]\d{2}|\d{2}-\d{3}-\d{4})/gi;
  return <>{text.split(pattern).map((part, index) => {
    if (part.includes("@")) return <a key={index} href={`mailto:${part}`}>{part}</a>;
    const digits = part.replace(/\D/g, "");
    if (/^[+\d]/.test(part) && (digits.length === 9 || digits.length === 12)) return <a key={index} href={`tel:+${digits.length === 9 ? "998" : ""}${digits}`}>{part}</a>;
    return part;
  })}</>;
}
function RichText({ nodes, primary, level = 2, linked = false }: { nodes: RichNode[]; primary?: RichNode; level?: 2 | 3; linked?: boolean }) {
  return <>{nodes.map((node, i) => {
    const children = <RichText nodes={node.children || []} primary={primary} level={level} linked={linked || node.tag === "a"} />;
    switch (node.tag) {
      case "text": return <Fragment key={i}>{linked ? node.text : <Text text={node.text || ""} />}{" "}</Fragment>;
      case "br": return <br key={i} />;
      case "accent": return <span key={i} className="heading-accent">{children}</span>;
      case "heading": {
        const Heading = node === primary ? "h1" : level === 3 ? "h3" : "h2";
        return <Heading key={i}>{children}</Heading>;
      }
      case "a": return <a key={i} href={node.href}>{children}</a>;
      default: { const Tag = node.tag; return <Tag key={i}>{children}</Tag>; }
    }
  })}</>;
}
function Block({ block, page, primary, level, statistic }: {
  block: ContentBlock; page: CompanyPage; primary?: RichNode; level: 2 | 3; statistic: boolean;
}) {
  const content = <RichText nodes={block.content || []} primary={primary} level={level} />;
  const image = block.image && <img className="content-image" src={block.image.src} alt={block.image.alt}
    width={block.image.width} height={block.image.height} loading="lazy" />;
  if (block.kind === "contact") return <ContactPanel language={page.language} />;
  if (block.kind === "image") return image;
  if (block.kind === "actions") return <div className="actions">{content}</div>;
  if (block.kind === "testimonial") return <figure className="testimonial"><blockquote>{content}</blockquote><figcaption>{image}<span><strong>{block.name}</strong><br />{block.role}</span></figcaption></figure>;
  if (block.kind === "feature") {
    const title = block.href ? <a href={block.href}>{block.title}</a> : block.title;
    const substantial = !!block.content?.length;
    const Heading = level === 3 ? "h3" : "h2";
    return <div className={statistic ? "statistic" : substantial ? "feature" : "feature-point"}>
      {image}
      {statistic ? <p className="stat-value">{title}</p> : substantial ? <Heading>{title}</Heading> : <p><span aria-hidden="true">✓ </span>{title}</p>}
      {content}
    </div>;
  }
  return <div className="prose">{content}</div>;
}
export function CompanyContent({ page }: { page: CompanyPage }) {
  const primary = firstHeading(page);
  const ai = relatedAI(page);
  return <main id="company-content" className={`company-main template-${page.kind}`}>
    <nav className="breadcrumbs container" aria-label={page.language === "en" ? "Breadcrumbs" : "Хлебные крошки"}>
      <ol>{breadcrumbs(page).map((item, i, all) => <li key={item.href}>
        {i === all.length - 1 ? <span aria-current="page">{item.label}</span> : <a href={item.href}>{item.label}</a>}
      </li>)}</ol>
    </nav>
    {!primary && <div className="container"><h1>{page.label}</h1></div>}
    {page.sections.map((section, index) => <section key={index} className={`company-section ${index === 0 ? "first-section" : ""}`}>
      <div className="container">
        {section.eyebrow && <p className="eyebrow">{section.eyebrow}</p>}
        <div className="content-grid">{section.columns.map((column, ci) => <div key={ci}
          className={`column column-${column.kind} span-${column.span}`}>
          {column.blocks.map((block, bi) => <Block key={bi} block={block} page={page} primary={primary}
            level={column.kind === "card" && !(index === 0 && page.kind !== "home") ? 3 : 2} statistic={column.kind === "stats"} />)}
        </div>)}</div>
      </div>
    </section>)}
    {ai && <section className="company-section"><div className="container ai-related">
      <div><p className="eyebrow">{page.language === "en" ? "CUSTOM PROJECTS" : "ЗАКАЗНЫЕ ПРОЕКТЫ"}</p>
        <h2><a href={ai.path}>{ai.label}</a></h2><p>{ai.description}</p>
      </div><a className="button" href={ai.path}>{page.language === "en" ? "Explore the service" : "Подробнее об услуге"} →</a>
    </div></section>}
  </main>;
}
