# ResumAI

AI-сервис адаптации резюме под вакансии hh.ru. Вставляешь ссылку или PDF резюме + ссылку вакансии — получаешь за 2 минуты адаптированное резюме и сопроводительное письмо.

**Стек:** Next.js 16 + React 19 + Tailwind 4 + shadcn/ui base-nova · Fastify 5 + Drizzle + PostgreSQL + Redis · OpenAI GPT-4o (proxy) · YooKassa

## Структура

```
resumai/
├── apps/
│   ├── web/      # Next.js 16 фронт
│   └── api/      # Fastify API
├── packages/
│   └── shared/   # общие типы
└── infra/        # Docker, Caddy, deploy
```

## Быстрый старт (локально)

```bash
pnpm install
cp .env.example .env            # заполнить ключи
docker compose -f infra/compose.dev.yml up -d postgres redis
pnpm dev                        # web:3000 + api:4000
```

## Деплой

Смотри `infra/deploy.sh` и `~/.claude/plans/hidden-hatching-muffin.md`.

## Документация

PRD: `/Users/yannovak/Downloads/AI Resume Adaptation Service for hh.ru Job Applications/`  
План реализации: `~/.claude/plans/hidden-hatching-muffin.md`
