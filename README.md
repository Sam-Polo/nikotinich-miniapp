# Никотиныч — Telegram Mini App + админ‑панель

Проект для магазина никотиновой продукции в формате **Telegram Mini App** с **веб‑админкой**. Данные каталога и заказов хранятся в **Google Sheets**, медиа — в **S3** (или локально), есть **бот** для Telegram (ссылка на мини‑апп, уведомления/действия по заказам).

## Что внутри

- **Mini App (витрина)**: каталог, избранное, корзина, оформление заказа, профиль/история заказов, контентная лента.
- **Admin (управление)**: товары, категории, бренды, линейки, **модели**, контент, промокоды, заказы, пользователи, аналитика.
- **Bot**: интеграция с Telegram, открытие WebApp, уведомления о заказах/работа с заказами через internal endpoint.

## Ключевые реализации

- **Иерархия каталога**: категория → бренд → линейка → (опционально) модель → товары.
- **Варианты товара (“семейство”)**: группировка вариантов по `family_key` + `flavor` с выбором по `puffs`.
- **Модели**: сущность `models` в Google Sheets и управление в админке; привязка товаров к модели через `model_key`.
- **Логи**: `pino`, время в логах **по МСК**, в `base` добавляется версия приложения (`APP_VERSION`/конфиг).
- **Хранилище**: Google Sheets (`googleapis`) как источник истины для каталога/контента/заказов/настроек.
- **Медиа**: S3 или локальная папка `uploads/`, ресайз/оптимизация через `sharp`.

## Структура репозитория

- `miniapp/frontend/` — React + Vite + TS + Tailwind, Telegram WebApp (`@twa-dev/sdk`)
- `miniapp/backend/` — Node.js (Express) + TS, API мини‑аппа
- `miniapp/bot/` — Node.js + grammY, Telegram bot
- `admin/frontend/` — React + Vite + TS, админ‑панель
- `admin/backend/` — Node.js (Express) + TS, API админки + Sheets + медиа
- `compose.yaml` — запуск всего набора сервисов

## Стек

- **Frontend**: React 18, Vite, TypeScript, Tailwind (miniapp), Zustand, react-router-dom
- **Backend**: Node.js, Express, TypeScript, `tsx` (watch/dev)
- **Telegram**: `@twa-dev/sdk`, grammY (bot)
- **Storage**: Google Sheets API (`googleapis`)
- **Media**: S3 (`@aws-sdk/*`) или local uploads, `sharp`
- **Logging**: pino (время МСК + версия приложения)

## Быстрый старт (Docker Compose)

1) Подготовь переменные окружения.
- заполни `.env` по примеру `.env.example`
- заполни `admin/backend/.env` по примеру `admin/backend/.env.example`

2) Положи сервисный аккаунт Google Sheets:
- файл **не хранится в репозитории**
- для compose ожидается `admin/backend/saa.json` и монтируется в контейнер как `/app/sa.json`

3) Запуск:

```bash
docker compose up -d --build
```

После старта:
- **Admin UI**: `http://localhost:5174`
- **Mini App UI**: `http://localhost:5173`
- **Admin API health**: `http://localhost:4001/health`
- **Miniapp API health**: `http://localhost:4002/health`

## Локальный запуск (без Docker)

### Админка

```bash
cd admin/backend
npm i
npm run dev
```

```bash
cd admin/frontend
npm i
npm run dev
```

Открой `http://localhost:5174`.

### Mini App

```bash
cd miniapp/backend
npm i
npm run dev
```

```bash
cd miniapp/frontend
npm i
npm run dev
```

Открой `http://localhost:5173`.

### Bot (опционально)

```bash
cd miniapp/bot
npm i
npm run dev
```

## Google Sheets

Проект использует Google Sheets как основное хранилище.

- сервисному аккаунту нужно выдать **Editor** доступ к таблице
- `GOOGLE_SHEET_ID` и путь к ключу задаются через env (`GOOGLE_SA_FILE` или JSON)
- основные листы описаны в `admin/MVP_ROADMAP.md`

## Версии и логи

- версия задаётся через `APP_VERSION` (см. `.env.example` и `compose.yaml`)
- логирование на бэкендах идёт через `pino` с таймстампом **по МСК**

## Примечания по безопасности

- не коммить `.env`, `sa.json`/`saa.json`, ключи/токены и любые `credentials*.json` (они уже в `.gitignore`)
- не логируй чувствительные данные (токены/секреты)

