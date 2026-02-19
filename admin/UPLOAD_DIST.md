# Загрузка dist/ на сервер

## Вариант 1: WinSCP (GUI - самый простой)

1. **Скачай WinSCP:** https://winscp.net/eng/download.php
2. **Установи и запусти**
3. **Подключись к серверу:**
   - Host name: `твой_IP_адрес` (например: `185.123.45.67` или `[2a03:6f01:1:2::1]` для IPv6)
   - Port: `22`
   - Username: `root`
   - Password: твой пароль
   - Protocol: `SFTP`
   - Нажми "Login"

4. **Загрузи папку:**
   - **Слева (локальный компьютер):** перейди в папку `E:\work\shop-koshekjewerly\admin\backend\`
   - **Справа (сервер):** перейди в `/opt/bot/admin/backend/`
   - **Перетащи папку `dist`** из левой панели в правую
   - Или скопируй все файлы из локальной `dist/` в удаленную `/opt/bot/admin/backend/dist/`

## Вариант 2: FileZilla (GUI)

1. **Скачай FileZilla:** https://filezilla-project.org/download.php?type=client
2. **Установи и запусти**
3. **Подключись:**
   - Host: `sftp://твой_IP_адрес` (например: `sftp://185.123.45.67`)
   - Username: `root`
   - Password: твой пароль
   - Port: `22`
   - Нажми "Quickconnect"

4. **Загрузи папку:**
   - **Слева:** перейди в `E:\work\shop-koshekjewerly\admin\backend\`
   - **Справа:** перейди в `/opt/bot/admin/backend/`
   - **Перетащи папку `dist`** из левой панели в правую

## Вариант 3: SCP через PowerShell (командная строка)

**Если у тебя установлен OpenSSH (обычно есть в Windows 10/11):**

```powershell
# перейди в директорию с проектом
cd E:\work\shop-koshekjewerly\admin\backend

# загрузи папку dist на сервер
scp -r dist root@твой_IP_адрес:/opt/bot/admin/backend/
```

**Для IPv6 адреса:**
```powershell
scp -r dist root@[2a03:6f01:1:2::1]:/opt/bot/admin/backend/
```

**Если спросит пароль - введи пароль от сервера**

## Вариант 4: SCP через WSL (если используешь WSL)

```bash
# в WSL терминале
cd /mnt/e/work/shop-koshekjewerly/admin/backend
scp -r dist root@твой_IP_адрес:/opt/bot/admin/backend/
```

## Проверка после загрузки

После загрузки на сервере проверь:

```bash
# подключись к серверу
ssh root@твой_IP_адрес

# проверь что файлы загрузились
ls -la /opt/bot/admin/backend/dist/

# должны быть файлы типа:
# server.js
# routes/
# и т.д.
```

## Рекомендация

**Используй WinSCP или FileZilla** - это самый простой способ, особенно если ты не работал с SCP раньше.

