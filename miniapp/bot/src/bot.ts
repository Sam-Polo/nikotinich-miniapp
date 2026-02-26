import 'dotenv/config'
import { Bot, InlineKeyboard } from 'grammy'
import pino from 'pino'

// --- конфиг ---
const BOT_TOKEN = process.env.BOT_TOKEN || ''
const MINIAPP_URL = process.env.MINIAPP_URL?.trim() || ''
const APP_VERSION = process.env.APP_VERSION || '0.1.0'
const ADMIN_BACKEND_URL = process.env.ADMIN_BACKEND_URL?.trim() || ''
const BOT_INTERNAL_SECRET = process.env.BOT_INTERNAL_SECRET || ''

if (!BOT_TOKEN) {
  console.error('BOT_TOKEN не задан — завершение')
  process.exit(1)
}

// MINIAPP_URL обязателен только для WebApp-кнопок; без него бот работает в режиме "только команды"
const hasWebApp = MINIAPP_URL.startsWith('https://')

// --- логгер (МСК) ---
function mskTime(): string {
  return new Date().toLocaleString('ru-RU', {
    timeZone: 'Europe/Moscow',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false
  })
}

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: { service: 'miniapp-bot', version: APP_VERSION },
  timestamp: () => `,"time":"${mskTime()}"`,
  transport: process.env.NODE_ENV !== 'production'
    ? { target: 'pino-pretty', options: { colorize: true, translateTime: false, ignore: 'pid,hostname' } }
    : undefined
})

// --- создание бота ---
const bot = new Bot(BOT_TOKEN)

// --- регистрация команд (список "/" в чате) ---
async function setupBotCommands() {
  await bot.api.setMyCommands([
    { command: 'start', description: '🏪 Открыть магазин Никотиныч' },
    { command: 'shop',  description: '🛒 Перейти в каталог' },
    { command: 'news',  description: '📰 Акции и новинки' },
    { command: 'help',  description: '❓ Помощь' }
  ])
  logger.info('команды бота зарегистрированы')
}

// --- кнопка меню рядом с полем ввода (открывает мини-апп напрямую без команды) ---
async function setupMenuButton() {
  if (!hasWebApp) {
    // сбрасываем на стандартный вид (список команд), когда URL не настроен
    await bot.api.setChatMenuButton({ menu_button: { type: 'commands' } })
    logger.warn('MINIAPP_URL не задан или не https — кнопка меню установлена как список команд')
    return
  }

  await bot.api.setChatMenuButton({
    menu_button: {
      type: 'web_app',
      text: 'Открыть магазин',
      web_app: { url: MINIAPP_URL }
    }
  })
  logger.info({ miniappUrl: MINIAPP_URL }, 'кнопка меню установлена (WebApp)')
}

// --- inline-клавиатура: WebApp если URL есть, иначе ссылка на бота ---
function shopKeyboard(): InlineKeyboard {
  if (hasWebApp) {
    return new InlineKeyboard().webApp('🛒 Открыть магазин', MINIAPP_URL)
  }
  // заглушка до получения домена
  return new InlineKeyboard().text('🛒 Магазин скоро откроется', 'noop')
}

function newsKeyboard(): InlineKeyboard {
  if (hasWebApp) {
    return new InlineKeyboard().webApp('📰 Новости и акции', MINIAPP_URL)
  }
  return new InlineKeyboard().text('📰 Новости скоро будут', 'noop')
}

// --- /start [ref_TELEGRAM_ID] ---
bot.command('start', async (ctx) => {
  const userId = ctx.from?.id
  const param = ctx.match?.trim()
  const refId = param?.startsWith('ref_') ? param.slice(4) : undefined

  logger.info({ userId, refId: refId ?? null }, '/start')

  const name = ctx.from?.first_name || 'друг'
  let text = `Привет, ${name}! 👋\n\n`
  text += `*Никотиныч* — магазин электронных сигарет и жидкостей.\n\n`
  if (refId) text += `Тебя пригласил друг — после первого заказа ты получишь скидку! 🎁\n\n`
  text += `Нажми кнопку ниже, чтобы открыть каталог 👇`

  await ctx.reply(text, { parse_mode: 'Markdown', reply_markup: shopKeyboard() })
})

// --- /shop, /catalog ---
bot.command(['shop', 'catalog'], async (ctx) => {
  logger.info({ userId: ctx.from?.id }, '/shop')
  await ctx.reply('Открывай каталог и выбирай! 🛒', { reply_markup: shopKeyboard() })
})

// --- /news ---
bot.command('news', async (ctx) => {
  logger.info({ userId: ctx.from?.id }, '/news')
  await ctx.reply('Актуальные акции и новинки — в мини-аппе 🔥', { reply_markup: newsKeyboard() })
})

// --- /help ---
bot.command('help', async (ctx) => {
  await ctx.reply(
    ['❓ *Помощь*', '', '/start — открыть магазин', '/shop — каталог товаров', '/news — акции и новинки', '', 'По любым вопросам — напишите в поддержку.'].join('\n'),
    { parse_mode: 'Markdown', reply_markup: shopKeyboard() }
  )
})

