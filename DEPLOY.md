# Деплой на VPS в РФ

Короткий план от пустого сервера до работающего сайта. Требует ~20 минут.

## 1. Провижинг VPS

Рекомендуемые варианты:
- **Selectel** (`selectel.ru`) — тариф от 4 ГБ RAM / 2 vCPU / 40 ГБ SSD
- **Timeweb Cloud** (`timeweb.cloud`) — `Cloud Server` 4 ГБ

Минимум: Ubuntu 24.04, 4 ГБ RAM, 40 ГБ SSD, публичный IPv4. Открой доступ SSH по ключу.

## 2. Подготовь `.env`

Сгенерируй секреты локально:

```bash
openssl rand -hex 32          # COOKIE_SECRET
openssl rand -hex 24          # POSTGRES_PASSWORD
```

Перед деплоем подготовь для `infra/.env`:
- `OPENAI_API_KEY` — из аккаунта OpenAI
- `OPENAI_PROXY_URL` — HTTPS-прокси для выхода на api.openai.com из РФ (Cloudflare, Smartproxy, свой)
- `YOOKASSA_SHOP_ID` и `YOOKASSA_SECRET_KEY` — из кабинета YooKassa
- `YOOKASSA_WEBHOOK_SECRET` — создай в ЮKassa → Интеграция → HTTP-уведомления
- `PUBLIC_WEB_URL` и `PUBLIC_API_URL` — сейчас одинаковые: `http://<vps-ip>` (замени на домен позже)

## 3. Деплой

На VPS (под root):

```bash
apt-get update -y && apt-get install -y git
cd /opt
git clone <ваш-git-remote> resumai
cd resumai
cp infra/.env.example infra/.env
nano infra/.env                     # заполнить ключи
bash infra/deploy.sh
```

Скрипт поставит Docker, настроит firewall, запушит схему Drizzle в Postgres и поднимет весь стек. На выходе — `curl http://<vps-ip>/api/health` должен вернуть `{"ok":true}`.

## 4. Подключение домена

Когда домен будет куплен:

1. Направь A-запись `@` на IP VPS.
2. На VPS отредактируй `infra/.env`: `RESUMAI_DOMAIN=yourdomain.ru` + `PUBLIC_WEB_URL=https://yourdomain.ru`.
3. `cd /opt/resumai/infra && docker compose up -d --force-recreate caddy web api`
4. Caddy автоматически получит Let's Encrypt сертификат.

## 5. YooKassa webhook

В кабинете ЮKassa → Интеграция → HTTP-уведомления:
- URL: `https://yourdomain.ru/api/payments/webhook` (или `http://<ip>/api/payments/webhook` на IP)
- События: `payment.succeeded`

## 6. Мониторинг

```bash
cd /opt/resumai/infra
docker compose ps                # статус сервисов
docker compose logs -f api       # логи Fastify
docker compose logs -f web       # логи Next.js
docker compose logs -f caddy     # логи прокси
```

Проверка здоровья:
```bash
curl -fsS http://<vps-ip>/api/health
curl -fsS http://<vps-ip>/api/credits
```

## 7. Обновление

```bash
cd /opt/resumai
git pull
cd infra
docker compose build --pull
docker compose up -d
# схема БД:
docker compose run --rm api sh -c "cd /app/apps/api && npx drizzle-kit push"
```

## Что проверить перед публичным запуском

- [ ] `/api/health` отвечает 200
- [ ] Генерация на тестовой вакансии hh.ru работает (1 бесплатный кредит)
- [ ] PDF-резюме парсится
- [ ] YooKassa test-mode: создаётся платёж, webhook приходит, кредиты начисляются
- [ ] Caddy отдаёт HTTPS (после домена)
- [ ] `pnpm build` и `docker compose build` завершаются без ошибок
- [ ] Политика конфиденциальности / оферта / 152-ФЗ доступны (стабы в `/legal/*` — дописать)
