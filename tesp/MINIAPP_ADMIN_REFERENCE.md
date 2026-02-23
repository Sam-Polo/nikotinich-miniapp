# Справка по админке для разработки мини-приложения

Документ содержит контракты API, структуры данных и правила, нужные для проектирования и разработки мини-приложения. Админка и мини-апп используют один бэкенд (или общий API).

---

## 1. Базовый URL и авторизация

- **Бэкенд админки**: `PORT=4001`, переменная `VITE_API_URL` во фронте (по умолчанию `http://localhost:4001`).
- **Админка**: все запросы (кроме логина и, при необходимости, части публичных) с заголовком `Authorization: Bearer <token>`. Токен выдаётся `POST /api/auth/login` (логин/пароль из env), хранится во фронте.
- **Мини-апп**: предполагается отдельная схема авторизации (например, по Telegram/мини-апп). Эндпоинты, которые будет вызывать мини-апп, могут быть без админского токена (см. ниже).

---

## 2. API-эндпоинты (актуальные для мини-аппа)

### 2.1 Публичные / для мини-аппа (без админ-токена или с отдельным механизмом)

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/content` | Лента контента (новости + подборки), порядок по полю `sort`. Сейчас за защищённым роутом — для мини-аппа нужен публичный GET или прокси. |
| POST | `/api/visits` | Фиксация посещения. Body: `{ "userId": "telegram_id или иной id" }`. Без авторизации. |
| GET | Настройки доставки/рефералки | Сейчас только через `GET /api/settings/orders-status` (с токеном). Для мини-аппа: публичный GET или дублирующий роут. |

### 2.2 Товары и каталог (скорее всего через отдельный бэкенд мини-аппа или публичный роут)

- Товары хранятся в Google Sheets по листам-категориям; админка читает через `fetchProductsFromSheet` (внутренний API).
- Для мини-аппа нужен хотя бы: **список категорий** → **товары по категории** (или общий список с фильтром). Сейчас: `GET /api/products?search=...` (с токеном), `GET /api/categories`, `GET /api/brands?category_key=`, `GET /api/lines?brand_key=` — все с `requireAuth`. Имеет смысл вынести публичные GET для каталога/ленты/настроек.

### 2.3 Пользователи (регистрация / профиль)

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/users` | Список пользователей (админка). |
| POST | `/api/users` | Создание пользователя. Body: `telegram_id`, `username`, `email?`, `phone?`, `role`, `active`; опционально `referrer_id` (telegram_id того, кто привёл). |
| PUT | `/api/users` | Обновление. Body: `telegram_id` + поля для обновления (`username`, `email`, `phone`, `role`, `active`, `referrer_id`, `referral_balance_rub`). |

Для мини-аппа: при первом входе по реферальной ссылке вызывать создание/обновление пользователя с `referrer_id`.

### 2.4 Заказы

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/orders` | Список заказов. Query: `user_id`, `status`, `limit` (по умолчанию 20), `offset`. Ответ: `{ orders, total }`. |
| POST | `/api/orders` | Создание заказа. Body см. ниже. |
| PUT | `/api/orders/:id/status` | Смена статуса. Body: `{ "status": "new" | "confirmed" | "packed" | "completed" | "cancelled" }`. При переходе в `confirmed` бэкенд автоматически начисляет реф. бонус. |

### 2.5 Настройки

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/settings/orders-status` | Настройки: доставка и реферальные проценты. |
| PUT | `/api/settings/orders-status` | Сохранение (админка). |

### 2.6 Аналитика (админка)

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/analytics/visits-stats?period=7d|30d|all` | Уникальные пользователи за период и за всё время. |

---

## 3. Структуры данных

### 3.1 Order (заказ)

```ts
OrderStatus = 'new' | 'confirmed' | 'packed' | 'completed' | 'cancelled'

OrderItem = { slug: string; qty: number; title?: string; priceRub?: number }

Order = {
  id: string
  userId?: string           // telegram_id покупателя
  customerName: string
  phone?: string
  address?: string
  items: OrderItem[]
  totalRub: number
  promoCode?: string
  deliveryFee: number
  status: OrderStatus
  createdAt: string        // ISO
  confirmedAt?: string    // ISO, при status confirmed
  note?: string
  referralBonusAccrued?: boolean  // внутреннее, не обязательно в API мини-аппа
}
```

**Создание заказа (POST body):** `customerName`, `items` (массив `{ slug, qty, title?, priceRub? }`) обязательны; опционально: `userId`, `phone`, `address`, `totalRub`, `promoCode`, `deliveryFee`, `note`.

### 3.2 User (пользователь мини-аппа)

```ts
User = {
  telegram_id: string
  username: string
  email: string
  phone: string
  role: string
  active: boolean
  referrer_id?: string       // telegram_id того, кто привёл
  referral_balance_rub?: number
}
```

### 3.3 ContentItem (лента: новости и подборки)

```ts
ContentItemType = 'news' | 'collection'

