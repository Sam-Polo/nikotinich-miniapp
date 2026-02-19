# Деплой админ-панели на Timeweb VDS

## Обзор

Админ-панель состоит из:
- **Backend** (Express на порту 4001) - API для работы с Google Sheets
- **Frontend** (React/Vite) - веб-интерфейс, раздается через nginx

## Домен и URL

**По умолчанию (по IP адресу):**
- URL админ-панели: `http://YOUR_IP_ADDRESS/admin`
- API: `http://YOUR_IP_ADDRESS/admin/api/...`

**С доменом (если настроен):**
- URL админ-панели: `http://admin.example.com` или `https://admin.example.com`
- API: `http://admin.example.com/api/...`

**Как изменить домен:**
1. Настрой DNS записи (A-запись для поддомена)
2. Обнови переменные окружения (см. Шаг 7)
3. Пересобери фронтенд
4. Перезапусти nginx

**Важно:** Если у тебя уже есть основной сайт на этом сервере, нужно будет настроить виртуальные хосты в nginx (см. раздел "Настройка домена").

## Шаг 1: Установка nginx

```bash
apt install -y nginx
systemctl enable nginx
systemctl start nginx
```

Проверь что nginx работает:
```bash
systemctl status nginx
```

## Шаг 2: Подготовка проекта

### 2.1 Переходим в директорию проекта

```bash
cd /opt/bot
```

### 2.2 Обновляем код (если используешь git)

```bash
git pull
```

Или загрузи файлы админ-панели через SFTP/SCP в `/opt/bot/admin/`

## Шаг 3: Настройка Backend

### 3.1 Устанавливаем зависимости

```bash
cd /opt/bot/admin/backend
npm install
```

### 3.2 Создаем файл .env

```bash
nano .env
```

Добавь переменные окружения:

```env
# Порт бэкенда (по умолчанию 4001)
PORT=4001

# URL фронтенда (для CORS)
ADMIN_FRONTEND_URL=http://YOUR_IP_ADDRESS/admin

# JWT секрет для авторизации (придумай сложный ключ)
JWT_SECRET=your_super_secret_jwt_key_here_min_32_chars

# Данные для входа в админ-панель
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_password_here

# Google Sheets (те же что и для основного бэкенда)
GOOGLE_SHEET_ID=your_google_sheet_id
GOOGLE_CREDENTIALS={"type":"service_account",...}

# Uploadcare (для загрузки фото)
UPLOADCARE_PUB_KEY=6c068b3ed6286e4d6aa9
UPLOADCARE_SECRET_KEY=your_uploadcare_secret_key

# Основной бэкенд (для автоматического импорта после изменений)
BACKEND_URL=https://shop-koshekjewerly.onrender.com
ADMIN_IMPORT_KEY=your_admin_import_key_here

# Логирование
LOG_LEVEL=info
NODE_ENV=production
```

**Важно:**
- `JWT_SECRET` - придумай сложный ключ минимум 32 символа
- `ADMIN_PASSWORD` - придумай надежный пароль
- `GOOGLE_CREDENTIALS` - скопируй из основного бэкенда (тот же сервисный аккаунт)
- `ADMIN_FRONTEND_URL` - замени `YOUR_IP_ADDRESS` на твой IP адрес

Сохрани: `Ctrl+O`, `Enter`, `Ctrl+X`

### 3.3 Собираем проект

**⚠️ Важно:** На сервере с 1GB RAM сборка TypeScript может не поместиться в память. Есть два варианта:

**Вариант 1: Собрать локально и загрузить dist (рекомендуется)**

Собери проект на своей машине (где больше RAM):
```bash
# на твоей локальной машине
cd admin/backend
npm install
npm run build
```

Затем загрузи папку `dist/` на сервер через SFTP/SCP в `/opt/bot/admin/backend/dist/`

**Вариант 2: Использовать tsx без сборки (для серверов с малым RAM)**

Если сборка не работает, можно запускать напрямую через `tsx`:
```bash
# устанавливаем tsx глобально (если еще не установлен)
npm install -g tsx

# запускаем через tsx (см. Шаг 3.4)
```

**Вариант 3: Попробовать собрать на сервере (может не сработать)**

