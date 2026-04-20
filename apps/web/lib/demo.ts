import type { GenerateResult } from '@resumai/shared';

/**
 * Demo result shown on /result/demo. Covers every v3.0 enrichment field
 * so the static demo page matches what production returns.
 */
export const DEMO_RESULT: GenerateResult = {
  resultId: 'demo',
  kind: 'full',
  creditsRemaining: 0,
  model: 'gpt-4o',
  tokensUsed: 0,
  durationMs: 0,
  profileSnapshot:
    'Сильный Senior Frontend с релевантным стеком, но позиционирование размытое — резюме читается как generic, а не как «построил платформу с MAU 100k+».',
  recruiterInnerMonologue:
    'Так, React + TypeScript — ок. 4 года — мало для Senior, но опыт с Ozon и маркетплейсом компенсирует. Смущает, что нет явного ownership: просто «участвовал». Я бы вызвал на интервью, но вопросы будут жёсткие.',
  targetPositioning:
    'Senior Frontend с опытом high-load маркетплейсов (100k+ MAU), который отвечает за метрики загрузки и рост команды. Не «умеет React» — а «держит LCP ниже 2 с и растит мидлов».',
  recruiterHook: 'Senior Frontend: снизил LCP маркетплейса с 4,2 до 1,6 с, вырастил 3 мидла за год.',
  codeWord: null,
  coverageScore: 72,
  interviewProbability: {
    value: 58,
    explanation: 'Хороший стек и масштаб, но слабый ownership-сигнал и нет метрик роста команды.',
  },
  signals: [
    { keyword: 'React', type: 'must_have', layer: 'hard_skill', coverage: 95 },
    { keyword: 'TypeScript', type: 'must_have', layer: 'hard_skill', coverage: 60 },
    { keyword: 'Next.js', type: 'should_have', layer: 'tool', coverage: 40 },
    { keyword: 'Менторинг Middle', type: 'should_have', layer: 'soft', coverage: 30 },
    { keyword: 'High-load / >100k MAU', type: 'must_have', layer: 'domain', coverage: 85 },
    { keyword: 'Core Web Vitals', type: 'should_have', layer: 'metric', coverage: 55 },
    { keyword: 'A/B-тесты', type: 'nice_to_have', layer: 'tool', coverage: 20 },
    { keyword: 'GraphQL', type: 'nice_to_have', layer: 'hard_skill', coverage: 10 },
    { keyword: 'Английский B2+', type: 'should_have', layer: 'credential', coverage: 80 },
    { keyword: 'Ownership end-to-end', type: 'must_have', layer: 'hidden', coverage: 35 },
  ],
  redFlags: [
    'В опыте нет слова TypeScript отдельно — только в общем списке навыков.',
    'Формулировки «участвовал в разработке» — рекрутёр не видит личного вклада.',
    'Нет измеримых результатов по росту команды.',
  ],
  greenFlags: [
    'Опыт с маркетплейсом на 100k+ MAU — совпадает с вакансией.',
    'Точная цифра по LCP (4,2 → 1,6 с) — сразу видно результат.',
    'Английский B2 подтверждён сертификатом.',
  ],
  rejectionRisks: [
    {
      risk: 'Ownership не виден в резюме — кажется исполнителем, а не Senior.',
      severity: 'critical',
      mitigation:
        'Переписать топ-3 буллета последнего места через «я» + результат в цифрах: «спроектировал», «довёл до прода», «выкатил».',
    },
    {
      risk: 'Нет TypeScript в явных проектах, только в «навыках».',
      severity: 'high',
      mitigation:
        'Добавить 1 буллет: «Перевёл legacy-часть (80k строк) на TypeScript — сократил runtime-ошибки на 32%».',
    },
    {
      risk: 'Менторинг команды выглядит как строчка, а не как ownership.',
      severity: 'medium',
      mitigation:
        'Переформулировать: «Менторил 5 фронтендеров, 3 выросли до Middle за 8 месяцев» + ссылка на пример 1:1 шаблона в заметках.',
    },
  ],
  gaps: [
    {
      title: 'Заголовок резюме размыт — ATS не подтягивает по high-load',
      category: 'positioning',
      priority: 'high',
      impactLayer: 'ats',
      rationale:
        'Сейчас «Frontend-разработчик». Вакансия — Senior Frontend в маркетплейс. ATS hh.ru не матчит без слов «Senior» и «high-load / маркетплейс» — резюме тонет в общей выдаче.',
      suggestedBullet:
        'Senior Frontend-разработчик · маркетплейсы (MAU 100k+) · LCP 1,6 с · React 18 + TypeScript',
      beforeAfter: {
        before: 'Заголовок: «Frontend-разработчик»',
        after:
          'Заголовок: «Senior Frontend · маркетплейсы (MAU 100k+) · LCP 1,6 с · React 18 + TypeScript»',
      },
      howToApply: 'в поле «Желаемая должность» на hh.ru, первая строка резюме',
    },
    {
      title: 'Формулировки «участвовал в разработке» гасят ownership',
      category: 'achievements',
      priority: 'high',
      impactLayer: 'hiring_manager',
      rationale:
        'Нанимающий читает «участвовал» как «помогал другим». Для Senior критично показать личное решение и доведение до прода.',
      suggestedBullet:
        'Спроектировал и запустил новую корзину маркетплейса: 18 экранов, покрытие тестами 72%, конверсия в оплату +11% за квартал',
      beforeAfter: {
        before: 'Участвовал в разработке корзины маркетплейса',
        after:
          'Спроектировал и запустил новую корзину маркетплейса: 18 экранов, покрытие тестами 72%, конверсия в оплату +11% за квартал',
      },
      howToApply: 'блок «Опыт», место 1, заменить первый буллет',
    },
    {
      title: 'TypeScript только в «навыках» — ATS видит слабый сигнал',
      category: 'ats',
      priority: 'high',
      impactLayer: 'ats',
      rationale:
        'Рекрутёр уверен в TypeScript, только если он в описании опыта. Без него скрининг даёт 40% coverage, а вакансия требует must-have.',
      suggestedBullet:
        'Перевёл legacy-часть клиента (~80k строк) на TypeScript strict: сократил runtime-ошибки на 32%, ускорил онбординг новых разработчиков',
      beforeAfter: {
        before: 'TypeScript упомянут только в списке навыков',
        after:
          'В опыте: «Перевёл legacy (~80k строк) на TypeScript strict: −32% runtime-ошибок»',
      },
      howToApply: 'блок «Опыт», место 1, добавить 2-м буллетом',
    },
    {
      title: 'Менторинг звучит декларативно, без цифр',
      category: 'credibility',
      priority: 'medium',
      impactLayer: 'hiring_manager',
      rationale:
        'Senior-вакансии отсеивают кандидатов, у которых нет измеримого роста мидлов. «Менторил команду» без цифр читается как «иногда помогал».',
      suggestedBullet:
        'Менторил команду из 5 фронтендеров: выстроил процесс 1:1 и код-ревью, 3 человека выросли до Middle за 8 месяцев',
      beforeAfter: {
        before: 'Менторил команду фронтенд-разработчиков',
        after:
          'Менторил команду из 5 фронтендеров: 1:1 + код-ревью; 3 из них выросли до Middle за 8 месяцев',
      },
      howToApply: 'блок «Опыт», место 1, добавить 3-м буллетом',
    },
    {
      title: 'Метрики производительности скрыты — добавить LCP/INP в опыт',
      category: 'achievements',
      priority: 'medium',
      impactLayer: 'recruiter',
      rationale:
        'Core Web Vitals — прямой сигнал Senior-уровня. Цифры LCP и INP в опыте поднимают короткий скан рекрутёра с «скип» в «интервью».',
      suggestedBullet:
        'Оптимизировал главную маркетплейса: LCP 4,2 → 1,6 с, INP 520 → 190 мс через code-splitting, критический CSS и ленивую гидратацию',
      beforeAfter: {
        before: 'Оптимизировал производительность SPA',
        after:
          'LCP 4,2 → 1,6 с, INP 520 → 190 мс через code-splitting, критический CSS и ленивую гидратацию',
      },
      howToApply: 'блок «Опыт», место 1, последний буллет',
    },
    {
      title: 'Блок «О себе» не продаёт — переписать под позиционирование',
      category: 'positioning',
      priority: 'medium',
      impactLayer: 'recruiter',
      rationale:
        'Сейчас там общие слова. За 7 секунд рекрутёр не видит специализацию и уровень — нужен 2-строчный питч, который сразу продаёт.',
      suggestedBullet:
        'Senior Frontend с 4+ годами в маркетплейсах. Держу LCP ниже 2 с, запускаю фичи end-to-end, менторю 3–5 человек. Ищу команду, где можно отвечать за метрики и качество.',
      beforeAfter: {
        before:
          '«Целеустремлённый фронтенд-разработчик с опытом работы в крупных проектах»',
        after:
          '«Senior Frontend с 4+ годами в маркетплейсах. Держу LCP ниже 2 с, запускаю фичи end-to-end, менторю 3–5 человек»',
      },
      howToApply: 'раздел «О себе», полная замена',
    },
    {
      title: 'Нет Next.js в явных проектах — добавить, где уместно',
      category: 'skills',
      priority: 'medium',
      impactLayer: 'ats',
      rationale:
        'Вакансия отмечает Next.js как should-have. Без упоминания в опыте ATS даёт только 40% coverage по стеку.',
      suggestedBullet:
        'Перевёл витрину на Next.js 14 App Router + React Server Components — сократил JS-бандл клиента на 38%',
      beforeAfter: {
        before: 'Next.js только в списке навыков',
        after:
          'В опыте: «Перевёл витрину на Next.js 14 App Router + RSC — JS-бандл −38%»',
      },
      howToApply: 'блок «Опыт», предпоследнее место, 2-м буллетом',
    },
    {
      title: 'Нет A/B-тестов — упущенный сигнал продуктового мышления',
      category: 'skills',
      priority: 'low',
      impactLayer: 'hiring_manager',
      rationale:
        'Маркетплейсы ждут от Senior Frontend участия в продуктовых экспериментах. Даже небольшой факт повышает восприятие уровня.',
      suggestedBullet:
        'Внедрил фронтенд-часть для 6 A/B-тестов через GrowthBook: +4,3 п.п. к конверсии корзины',
      beforeAfter: {
        before: 'A/B-тесты не упоминаются',
        after:
          'В опыте: «6 A/B-тестов во фронтенде через GrowthBook: +4,3 п.п. к конверсии»',
      },
      howToApply: 'блок «Опыт», место 1, 4-м буллетом',
    },
  ],
  matches: [
    {
      title: '4+ года разработки на React в продуктовой команде',
      detail: 'Соответствует грейду Senior и профилю маркетплейса.',
      howToHighlight:
        '«4 года строил фронтенд маркетплейсов на React 18 и TypeScript — от 10k до 140k DAU»',
      leverage: 'Поднимите в резюме выше, вынесите в заголовок и в первую строку «О себе».',
      score: 94,
    },
    {
      title: 'Опыт в системе на 100k+ MAU',
      detail: 'Точное попадание в требование high-load в вакансии.',
      howToHighlight:
        '«Держу стабильность клиента маркетплейса с 140k DAU: LCP 1,6 с при 18 фичах/квартал»',
      leverage:
        'Добавьте в этот буллет цифру INP и пиковую нагрузку (RPS клиентских запросов) — это редкий сигнал.',
      score: 88,
    },
    {
      title: 'Снижение LCP с 4,2 до 1,6 с — релевантный кейс',
      detail: 'Вакансия ставит Web Vitals ключевой задачей. У вас готовый кейс с цифрами.',
      howToHighlight:
        '«Снизил LCP главной с 4,2 до 1,6 с за квартал — сочетание code-splitting, critical CSS и RSC»',
      leverage:
        'Добавьте ссылку на PR или статью — внешнее доказательство поднимает вес кейса для нанимающего.',
      score: 85,
    },
    {
      title: 'Английский B2 подтверждён',
      detail: 'В вакансии команда международная, знание обязательно.',
      howToHighlight:
        '«B2 English — вёл 1:1 с tech lead из Берлина и писал ADR на английском полгода»',
      leverage:
        'Добавьте пример письменной коммуникации (ADR / RFC) — это сильнее разговорного.',
      score: 82,
    },
    {
      title: 'Менторинг 5 человек',
      detail: 'Senior-роль требует подтягивать мидлов и ставить процесс ревью.',
      howToHighlight:
        '«Менторил 5 фронтендеров; выстроил 1:1 и шаблон код-ревью — 3 выросли до Middle за 8 месяцев»',
      leverage: 'Добавьте конкретику по результатам роста и ссылку на шаблон 1:1 — редкий артефакт.',
      score: 78,
    },
    {
      title: 'Опыт в крупном бренде (Ozon)',
      detail: 'Известная компания — сигнал качества скрининга, который выше среднего.',
      howToHighlight:
        '«Последние 2 года отвечал за корзину Ozon маркетплейса (140k DAU, 18 фичей/квартал)»',
      leverage: 'Перенесите это место в самый верх блока «Опыт».',
      score: 76,
    },
  ],
  responseStrategy: {
    safe: {
      description:
        'Отправьте резюме с лёгкой доработкой — заголовок и «О себе». Этого хватит, чтобы пройти ATS и попасть в стек рекрутёра.',
      interviewProbability: 45,
      whenToUse: 'Если вакансия активна давно и нужен быстрый отклик.',
    },
    bold: {
      description:
        'Перепишите топ-3 буллета опыта под ownership + добавьте LCP/TypeScript. Отклик сильнее и на интервью придёте с готовыми кейсами.',
      interviewProbability: 62,
      whenToUse: 'Если есть 30–40 минут на правку и вакансия приоритетная.',
    },
    stretch: {
      description:
        'Добавьте кейс с A/B-тестами и Next.js App Router, переупакуйте резюме в 2 уровня: Senior / Team Lead — откликнитесь сразу на обе ступени в компании.',
      interviewProbability: 32,
      whenToUse: 'Если целитесь в рост грейда и готовы защищать это на интервью.',
    },
  },
  previewCoverLetter:
    'Вижу, вы растите маркетплейс и ищете Senior Frontend, который держит Core Web Vitals и тащит команду. Это моя зона: последние 2 года я отвечаю за клиент маркетплейса на 140k DAU и держу LCP 1,6 с.',
  coverLetter: `Вижу, вы растите маркетплейс и ищете Senior Frontend, который держит Core Web Vitals и тащит команду. Это моя зона: последние 2 года я отвечаю за клиент маркетплейса на 140k DAU и держу LCP 1,6 с.

В Ozon я спроектировал и запустил новую корзину: 18 экранов, покрытие тестами 72%, конверсия в оплату выросла на 11% за квартал. Параллельно менторил 5 фронтендеров — трое выросли до Middle за 8 месяцев. Мне важно, чтобы команда тянула ответственность сама, и я умею это выстраивать через 1:1 и шаблон ревью.

Готов показать кейсы по оптимизации и процесс менторинга. Удобно 15 минут созвониться на этой неделе во второй половине дня?

С уважением,
Алексей К.`,
};
