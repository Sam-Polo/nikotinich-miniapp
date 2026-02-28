import { Router } from 'express'
import { randomUUID } from 'node:crypto'
import { SHEET_ID } from '../config.js'
import { readSheet, ensureSheet, appendRow, getAuth, updateRange, getSheetTitles } from '../sheets-utils.js'
import { sendOrderNotification } from '../notify.js'
import { google } from 'googleapis'
import { logger } from '../logger.js'

const router = Router()

const SHEET_NAME = 'orders'
const USERS_SHEET = 'miniapp_users'
const HEADERS = [
  'id', 'user_id', 'customer_name', 'phone', 'address',
  'items_json', 'total_rub', 'promo_code', 'delivery_fee',
  'status', 'created_at', 'confirmed_at', 'note', 'referral_bonus_accrued', 'referral_bonus_used', 'tg_message_id'
]

const SERVICE_SHEETS = new Set(['categories', 'brands', 'lines', 'content', 'orders', 'miniapp_users', 'settings', 'promocodes', 'visits'])

// списание остатка по товарам заказа в листах каталога
async function decrementStockForOrder(items: { slug: string; qty: number }[]): Promise<void> {
  const all = await getSheetTitles(SHEET_ID)
  const sheetNames = all.filter(n => !SERVICE_SHEETS.has(n.toLowerCase()))

  for (const { slug, qty } of items) {
    if (!slug || qty <= 0) continue
    for (const sheetName of sheetNames) {
      try {
        const rows = await readSheet(SHEET_ID, `${sheetName}!A1:Q1000`)
        if (rows.length < 2) continue
        const header = rows[0].map((h: string) => String(h || '').trim().toLowerCase())
        const slugIdx = header.indexOf('slug')
        const stockIdx = header.indexOf('stock')
        if (slugIdx === -1 || stockIdx === -1) continue

        const rowIndex = rows.findIndex((r, i) => i > 0 && String(r[slugIdx] ?? '').trim() === slug)
        if (rowIndex === -1) continue

        const row = rows[rowIndex]
        const stockRaw = row[stockIdx] !== undefined ? String(row[stockIdx] ?? '').trim() : ''
        const current = stockRaw !== '' ? Number(stockRaw) : NaN
        if (!Number.isFinite(current) || current < 0) continue

        const newStock = Math.max(0, current - qty)
        const fullRow = header.map((_, i) => String(row[i] ?? ''))
        fullRow[stockIdx] = String(newStock)
        const sheetRow = rowIndex + 1
        await updateRange(SHEET_ID, `${sheetName}!A${sheetRow}:Q${sheetRow}`, [fullRow])
        logger.info({ slug, sheetName, previousStock: current, qty, newStock }, 'остаток списан')
        break
      } catch (e: any) {
        logger.warn({ sheetName, slug, error: e?.message }, 'не удалось списать остаток')
      }
    }
  }
}