```bash
npm run build
```

Если получишь "Killed" - используй Вариант 1 или 2.

### 3.4 Запускаем через PM2

**Если собрал проект (Вариант 1 или 3):**

```bash
pm2 start npm --name "admin-backend" --cwd /opt/bot/admin/backend -- start
pm2 save
```

**Если используешь tsx без сборки (Вариант 2):**

```bash
# убедись что tsx установлен
npm install -g tsx

# запускаем через tsx
pm2 start tsx --name "admin-backend" --cwd /opt/bot/admin/backend -- src/server.ts
pm2 save
```

**Важно:** При использовании `tsx` убедись что все зависимости установлены (`npm install`).

Проверь статус:
```bash
pm2 status
pm2 logs admin-backend
```

## Шаг 4: Настройка Frontend

### 4.1 Устанавливаем зависимости

```bash
cd /opt/bot/admin/frontend
npm install
```

### 4.2 Создаем файл .env

```bash
nano .env
```

Добавь:

```env
VITE_API_URL=http://YOUR_IP_ADDRESS/admin
```

**Важно:** Замени `YOUR_IP_ADDRESS` на твой IP адрес. Не добавляй `/api` в конце - это обработает nginx.

Сохрани: `Ctrl+O`, `Enter`, `Ctrl+X`

### 4.3 Собираем фронтенд

```bash
npm run build
```

После сборки файлы будут в `dist/` директории.

## Шаг 5: Настройка nginx

### 5.1 Создаем конфигурацию nginx

**Если у тебя НЕТ других сайтов на этом сервере:**

Создай новый конфиг:
```bash
nano /etc/nginx/sites-available/admin-panel
```

**Если у тебя УЖЕ ЕСТЬ другие сайты на этом сервере:**

Добавь location блоки в существующий конфиг (например, `/etc/nginx/sites-available/default`):
```bash
nano /etc/nginx/sites-available/default
```

И добавь в существующий `server` блок те же location блоки (см. ниже).

Добавь конфигурацию (замени `YOUR_IP_ADDRESS` на твой IP):

```nginx
server {
    listen 80;
    server_name 185.247.185.14;

    # корневая директория для фронтенда
    root /opt/bot/admin/frontend/dist;
    index index.html;

    # логи
    access_log /var/log/nginx/admin-panel-access.log;
    error_log /var/log/nginx/admin-panel-error.log;

    # health check (должен быть первым, чтобы не перехватывался другими location)
    location /admin/health {
        proxy_pass http://localhost:4001/health;
    }

    # проксирование API запросов к бэкенду (должен быть перед /admin)
    location /admin/api/ {
        proxy_pass http://localhost:4001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # раздача статики фронтенда (должен быть последним)
    location /admin {
        alias /opt/bot/admin/frontend/dist;
        try_files $uri $uri/ @admin_fallback;
        
        # заголовки для SPA
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }
    
    # fallback для SPA роутинга
    location @admin_fallback {
        rewrite ^/admin(.*)$ /admin/index.html last;
    }
}
```

Сохрани: `Ctrl+O`, `Enter`, `Ctrl+X`

### 5.2 Активируем конфигурацию

**Если создал новый конфиг (`admin-panel`):**

```bash
ln -s /etc/nginx/sites-available/admin-panel /etc/nginx/sites-enabled/
```

**Если добавил в существующий конфиг:**

Ничего дополнительно делать не нужно, просто перезапусти nginx (см. Шаг 5.4).

### 5.3 Проверяем конфигурацию

```bash
nginx -t
```

Если видишь `syntax is ok` и `test is successful` - всё правильно.

### 5.4 Перезапускаем nginx

```bash
systemctl reload nginx
```

## Шаг 6: Проверка работы

### 6.1 Проверь бэкенд

```bash
curl http://localhost:4001/health
```

Должен вернуть: `{"status":"ok"}`

### 6.2 Проверь фронтенд

Открой в браузере: `http://YOUR_IP_ADDRESS/admin`

Должна открыться страница входа в админ-панель.

### 6.3 Проверь логи

```bash
# логи бэкенда
pm2 logs admin-backend

# логи nginx
tail -f /var/log/nginx/admin-panel-access.log
tail -f /var/log/nginx/admin-panel-error.log
```

