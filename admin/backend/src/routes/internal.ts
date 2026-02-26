import express from 'express'
import { fetchOrdersFromSheet, saveOrdersToSheet, type OrderStatus } from '../orders-utils.js'
import { fetchUsersFromSheet, saveUsersToSheet } from '../users-utils.js'
import { fetchOrdersSettingsFromSheet } from '../settings-utils.js'
import { accrueReferralBonusOnConfirmed } from '../referral-utils.js'
import { logger } from '../logger.js'

const router = express.Router()

const allowedStatuses: OrderStatus[] = ['new', 'confirmed', 'packed', 'completed', 'cancelled']

// проверка секрета бота (без сессионной авторизации)
function requireBotSecret(req: express.Request, res: express.Response, next: express.NextFunction) {
  const secret = process.env.BOT_INTERNAL_SECRET
  if (!secret) {
    logger.warn('BOT_INTERNAL_SECRET не задан — internal endpoint недоступен')
    return res.status(503).json({ error: 'not_configured' })
  }
  const provided = req.headers['x-bot-secret']
  if (provided !== secret) {
    logger.warn({ url: req.url }, 'неверный bot secret — отказ доступа')
    return res.status(403).json({ error: 'forbidden' })
  }
  next()
}

router.use(requireBotSecret)

// POST /internal/order-status — смена статуса заказа ботом
router.post('/order-status', async (req, res) => {
  try {
    const sheetId = process.env.GOOGLE_SHEET_ID
    if (!sheetId) return res.status(500).json({ error: 'GOOGLE_SHEET_ID not configured' })

    const { orderId, status } = req.body || {}

    if (typeof orderId !== 'string' || !orderId.trim()) {
      return res.status(400).json({ error: 'orderId_required' })
    }

    const newStatus = String(status || '').trim().toLowerCase() as OrderStatus
    if (!allowedStatuses.includes(newStatus)) {
      return res.status(400).json({ error: 'invalid_status' })
    }

    const orders = await fetchOrdersFromSheet(sheetId)
    const index = orders.findIndex(o => o.id === orderId)
    if (index === -1) return res.status(404).json({ error: 'order_not_found' })

    const current = orders[index]
    const updated = {
      ...current,
      status: newStatus,
      confirmedAt: newStatus === 'confirmed' ? new Date().toISOString() : current.confirmedAt
    }
    orders[index] = updated

    // начисление реф. бонуса при первом переходе в "подтверждён"
    if (current.status !== 'confirmed' && newStatus === 'confirmed') {
      try {
        const users = await fetchUsersFromSheet(sheetId)
        const settings = await fetchOrdersSettingsFromSheet(sheetId)
        accrueReferralBonusOnConfirmed(orderId, orders, users, settings)
        await saveUsersToSheet(sheetId, users)
      } catch (err: any) {
        logger.warn({ error: err?.message }, 'ошибка начисления реф. бонуса (internal)')
      }
    }

    await saveOrdersToSheet(sheetId, orders)
    logger.info({ orderId, oldStatus: current.status, newStatus }, 'статус заказа изменён через internal endpoint')
    res.json({ success: true, order: orders[index] })
  } catch (e: any) {
    logger.error({ error: e?.message }, 'ошибка internal order-status')
    res.status(500).json({ error: 'server_error' })
  }
})

export default router