// списание реферального баланса пользователя
async function deductUserReferralBalance(userId: string, amount: number): Promise<void> {
  const rows = await readSheet(SHEET_ID, `${USERS_SHEET}!A1:H2000`)
  if (rows.length < 2) throw new Error('users_not_found')

  const header = rows[0].map((h: string) => h.trim().toLowerCase())
  const idIdx = header.indexOf('telegram_id')
  const balIdx = header.indexOf('referral_balance_rub')
  if (idIdx === -1 || balIdx === -1) throw new Error('users_sheet_format_error')

  const rowIndex = rows.findIndex((r, i) => i > 0 && String(r[idIdx] ?? '').trim() === userId)
  if (rowIndex === -1) throw new Error('user_not_found')

  const row = [...rows[rowIndex]]
  const currentBalance = Math.max(0, Number(row[balIdx]) || 0)
  if (currentBalance < amount) throw new Error('insufficient_balance')

  row[balIdx] = String(currentBalance - amount)
  // строки в Sheets 1-indexed, +1 за заголовок
  const sheetRow = rowIndex + 1
  const auth = getAuth()
  const sheets = google.sheets({ version: 'v4', auth })
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${USERS_SHEET}!A${sheetRow}:H${sheetRow}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [row] }
  })
}

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
  const { customerName, items, userId, phone, address, totalRub, promoCode, deliveryFee, note, referralBonusUsed } = req.body

  if (!customerName || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'customerName and items are required' })
  }

  const bonusUsed = Math.max(0, Number(referralBonusUsed) || 0)

  // списать реферальный баланс до записи заказа (чтобы не создать заказ если баланса нет)
  if (bonusUsed > 0 && userId) {
    try {
      await deductUserReferralBalance(String(userId), bonusUsed)
    } catch (e: any) {
      if (e.message === 'insufficient_balance') {
        return res.status(400).json({ error: 'insufficient_referral_balance' })
      }
      // остальные ошибки списания логируем как предупреждение — заказ всё равно создаётся без бонуса
      logger.warn({ error: e?.message, userId }, 'не удалось списать реферальный баланс')
    }
  }

  const id = randomUUID()
  const now = new Date().toISOString()

  const orderData = {
    id,
    userId: userId ? String(userId) : undefined,
    customerName: String(customerName),
    phone: phone ? String(phone) : undefined,
    address: address ? String(address) : undefined,
    items: items.map((i: any) => ({
      slug: String(i.slug || ''),
      qty: Number(i.qty) || 1,
      title: i.title ? String(i.title) : undefined,
      priceRub: i.priceRub !== undefined ? Number(i.priceRub) : undefined
    })),
    totalRub: Number(totalRub ?? 0),
    promoCode: promoCode ? String(promoCode) : undefined,
    deliveryFee: Number(deliveryFee ?? 0),
    status: 'new',
    note: note ? String(note) : undefined,
    referralBonusUsed: bonusUsed > 0 ? bonusUsed : undefined
  }

  try {
    await ensureSheet(SHEET_ID, SHEET_NAME, HEADERS)

    // отправляем уведомление в канал (асинхронно, не блокируем ответ)
    const msgId = await sendOrderNotification(orderData)

    const row = [
      id,
      orderData.userId || '',
      orderData.customerName,
      orderData.phone || '',
      orderData.address || '',
      JSON.stringify(orderData.items),
      String(orderData.totalRub),
      orderData.promoCode || '',
      String(orderData.deliveryFee),
      'new',
      now,
      '',
      orderData.note || '',
      '0',
      String(bonusUsed),
      msgId || ''
    ]

    await appendRow(SHEET_ID, SHEET_NAME, row)

    // списываем остаток по товарам в листах каталога
    try {
      await decrementStockForOrder(orderData.items.map((i: any) => ({ slug: i.slug, qty: i.qty })))
    } catch (e: any) {
      logger.warn({ orderId: id, error: e?.message }, 'ошибка списания остатков — заказ создан')
    }

    logger.info({ orderId: id, userId, totalRub, bonusUsed }, 'заказ создан')
    res.status(201).json({ id, status: 'new', createdAt: now })
  } catch (e: any) {
    logger.error({ error: e?.message, userId }, 'ошибка создания заказа')
    res.status(500).json({ error: 'server_error' })
  }
})

// PUT /api/orders/:id/cancel — отмена заказа пользователем (только свой заказ, статусы new/confirmed)
router.put('/:id/cancel', async (req, res) => {
  const orderId = String(req.params.id || '').trim()
  const userId = String(req.body?.userId || '').trim()
  if (!userId) return res.status(400).json({ error: 'userId_required' })

  try {
    const rows = await readSheet(SHEET_ID, `${SHEET_NAME}!A1:N2000`)
    if (rows.length < 2) return res.status(404).json({ error: 'order_not_found' })

    const header = rows[0].map((h: string) => h.trim().toLowerCase())
    const idx = (n: string) => header.indexOf(n)
    const idIdx = idx('id')
    const userIdIdx = idx('user_id')
    const statusIdx = idx('status')
    if (idIdx === -1 || userIdIdx === -1 || statusIdx === -1) {
      return res.status(500).json({ error: 'sheet_format_error' })
    }

    const rowIndex = rows.findIndex((r, i) => i > 0 && String(r[idIdx] ?? '').trim() === orderId)
    if (rowIndex === -1) return res.status(404).json({ error: 'order_not_found' })

    const row = rows[rowIndex]
    const orderUserId = String(row[userIdIdx] ?? '').trim()
    if (orderUserId !== userId) return res.status(403).json({ error: 'forbidden' })

    const status = String(row[statusIdx] ?? '').trim().toLowerCase()
    if (status === 'completed' || status === 'cancelled') {
      return res.status(400).json({ error: 'order_already_final' })
    }

    const fullRow = header.map((_, i) => String(row[i] ?? ''))
    fullRow[statusIdx] = 'cancelled'
    const sheetRow = rowIndex + 1
    await updateRange(SHEET_ID, `${SHEET_NAME}!A${sheetRow}:N${sheetRow}`, [fullRow])

    logger.info({ orderId, userId }, 'заказ отменён пользователем')
    res.json({ success: true, status: 'cancelled' })
  } catch (e: any) {
    logger.error({ error: e?.message, orderId, userId }, 'ошибка отмены заказа')
    res.status(500).json({ error: 'server_error' })
  }
})

export default router
