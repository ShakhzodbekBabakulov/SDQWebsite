import type { CompanyPage, RichNode } from "./company-types.ts";

const paragraph = (text: string): RichNode => ({ tag: "p", children: [{ tag: "text", text }] });
const heading = (text: string): RichNode => ({ tag: "heading", children: [{ tag: "text", text }] });
export const AI_ROUTES = {
  ru: "/more/uslugi/iskusstvennyj-intellekt-1c/",
  en: "/more/en/services/ai-1c-integration/",
};

export const aiServices: CompanyPage[] = [
  {
    path: AI_ROUTES.ru, language: "ru", counterpart: AI_ROUTES.en, kind: "service",
    label: "Искусственный интеллект и 1С",
    title: "Искусственный интеллект 1С — интеграция ИИ с 1С | SDQ",
    description: "Заказные проекты интеграции ИИ с 1С от SDQ в Узбекистане: изучение задачи, оценка реализуемости, согласование объёма, внедрение, тестирование и поддержка.",
    primaryTopic: "Искусственный интеллект 1С; ИИ для 1С; интеграция ИИ с 1С",
    sections: [
      { eyebrow: "ИИ И АВТОМАТИЗАЦИЯ", columns: [
        { span: 8, kind: "content", blocks: [{ kind: "text", content: [
          heading("Искусственный интеллект и 1С: интеграция под задачи вашего бизнеса"),
          paragraph("SDQ выполняет заказные проекты интеграции ИИ с 1С. Начинаем с бизнес-задачи: изучаем текущий процесс, используемую конфигурацию 1С и доступные данные, затем оцениваем техническую реализуемость решения."),
          paragraph("ИИ для 1С подбирается в рамках конкретного проекта. Объём работ, требования к данным, ограничения доступа и критерии приёмки согласовываются до внедрения. Стоимость и сроки определяются после оценки задачи."),
        ] }] },
        { span: 4, kind: "contact", blocks: [{ kind: "contact" }] },
      ] },
      { eyebrow: "ЭТАПЫ ПРОЕКТА", columns: [
        { span: 12, kind: "intro", blocks: [{ kind: "text", content: [heading("Как проходит интеграция ИИ с 1С")] }] },
        ...[
          ["01. Изучение задачи", "Обсуждаем процесс, пользователей, источники данных и ожидаемый результат. Определяем, где применение искусственного интеллекта целесообразно."],
          ["02. Оценка реализуемости", "Проверяем возможности конфигурации 1С, доступность данных и технические ограничения. Уточняем требования к безопасности и участию сотрудников."],
          ["03. Согласование объёма", "Фиксируем состав работ, границы интеграции, ответственность сторон и критерии приёмки. Согласовываем этапы, стоимость и сроки."],
          ["04. Реализация и тестирование", "Разрабатываем согласованное решение и проверяем обмен данными, права доступа и поведение на согласованных сценариях. Результаты оцениваются по критериям приёмки."],
          ["05. Запуск", "Согласовываем порядок перехода в рабочую среду, проверяем готовность пользователей и сопровождаем запуск."],
          ["06. Поддержка", "Определяем порядок поддержки и дальнейших изменений. Новые задачи и расширение функциональности оцениваются и согласовываются отдельно."],
        ].map(([title, text]) => ({ span: 4, kind: "card" as const, blocks: [{ kind: "feature" as const, title, content: [paragraph(text)] }] })),
      ] },
      { eyebrow: "ОБСУДИМ ВАШУ ЗАДАЧУ", columns: [{ span: 12, kind: "content", blocks: [{ kind: "text", content: [
        heading("Что подготовить для первого разговора"),
        paragraph("Расскажите, какую конфигурацию 1С вы используете, какой процесс хотите изменить и какие данные доступны. Это поможет определить следующий шаг и необходимость дополнительного обследования."),
        paragraph("Результат зависит от согласованной задачи, качества данных и технических ограничений. Мы обсуждаем эти условия на этапе оценки проекта."),
      ] }] }] },
    ],
  },
  {
    path: AI_ROUTES.en, language: "en", counterpart: AI_ROUTES.ru, kind: "service",
    label: "AI and 1C integration",
    title: "Custom AI and 1C Integration in Uzbekistan | SDQ",
    description: "Custom AI and 1C integration projects by SDQ: discovery, feasibility assessment, agreed implementation scope, testing, rollout and support in Uzbekistan.",
    primaryTopic: "AI and 1C integration; custom AI for 1C in Uzbekistan",
    sections: [
      { eyebrow: "AI AND AUTOMATION", columns: [
        { span: 8, kind: "content", blocks: [{ kind: "text", content: [
          heading("AI and 1C integration for your business needs"),
          paragraph("SDQ delivers custom AI and 1C integration projects. We start with your business need: reviewing the current process, your 1C configuration and available data before assessing technical feasibility."),
          paragraph("AI for 1C is selected for the individual project. The scope, data requirements, access restrictions and acceptance criteria are agreed before implementation. Cost and timelines are determined after assessment."),
        ] }] },
        { span: 4, kind: "contact", blocks: [{ kind: "contact" }] },
      ] },
      { eyebrow: "PROJECT STAGES", columns: [
        { span: 12, kind: "intro", blocks: [{ kind: "text", content: [heading("How AI and 1C integration works")] }] },
        ...[
          ["01. Discovery", "We discuss the process, users, data sources and intended outcome, identifying where artificial intelligence could be useful."],
          ["02. Feasibility assessment", "We review the 1C configuration, available data and technical constraints, clarifying security requirements and staff involvement."],
          ["03. Agreed scope", "We document the work, integration boundaries, responsibilities and acceptance criteria, then agree the stages, cost and timeline."],
          ["04. Implementation and testing", "We develop the agreed solution and test data exchange, access permissions and behaviour against agreed scenarios and acceptance criteria."],
          ["05. Rollout", "We agree the move to the working environment, check user readiness and support the launch."],
          ["06. Support", "We agree support arrangements and the process for future changes. Additional tasks and functionality are assessed and agreed separately."],
        ].map(([title, text]) => ({ span: 4, kind: "card" as const, blocks: [{ kind: "feature" as const, title, content: [paragraph(text)] }] })),
      ] },
      { eyebrow: "DISCUSS YOUR PROJECT", columns: [{ span: 12, kind: "content", blocks: [{ kind: "text", content: [
        heading("What to prepare for our first conversation"),
        paragraph("Tell us which 1C configuration you use, which process you want to change and what data is available. This helps determine the next step and whether further discovery is needed."),
        paragraph("Outcomes depend on the agreed task, data quality and technical constraints. We discuss these conditions during project assessment."),
      ] }] }] },
    ],
  },
];
