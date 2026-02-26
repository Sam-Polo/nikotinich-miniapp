import { BOT_TOKEN, ORDERS_CHANNEL_ID } from './config.js'
import { logger } from './logger.js'

const TG_API = 'https://api.telegram.org'

// статусы для inline-кнопок (не показываем текущий статус и отмену если уже выполнен)
const STATUS_LABELS: Record<string, string> = {
  confirmed: '✅ Подтвердить',
  packed: '📦 Упаковать',
  completed: '✔️ Завершить',
  cancelled: '❌ Отменить'
}

// форматирование текста сообщения о заказе
export function formatOrderMessage(order: {
  id: string
  userId?: string
  customerName: string
  phone?: string
  address?: string
  items: { slug: string; qty: number; title?: string; priceRub?: number }[]
  totalRub: number
  promoCode?: string
  deliveryFee: number
  status: string
  note?: string
  referralBonusUsed?: number
}, statusOverride?: string): string {
  const status = statusOverride ?? order.status
  const statusLabel: Record<string, string> = {
    new: '🆕 Новый',
    confirmed: '✅ Подтверждён',
    packed: '📦 Упаковывается',
    completed: '✔️ Выполнен',
    cancelled: '❌ Отменён'
  }

  const itemsText = order.items.map(i => {
    const name = i.title || i.slug
    const price = i.priceRub ? ` — ₽${i.priceRub * i.qty}` : ''
    return `  • ${name} × ${i.qty}${price}`
  }).join('\n')

  let lines = [
    `📦 *Заказ #${order.id.slice(0, 8).toUpperCase()}*`,
    `Статус: ${statusLabel[status] ?? status}`,
    '',
    `👤 ${order.customerName}`,
    order.phone ? `📞 ${order.phone}` : null,
    order.address ? `📍 ${order.address}` : null,
    order.userId ? `Telegram ID: ${order.userId}` : null,
    '',
    '*Состав:*',
    itemsText,
    '',
    order.deliveryFee > 0 ? `🚚 Доставка: ₽${order.deliveryFee}` : '🚚 Доставка: Бесплатно',
    order.promoCode ? `🎟 Промокод: ${order.promoCode}` : null,
    order.referralBonusUsed && order.referralBonusUsed > 0 ? `💰 Реф. баллы: −₽${order.referralBonusUsed}` : null,
    `💵 *Итого: ₽${order.totalRub}*`,
    order.note ? `\n📝 ${order.note}` : null
  ]

  return lines.filter(Boolean).join('\n')
}

// inline-клавиатура для управления статусом заказа
function buildKeyboard(orderId: string, currentStatus: string) {
  const buttons = Object.entries(STATUS_LABELS)
    .filter(([s]) => s !== currentStatus)
    .map(([s, label]) => ({ text: label, callback_data: `os:${orderId}:${s}` }))

  // разбиваем по 2 кнопки в ряд
  const rows: { text: string; callback_data: string }[][] = []
  for (let i = 0; i < buttons.length; i += 2) {
    rows.push(buttons.slice(i, i + 2))
  }
  return { inline_keyboard: rows }
}

// отправка уведомления о новом заказе в канал
export async function sendOrderNotification(order: Parameters<typeof formatOrderMessage>[0]): Promise<string | null> {
  if (!BOT_TOKEN || !ORDERS_CHANNEL_ID) {
    logger.warn('BOT_TOKEN или ORDERS_CHANNEL_ID не заданы — уведомление о заказе не отправлено')
    return null
  }

  const text = formatOrderMessage(order)
  const reply_markup = buildKeyboard(order.id, order.status)

  try {
    const res = await fetch(`${TG_API}/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: ORDERS_CHANNEL_ID,
        text,
        parse_mode: 'Markdown',
        reply_markup
      })
    })
    const data = await res.json() as any
    if (!data.ok) {
      logger.warn({ error: data.description, orderId: order.id }, 'не удалось отправить уведомление в канал')
      return null
    }
    const msgId = String(data.result?.message_id)
    logger.info({ orderId: order.id, msgId }, 'уведомление о заказе отправлено в канал')
    return msgId
  } catch (e: any) {
    logger.warn({ error: e?.message, orderId: order.id }, 'ошибка отправки уведомления о заказе')
    return null
  }
}

// обновление сообщения в канале при смене статуса заказа
export async function editOrderMessage(
  messageId: string,
  order: Parameters<typeof formatOrderMessage>[0],
  newStatus: string
): Promise<void> {
  if (!BOT_TOKEN || !ORDERS_CHANNEL_ID) return

  const text = formatOrderMessage(order, newStatus)
  const reply_markup = buildKeyboard(order.id, newStatus)

  try {
    const res = await fetch(`${TG_API}/bot${BOT_TOKEN}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: ORDERS_CHANNEL_ID,
        message_id: Number(messageId),
        text,
        parse_mode: 'Markdown',
        reply_markup
      })
    })
    const data = await res.json() as any
    if (!data.ok) {
      logger.warn({ error: data.description, messageId }, 'не удалось обновить сообщение в канале')
    }
  } catch (e: any) {
    logger.warn({ error: e?.message, messageId }, 'ошибка обновления сообщения в канале')
  }
}
