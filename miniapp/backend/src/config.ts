// конфигурация приложения
export const appVersion = process.env.APP_VERSION || '0.1.0'
export const PORT = Number(process.env.PORT) || 4002
export const SHEET_ID = process.env.GOOGLE_SHEET_ID || ''

// telegram bot api (опционально — для уведомлений о заказах в канал)
export const BOT_TOKEN = process.env.BOT_TOKEN || ''
export const ORDERS_CHANNEL_ID = process.env.ORDERS_CHANNEL_ID || ''
