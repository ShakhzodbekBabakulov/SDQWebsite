export type CompanyLanguage = "ru" | "en";
export type RichNode = {
  tag: "text" | "br" | "p" | "ul" | "ol" | "li" | "strong" | "em" | "heading" | "accent" | "a";
  text?: string;
  href?: string;
  children?: RichNode[];
};
export type ContentBlock = {
  kind: "text" | "feature" | "image" | "actions" | "testimonial" | "contact";
  title?: string;
  href?: string;
  content?: RichNode[];
  image?: { src: string; alt: string; width?: number; height?: number };
  name?: string;
  role?: string;
};
export type ContentColumn = {
  span: number;
  kind: "intro" | "content" | "card" | "contact" | "artwork" | "stats";
  blocks: ContentBlock[];
};
export type CompanyPage = {
  path: string;
  language: CompanyLanguage;
  counterpart: string | null;
  kind: "home" | "page" | "service" | "product";
  label: string;
  title: string;
  description: string;
  primaryTopic: string;
  sections: { eyebrow: string; columns: ContentColumn[] }[];
};