// --- колбэк заглушки (noop) ---
bot.callbackQuery('noop', async (ctx) => {
  await ctx.answerCallbackQuery({ text: 'Магазин скоро откроется 🔧', show_alert: false })
})

// --- обработка смены статуса заказа из канала (os:orderId:status) ---
const STATUS_NAMES: Record<string, string> = {
  new: 'Новый',
  confirmed: 'Подтверждён',
  packed: 'Упаковывается',
  completed: 'Выполнен',
  cancelled: 'Отменён'
}

bot.callbackQuery(/^os:/, async (ctx) => {
  const data = ctx.callbackQuery.data // "os:uuid:status"
  const parts = data.split(':')
  if (parts.length < 3) {
    await ctx.answerCallbackQuery({ text: 'Некорректные данные', show_alert: true })
    return
  }
  const orderId = parts[1]
  const newStatus = parts.slice(2).join(':') // на случай если uuid содержит ":"

  if (!ADMIN_BACKEND_URL || !BOT_INTERNAL_SECRET) {
    logger.warn('ADMIN_BACKEND_URL или BOT_INTERNAL_SECRET не заданы — смена статуса невозможна')
    await ctx.answerCallbackQuery({ text: 'Бот не настроен для смены статусов', show_alert: true })
    return
  }

  try {
    const res = await fetch(`${ADMIN_BACKEND_URL}/internal/order-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Bot-Secret': BOT_INTERNAL_SECRET
      },
      body: JSON.stringify({ orderId, status: newStatus })
    })

    const json = await res.json() as any

    if (!res.ok || !json.success) {
      const errText = json?.error || `HTTP ${res.status}`
      logger.warn({ orderId, newStatus, error: errText }, 'ошибка смены статуса заказа')
      await ctx.answerCallbackQuery({ text: `Ошибка: ${errText}`, show_alert: true })
      return
    }

    logger.info({ orderId, newStatus }, 'статус заказа изменён через бот')
    await ctx.answerCallbackQuery({ text: `✅ Статус → ${STATUS_NAMES[newStatus] ?? newStatus}` })

    // обновляем статусные кнопки в сообщении канала
    try {
      const STATUS_LABELS: Record<string, string> = {
        confirmed: '✅ Подтвердить',
        packed: '📦 Упаковать',
        completed: '✔️ Завершить',
        cancelled: '❌ Отменить'
      }
      const buttons = Object.entries(STATUS_LABELS)
        .filter(([s]) => s !== newStatus)
        .map(([s, label]) => ({ text: label, callback_data: `os:${orderId}:${s}` }))
      const rows: { text: string; callback_data: string }[][] = []
      for (let i = 0; i < buttons.length; i += 2) rows.push(buttons.slice(i, i + 2))

      await ctx.editMessageReplyMarkup({ reply_markup: { inline_keyboard: rows } })
    } catch (editErr: any) {
      // не критично если не удалось обновить клавиатуру
      logger.warn({ error: editErr?.message }, 'не удалось обновить клавиатуру сообщения')
    }
  } catch (e: any) {
    logger.error({ error: e?.message, orderId }, 'ошибка запроса к admin-backend')
    await ctx.answerCallbackQuery({ text: 'Ошибка соединения с сервером', show_alert: true })
  }
})

// --- входящий контакт (requestContact из мини-апп) ---
bot.on('message:contact', async (ctx) => {
  const contact = ctx.message.contact
  const userId = String(ctx.from?.id || '')
  const phone = contact.phone_number

  logger.info({ userId, hasPhone: !!phone }, 'получен контакт от пользователя')

  // сохраняем телефон через miniapp-backend API
  const apiUrl = process.env.MINIAPP_API_URL?.trim()
  if (apiUrl && userId && phone) {
    try {
      const res = await fetch(`${apiUrl}/api/users/${encodeURIComponent(userId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      })
      if (res.ok) {
        logger.info({ userId }, 'телефон сохранён через API')
      } else {
        logger.warn({ userId, status: res.status }, 'не удалось сохранить телефон через API')
      }
    } catch (e: any) {
      logger.warn({ error: e?.message, userId }, 'ошибка сохранения телефона')
    }
  }

  await ctx.reply('Номер сохранён! Вернитесь в магазин 👇', { reply_markup: shopKeyboard() })
})

// --- любое другое сообщение ---
bot.on('message', async (ctx) => {
  await ctx.reply('Открой магазин через кнопку ниже 👇', { reply_markup: shopKeyboard() })
})

// --- обработка ошибок ---
bot.catch((err) => {
  logger.error({ error: err.message, update: err.ctx?.update?.update_id }, 'ошибка обработки обновления')
})

// --- запуск ---
async function main() {
  await setupBotCommands()
  await setupMenuButton()

  if (!hasWebApp) {
    logger.warn('MINIAPP_URL не задан — WebApp-кнопки отключены, бот работает без мини-аппа')
  }

  logger.info({ version: APP_VERSION }, 'бот запускается (long polling)')
  await bot.start({
    onStart: (info) => logger.info({ username: info.username }, 'бот запущен')
  })
}

main().catch((err) => {
  logger.error({ error: err.message }, 'критическая ошибка запуска бота')
  process.exit(1)
})