## Шаг 7: Настройка домена (опционально)

Если у тебя есть домен (например, `admin.example.com`):

### 7.1 Обнови DNS записи

В DNS провайдере добавь A-запись:
- `admin.example.com` → `YOUR_IP_ADDRESS`

### 7.2 Обнови конфигурацию nginx

```bash
nano /etc/nginx/sites-available/admin-panel
```

Измени `server_name`:
```nginx
server_name admin.example.com;
```

### 7.3 Обнови переменные окружения

**Backend .env:**
```env
ADMIN_FRONTEND_URL=https://admin.example.com
```

**Frontend .env:**
```env
VITE_API_URL=https://admin.example.com
```

Пересобери фронтенд:
```bash
cd /opt/bot/admin/frontend
npm run build
```

Перезапусти nginx:
```bash
systemctl reload nginx
```

### 7.4 Настрой SSL (HTTPS) - опционально

Для HTTPS используй Let's Encrypt:

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d admin.example.com
```

Certbot автоматически настроит SSL и обновит конфигурацию nginx.

## Шаг 8: Обновление админ-панели

Когда нужно обновить код:

**Если используешь сборку (npm run build):**

```bash
cd /opt/bot

# обновляем код
git pull

# обновляем бэкенд
cd admin/backend
npm install

# если сборка на сервере не работает - собери локально и загрузи dist/
# иначе:
npm run build
pm2 restart admin-backend

# обновляем фронтенд
cd ../frontend
npm install
npm run build
# nginx автоматически раздаст новые файлы
```

**Если используешь tsx (без сборки):**

```bash
cd /opt/bot

# обновляем код
git pull

# обновляем бэкенд
cd admin/backend
npm install
pm2 restart admin-backend

# обновляем фронтенд
cd ../frontend
npm install
npm run build
# nginx автоматически раздаст новые файлы
```

## Полезные команды

```bash
# логи бэкенда
pm2 logs admin-backend

# перезапуск бэкенда
pm2 restart admin-backend

# статус всех процессов
pm2 status

# перезапуск nginx
systemctl reload nginx

# проверка конфигурации nginx
nginx -t
```

## Troubleshooting

### Админ-панель не открывается

```bash
# проверь что nginx работает
systemctl status nginx

# проверь логи nginx
tail -f /var/log/nginx/admin-panel-error.log

# проверь что бэкенд работает
pm2 logs admin-backend
curl http://localhost:4001/health
```

### Ошибка CORS

Проверь что в `.env` бэкенда правильно указан `ADMIN_FRONTEND_URL`:
```bash
cat /opt/bot/admin/backend/.env | grep ADMIN_FRONTEND_URL
```

### Фронтенд показывает старую версию

Очисти кэш браузера или пересобери фронтенд:
```bash
cd /opt/bot/admin/frontend
npm run build
```

### Бэкенд не запускается

```bash
# проверь логи
pm2 logs admin-backend --err

# проверь .env файл
cat /opt/bot/admin/backend/.env

# проверь что порт 4001 свободен
netstat -tuln | grep 4001
```

## Безопасность

1. **Используй надежный пароль** для `ADMIN_PASSWORD`
2. **Используй сложный JWT_SECRET** (минимум 32 символа)
3. **Настрой firewall** если нужно (обычно Timeweb настраивает сам)
4. **Используй HTTPS** если есть домен (Let's Encrypt бесплатный)
5. **Не храни .env в git** (уже в .gitignore)

## Структура файлов

```
/opt/bot/
├── bot/              # основной бот
│   └── .env
├── admin/
│   ├── backend/      # бэкенд админ-панели
│   │   ├── .env
│   │   └── dist/
│   └── frontend/     # фронтенд админ-панели
│       ├── .env
│       └── dist/     # собранные файлы для nginx
└── ...
```

## Доступ к админ-панели

- **URL:** `http://YOUR_IP_ADDRESS/admin` (или домен если настроен)
- **Логин:** значение из `ADMIN_USERNAME` (по умолчанию `admin`)
- **Пароль:** значение из `ADMIN_PASSWORD`

