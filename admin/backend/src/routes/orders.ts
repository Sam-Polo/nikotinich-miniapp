import express from 'express'
import { randomUUID } from 'node:crypto'
import { requireAuth } from '../auth.js'
import { fetchOrdersFromSheet, saveOrdersToSheet, type Order, type OrderStatus } from '../orders-utils.js'
import { fetchUsersFromSheet, saveUsersToSheet } from '../users-utils.js'
import { fetchOrdersSettingsFromSheet } from '../settings-utils.js'
import { accrueReferralBonusOnConfirmed } from '../referral-utils.js'
import { logger } from '../logger.js'

const router = express.Router()
router.use(requireAuth)

const allowedStatuses: OrderStatus[] = ['new', 'confirmed', 'packed', 'completed', 'cancelled']

router.get('/', async (req, res) => {
  try {
    const sheetId = process.env.GOOGLE_SHEET_ID
    if (!sheetId) return res.status(500).json({ error: 'GOOGLE_SHEET_ID not configured' })
    let orders = await fetchOrdersFromSheet(sheetId)
    const userId = typeof req.query.user_id === 'string' ? req.query.user_id.trim() : null
    if (userId) orders = orders.filter((o) => o.userId === userId)
    const status = typeof req.query.status === 'string' ? req.query.status.trim().toLowerCase() : null
    if (status) orders = orders.filter((o) => o.status === status)
    const total = orders.length
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || 20), 10) || 20))
    const offset = Math.max(0, parseInt(String(req.query.offset || 0), 10) || 0)
    const page = orders.slice(offset, offset + limit)
    res.json({ orders: page, total })
  } catch (error: any) {
    logger.error({ error: error?.message }, 'failed to load orders')
    res.status(500).json({ error: 'failed_to_load_orders' })
  }
})

router.post('/', async (req, res) => {
  try {
    const sheetId = process.env.GOOGLE_SHEET_ID
    if (!sheetId) return res.status(500).json({ error: 'GOOGLE_SHEET_ID not configured' })
    const body = req.body || {}
    if (!body.customerName || !Array.isArray(body.items) || body.items.length === 0) {
      return res.status(400).json({ error: 'missing_required_fields' })
    }
    const orders = await fetchOrdersFromSheet(sheetId)
    const created: Order = {
      id: randomUUID(),
      userId: body.userId ? String(body.userId) : undefined,
      customerName: String(body.customerName).trim().slice(0, 120),
      phone: body.phone ? String(body.phone).trim().slice(0, 32) : undefined,
      address: body.address ? String(body.address).trim().slice(0, 240) : undefined,
      items: body.items.map((item: any) => ({
        slug: String(item.slug || '').trim(),
        qty: Math.max(1, Number(item.qty || 1)),
        title: item.title ? String(item.title).trim().slice(0, 140) : undefined,
        priceRub: item.priceRub !== undefined ? Number(item.priceRub) : undefined
      })),
      totalRub: Number(body.totalRub || 0),
      promoCode: body.promoCode ? String(body.promoCode).trim().toUpperCase() : undefined,
      deliveryFee: Number(body.deliveryFee || 0),
      status: 'new',
      createdAt: new Date().toISOString(),
      note: body.note ? String(body.note).trim().slice(0, 500) : undefined
    }
    orders.unshift(created)
    await saveOrdersToSheet(sheetId, orders)
    res.json({ success: true, order: created })
  } catch (error: any) {
    logger.error({ error: error?.message }, 'failed to create order')
    res.status(500).json({ error: 'failed_to_create_order' })
  }
})

router.put('/:id/status', async (req, res) => {
  try {
    const sheetId = process.env.GOOGLE_SHEET_ID
    if (!sheetId) return res.status(500).json({ error: 'GOOGLE_SHEET_ID not configured' })
    const status = String(req.body?.status || '').trim().toLowerCase() as OrderStatus
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ error: 'invalid_status' })
    }
    const orders = await fetchOrdersFromSheet(sheetId)
    const index = orders.findIndex((order) => order.id === req.params.id)
    if (index === -1) return res.status(404).json({ error: 'order_not_found' })
    const current = orders[index]
    const updated: Order = {
      ...current,
      status,
      confirmedAt: status === 'confirmed' ? new Date().toISOString() : current.confirmedAt
    }
    orders[index] = updated

    // начисление реф. бонуса при первом переходе в "подтверждён"
    if (current.status !== 'confirmed' && status === 'confirmed') {
      try {
        const users = await fetchUsersFromSheet(sheetId)
        const settings = await fetchOrdersSettingsFromSheet(sheetId)
        accrueReferralBonusOnConfirmed(req.params.id, orders, users, settings)
        await saveUsersToSheet(sheetId, users)
      } catch (err: any) {
        logger.warn({ error: err?.message }, 'ошибка начисления реф. бонуса')
      }
    }

    await saveOrdersToSheet(sheetId, orders)
    res.json({ success: true, order: orders[index] })
  } catch (error: any) {
    logger.error({ error: error?.message }, 'failed to update order status')
    res.status(500).json({ error: 'failed_to_update_order_status' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const sheetId = process.env.GOOGLE_SHEET_ID
    if (!sheetId) return res.status(500).json({ error: 'GOOGLE_SHEET_ID not configured' })
    const orders = await fetchOrdersFromSheet(sheetId)
    const filtered = orders.filter((o) => o.id !== req.params.id)
    if (filtered.length === orders.length) return res.status(404).json({ error: 'order_not_found' })
    await saveOrdersToSheet(sheetId, filtered)
    logger.info({ orderId: req.params.id }, 'заказ удалён')
    res.json({ success: true })
  } catch (error: any) {
    logger.error({ error: error?.message }, 'failed to delete order')
    res.status(500).json({ error: 'failed_to_delete_order' })
  }
})

// массовое удаление заказов по списку id
router.post('/bulk-delete', async (req, res) => {
  try {
    const sheetId = process.env.GOOGLE_SHEET_ID
    if (!sheetId) return res.status(500).json({ error: 'GOOGLE_SHEET_ID not configured' })

    const ids = Array.isArray(req.body?.ids) ? req.body.ids.map((id: any) => String(id)) : []
    if (ids.length === 0) {
      return res.status(400).json({ error: 'missing_ids' })
    }

    const orders = await fetchOrdersFromSheet(sheetId)
    const filtered = orders.filter(o => !ids.includes(o.id))

    if (filtered.length === orders.length) {
      return res.status(404).json({ error: 'orders_not_found' })
    }

    await saveOrdersToSheet(sheetId, filtered)
    logger.info({ count: ids.length }, 'заказы удалены (bulk)')
    res.json({ success: true, deleted: ids.length })
  } catch (error: any) {
    logger.error({ error: error?.message }, 'failed to bulk delete orders')
    res.status(500).json({ error: 'failed_to_bulk_delete_orders' })
  }
})

export default router
