export const localeOptions = [
  { locale: "uz-Latn", label: "UZ", title: "O‘zbekcha — Lotin" },
  { locale: "uz-Cyrl", label: "ЎЗ", title: "Ўзбекча — Кирилл" },
  { locale: "ru", label: "RU", title: "Русский" },
  { locale: "en", label: "EN", title: "English" },
] as const;

export type Locale = (typeof localeOptions)[number]["locale"];

export const DEFAULT_LOCALE: Locale = "uz-Latn";

export function resolveLocale(
  preferences: readonly string[] | null | undefined,
): Locale {
  for (const preference of preferences ?? []) {
    const normalized = preference.trim().replaceAll("_", "-").toLowerCase();
    if (!normalized) continue;

    const [language, script] = normalized.split("-");
    if (language === "uz") {
      return script === "cyrl" ? "uz-Cyrl" : "uz-Latn";
    }
    if (language === "ru") return "ru";
    if (language === "en") return "en";
  }

  return DEFAULT_LOCALE;
}

type StandardCaption = { headline: string; body: string };
type ContactCaption = { headline: string; action: string };

type CaptionChapter =
  | { kind: "standard"; captions: Record<Locale, StandardCaption> }
  | { kind: "contact"; captions: Record<Locale, ContactCaption> };

export const CONTACT_PHONE_LABEL = "+998 55 588 90 00";
export const CONTACT_PHONE_HREF = "tel:+998555889000";
export const CONTACT_EMAIL = "info@sdq-sfb.com";
export const CONTACT_EMAIL_HREF = `mailto:${CONTACT_EMAIL}`;
// Public company pages are served alongside the film on Cloudflare.
export const CONTACT_HOMEPAGE = "/more/";

export function contactHomepageForLocale(locale: Locale): string {
  // The existing Joomla site has Russian and English pages, but no Uzbek pages.
  return locale === "en" ? `${CONTACT_HOMEPAGE}en/` : CONTACT_HOMEPAGE;
}

export const captionsByChapter: Readonly<
  Partial<Record<number, Readonly<CaptionChapter>>>
> = {
  0: {
    kind: "standard",
    captions: {
      "uz-Latn": {
        headline: "Biznesingizni oldinga siljitamiz.",
        body: "Avval tashkilotingiz qanday ishlashini o‘rganamiz, so‘ng ishni samaraliroq qiladigan amaliy yechimlarni joriy etamiz.",
      },
      "uz-Cyrl": {
        headline: "Бизнесингизни олдинга силжитамиз.",
        body: "Аввал ташкилотингиз қандай ишлашини ўрганамиз, сўнг ишни самаралироқ қиладиган амалий ечимларни жорий этамиз.",
      },
      ru: {
        headline: "Помогаем бизнесу двигаться вперёд.",
        body: "Сначала мы изучаем, как работает ваша организация, а затем создаём практичные системы, которые делают её эффективнее.",
      },
      en: {
        headline: "We keep business moving.",
        body: "We begin by understanding how your organization works, then build practical systems that help it work better.",
      },
    },
  },
  1: {
    kind: "standard",
    captions: {
      "uz-Latn": {
        headline: "Biz — 1C’ning rasmiy hamkorimiz.",
        body: "Biznesingizga mos 1C yechimlarini tanlaymiz, joriy etamiz va har bosqichda qo‘llab-quvvatlaymiz.",
      },
      "uz-Cyrl": {
        headline: "Биз — 1С’нинг расмий ҳамкоримиз.",
        body: "Бизнесингизга мос 1С ечимларини танлаймиз, жорий этамиз ва ҳар босқичда қўллаб-қувватлаймиз.",
      },
      ru: {
        headline: "Мы — официальный партнёр 1С.",
        body: "Подбираем, внедряем и сопровождаем решения 1С, которые подходят именно вашему бизнесу.",
      },
      en: {
        headline: "We are an official 1C partner.",
        body: "We select, implement, and support 1C solutions tailored to the way your business works.",
      },
    },
  },
  2: {
    kind: "standard",
    captions: {
      "uz-Latn": {
        headline: "Ishonchli hamkorlik. Barqaror natijalar.",
        body: "O‘zbekistonning yetakchi tashkilotlari biznes jarayonlarini avtomatlashtirishda bizning tajribamizga tayanadi.",
      },
      "uz-Cyrl": {
        headline: "Ишончли ҳамкорлик. Барқарор натижалар.",
        body: "Ўзбекистоннинг етакчи ташкилотлари бизнес жараёнларини автоматлаштиришда бизнинг тажрибамизга таянади.",
      },
      ru: {
        headline: "Надёжное партнёрство. Устойчивые результаты.",
        body: "Ведущие организации Узбекистана доверяют нашему опыту в автоматизации бизнес-процессов.",
      },
      en: {
        headline: "Trusted partnerships. Lasting results.",
        body: "Leading organizations across Uzbekistan trust our experience in business process automation.",
      },
    },
  },
  3: {
    kind: "standard",
    captions: {
      "uz-Latn": {
        headline: "1C bo‘yicha yordam — doim yoningizda.",
        body: "Mutaxassislarimiz tizimingizni muntazam yangilaydi, sozlaydi va zarur paytda tez yordam beradi.",
      },
      "uz-Cyrl": {
        headline: "1С бўйича ёрдам — доим ёнингизда.",
        body: "Мутахассисларимиз тизимингизни мунтазам янгилайди, созлайди ва зарур пайтда тез ёрдам беради.",
      },
      ru: {
        headline: "Поддержка 1С всегда рядом.",
        body: "Наши специалисты регулярно обновляют и настраивают вашу систему и быстро помогают, когда это необходимо.",
      },
      en: {
        headline: "1C support, whenever you need it.",
        body: "Our specialists keep your system updated and configured, and respond quickly whenever you need help.",
      },
    },
  },
  4: {
    kind: "standard",
    captions: {
      "uz-Latn": {
        headline: "Sun’iy intellekt — amaliy natija.",
        body: "Takroriy ishlarni avtomatlashtirib, ma’lumotlarni tezroq qayta ishlash va aniqroq qaror qabul qilishga yordam beramiz.",
      },
      "uz-Cyrl": {
        headline: "Сунъий интеллект — амалий натижа.",
        body: "Такрорий ишларни автоматлаштириб, маълумотларни тезроқ қайта ишлаш ва аниқроқ қарор қабул қилишга ёрдам берамиз.",
      },
      ru: {
        headline: "ИИ для реальных бизнес-задач.",
        body: "Автоматизируем повторяющиеся задачи, ускоряем обработку данных и помогаем принимать более точные решения.",
      },
      en: {
        headline: "AI for real business needs.",
        body: "We automate repetitive work, process information faster, and help your team make better decisions.",
      },
    },
  },
  5: {
    kind: "contact",
    captions: {
      "uz-Latn": { headline: "Keling, gaplashamiz.", action: "Batafsil" },
      "uz-Cyrl": { headline: "Келинг, гаплашамиз.", action: "Батафсил" },
      ru: { headline: "Давайте обсудим задачу.", action: "Подробнее" },
      en: { headline: "Let’s talk.", action: "See More" },
    },
  },
};