ContentItem = {
  id: string
  type: ContentItemType
  title: string
  body?: string
  imageUrl?: string
  publishedAt?: string
  active: boolean
  sort: number
  productSlugs: string[]   // только для type === 'collection'
}
```

Вывод в мини-аппе: сортировка по `sort`, фильтр по `active === true`.

### 3.4 Product (товар, из sheets)

```ts
SheetProduct = {
  slug: string
  title: string
  description?: string
  category: string
  categories: string[]
  price_rub: number
  discount_price_rub?: number
  images: string[]
  active: boolean
  stock?: number
  article?: string
  brand?: string
  line?: string
  strength?: string
  image_keys?: string[]
  orderInCategory?: Record<string, number>
}
```

Цена к отображению: `discount_price_rub ?? price_rub`.

### 3.5 Настройки заказов (settings)

```ts
OrdersSettings = {
  deliveryFee: number
  freeDeliveryFrom: number
  referralPercentBefore10: number
  referralPercentAfter10: number
}
```

- Доставка: `deliveryFee` ₽, при сумме заказа ≥ `freeDeliveryFrom` — бесплатно.
- Реферальные проценты: см. раздел 4.

### 3.6 Категории, бренды, линейки

- **Категория:** `{ key: string; title: string; image: string }`.
- **Бренд:** `{ category_key: string; key: string; title: string; image: string }`.
- **Линейка:** `{ brand_key: string; key: string; title: string; image: string }`.

Товары привязаны к категории (лист = category key); опционально к бренду/линейке через поля `brand`, `line`.

### 3.7 Promocode (промокод)

```ts
Promocode = {
  code: string
  type: 'amount' | 'percent'
  value: number
  expiresAt?: string
  active: boolean
  productSlugs?: string[]
}
```

В мини-аппе при оформлении заказа передаётся `promoCode`; валидация и пересчёт суммы — на бэкенде или в мини-аппе по своим правилам.

---

## 4. Реферальная система

- **Регистрация по ссылке:** при первом открытии мини-аппа с параметром реферера (например `ref=TELEGRAM_ID` или start-параметр) создаётся/обновляется пользователь с `referrer_id = TELEGRAM_ID`.
- **Начисление бонуса:** при смене статуса заказа на **«подтверждён»** (`confirmed`) бэкенд один раз начисляет бонус рефереру (владельцу `referrer_id` покупателя). Поле заказа `referralBonusAccrued` предотвращает повторное начисление.
- **Процент:** считается количество подтверждённых заказов всех рефералов данного реферера (статусы `confirmed`, `packed`, `completed`). Если это число ≤ 10 — используется `referralPercentBefore10`, иначе `referralPercentAfter10`. Бонус = `round(order.totalRub * percent / 100)`.
- **Баланс:** у пользователя поле `referral_balance_rub`; в мини-аппе в профиле можно показывать реф. баланс и реферальную ссылку.

---

## 5. Google Sheets (листы)

| Лист | Назначение |
|------|------------|
| `categories` | Список категорий, порядок. |
| `<category_key>` | Товары категории (колонки: slug, title, price_rub, images, active, brand, line, article и др.). |
| `brands` | Бренды по категориям. |
| `lines` | Линейки по брендам. |
| `content` | Лента: id, type (news/collection), title, body, image_url, published_at, active, sort, product_slugs. |
| `orders` | Заказы: id, user_id, customer_name, phone, address, items_json, total_rub, promo_code, delivery_fee, status, created_at, confirmed_at, note, referral_bonus_accrued. |
| `miniapp_users` | Пользователи: telegram_id, username, email, phone, role, active, referrer_id, referral_balance_rub. |
| `settings` | Ключ–значение: delivery_fee, free_delivery_from, referral_percent_before_10, referral_percent_after_10. |
| `promocodes` | Промокоды. |
| `visits` | Посещения (дата, user_id и т.д. — см. visits-utils). |

Мини-апп с бэкендом может читать те же листы через свой сервис или обращаться к API админ-бэкенда (тогда нужны публичные/отдельные роуты для каталога, контента, настроек, создания заказа и пользователей).

---

## 6. Статусы заказа

| Значение | Отображение (админка) |
|----------|------------------------|
| `new` | Новый |
| `confirmed` | Подтверждён |
| `packed` | Собран |
| `completed` | Выполнен |
| `cancelled` | Отменен |

В мини-аппе в истории заказов можно показывать те же подписи.

---

## 7. Что сделать при разработке мини-аппа

1. **Регистрация/профиль:** при открытии с `ref` вызывать создание/обновление пользователя с `referrer_id`. Показывать реф. баланс и реферальную ссылку.
2. **Каталог:** получать категории → бренды/линейки → товары (по текущим или новым публичным API).
3. **Корзина и заказ:** расчёт доставки по `deliveryFee` и `freeDeliveryFrom`; применение промокода; отправка заказа `POST /api/orders` с `userId`, `items`, `customerName`, `phone`, `address`, `totalRub`, `deliveryFee`, при необходимости `promoCode`.
4. **Лента:** запрос контента (новости и подборки), отображение по `sort`, для подборок — товары по `productSlugs`.
5. **Посещения:** при открытии мини-аппа отправлять `POST /api/visits` с `userId` (telegram_id или иной идентификатор).
6. **Публичные роуты:** при общем бэкенде вынести в публичные (или отдельные) маршруты: GET контента, GET настроек доставки/рефералки, GET каталога/товаров, POST заказа, POST/GET пользователя по контексту, POST визита.

Файлы бэкенда админки: `admin/backend/src/routes/*.ts`, `admin/backend/src/*-utils.ts`, `admin/frontend/src/api.ts`.
