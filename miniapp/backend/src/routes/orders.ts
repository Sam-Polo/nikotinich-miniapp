import { Router } from 'express'
import { randomUUID } from 'node:crypto'
import { SHEET_ID } from '../config.js'
import { readSheet, ensureSheet, appendRow } from '../sheets-utils.js'
import { logger } from '../logger.js'

const router = Router()

const SHEET_NAME = 'orders'
const HEADERS = [
  'id', 'user_id', 'customer_name', 'phone', 'address',
  'items_json', 'total_rub', 'promo_code', 'delivery_fee',
  'status', 'created_at', 'confirmed_at', 'note', 'referral_bonus_accrued'
]

// GET /api/orders?userId= — история заказов пользователя
router.get('/', async (req, res) => {
  const userId = String(req.query.userId || '').trim()
  if (!userId) return res.status(400).json({ error: 'userId_required' })

  try {
    const rows = await readSheet(SHEET_ID, `${SHEET_NAME}!A1:N2000`)
    if (rows.length < 2) return res.json([])

    const header = rows[0].map((h: string) => h.trim().toLowerCase())
    const idx = (n: string) => header.indexOf(n)

    const orders = rows.slice(1)
      .filter(r => r && r.length > 0)
      .map(r => {
        const get = (n: string) => String(r[idx(n)] ?? '').trim()
        let items = []
        try {
          const parsed = JSON.parse(get('items_json') || '[]')
          if (Array.isArray(parsed)) items = parsed
        } catch { items = [] }

        return {
          id: get('id'),
          userId: get('user_id') || undefined,
          customerName: get('customer_name'),
          phone: get('phone') || undefined,
          address: get('address') || undefined,
          items,
          totalRub: Number(get('total_rub')) || 0,
          promoCode: get('promo_code') || undefined,
          deliveryFee: Number(get('delivery_fee')) || 0,
          status: get('status') || 'new',
          createdAt: get('created_at'),
          confirmedAt: get('confirmed_at') || undefined,
          note: get('note') || undefined
        }
      })
      .filter(o => o.userId === userId && o.customerName)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

    res.json(orders)
  } catch (e: any) {
    logger.error({ error: e?.message, userId }, 'ошибка чтения заказов')
    res.status(500).json({ error: 'server_error' })
  }
})

// POST /api/orders — создать заказ
router.post('/', async (req, res) => {
  const { customerName, items, userId, phone, address, totalRub, promoCode, deliveryFee, note } = req.body

  if (!customerName || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'customerName and items are required' })
  }

  const id = randomUUID()
  const now = new Date().toISOString()

  const row = [
    id,
    userId || '',
    customerName,
    phone || '',
    address || '',
    JSON.stringify(items),
    String(totalRub ?? 0),
    promoCode || '',
    String(deliveryFee ?? 0),
    'new',
    now,
    '',
    note || '',
    '0'
  ]

  try {
    await ensureSheet(SHEET_ID, SHEET_NAME, HEADERS)
    await appendRow(SHEET_ID, SHEET_NAME, row)

    logger.info({ orderId: id, userId, totalRub }, 'заказ создан')
    res.status(201).json({ id, status: 'new', createdAt: now })
  } catch (e: any) {
    logger.error({ error: e?.message, userId }, 'ошибка создания заказа')
    res.status(500).json({ error: 'server_error' })
  }
})

export default router
