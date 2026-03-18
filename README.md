# Никотиныч — Telegram Mini App + админ‑панель

Проект для магазина никотиновой продукции в формате **Telegram Mini App** с **веб‑админкой**. Данные каталога и заказов хранятся в **Google Sheets**, медиа — в **S3** (или локально), есть **бот** для Telegram (ссылка на мини‑апп, уведомления/действия по заказам).

## Главные компоненты

**Mini App (витрина)**: каталог, избранное, корзина, оформление заказа, профиль/история заказов, контентная лента.
**Admin (управление)**: товары, категории, бренды, линейки, **модели**, контент, промокоды, заказы, пользователи, аналитика.
**Bot**: интеграция с Telegram, открытие WebApp, уведомления о заказах/работа с заказами через internal endpoint.

## Ключевые реализации

- **Иерархия каталога**: категория → бренд → линейка → (опционально) модель → товары.
- **Варианты товара (“семейство”)**: группировка вариантов по `family_key` + `flavor` с выбором по `puffs`.
- **Модели**: сущность `models` в Google Sheets и управление в админке; привязка товаров к модели через `model_key`.
- **Логи**: `pino`, время в логах **по МСК**, в `base` добавляется версия приложения (`APP_VERSION`/конфиг).
- **Хранилище**: Google Sheets (`googleapis`) как источник истины для каталога/контента/заказов/настроек.
- **Медиа**: S3 или локальная папка `uploads/`, ресайз/оптимизация через `sharp`.

## Структура

`miniapp/frontend/` — React + Vite + TS + Tailwind, Telegram WebApp (`@twa-dev/sdk`)
`miniapp/backend/` — Node.js (Express) + TS, API мини‑аппа
`miniapp/bot/` — Node.js + grammY, Telegram bot
`admin/frontend/` — React + Vite + TS, админ‑панель
`admin/backend/` — Node.js (Express) + TS, API админки + Sheets + медиа
`compose.yaml` — запуск всего набора сервисов

## Стек

**Frontend**: React 18, Vite, TypeScript, Tailwind, Zustand, react-router-dom
**Backend**: Node.js, Express, TypeScript, `tsx` (watch/dev)
**Telegram**: `@twa-dev/sdk`, grammY
**Storage**: Google Sheets API (`googleapis`)
**Media**: S3 (`@aws-sdk/*`) или local uploads, `sharp`
**Logging**: pino (время МСК + версия приложения)

## Старт Docker Compose

`.env` по примеру `.env.example`
`admin/backend/.env` по примеру `admin/backend/.env.example`
для compose ожидается `admin/backend/saa.json` и монтируется в контейнер как `/app/sa.json`

Запуск:

```bash
docker compose up -d --build
```

После старта:
**Admin UI**: `http://localhost:5174`
**Mini App UI**: `http://localhost:5173`
**Admin API health**: `http://localhost:4001/health`
**Miniapp API health**: `http://localhost:4002/health`

