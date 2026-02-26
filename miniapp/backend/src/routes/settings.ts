import { Router } from 'express'
import { SHEET_ID } from '../config.js'
import { readSheet } from '../sheets-utils.js'
import { logger } from '../logger.js'

const router = Router()

const DEFAULTS = {
  deliveryFee: 300,
  freeDeliveryFrom: 3500,
  referralPercentBefore10: 3,
  referralPercentAfter10: 5
}

// GET /api/settings — публичные настройки (доставка, реферальные %)
router.get('/', async (_req, res) => {
  try {
    const rows = await readSheet(SHEET_ID, 'settings!A1:B10')
    if (rows.length < 2) return res.json(DEFAULTS)

    const result = { ...DEFAULTS }

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i]
      if (!row || row.length < 2) continue
      const key = String(row[0] || '').trim().toLowerCase()
      const val = Number(String(row[1] || '').trim())
      if (!Number.isFinite(val) || val < 0) continue

      if (key === 'delivery_fee') result.deliveryFee = val
      else if (key === 'free_delivery_from') result.freeDeliveryFrom = val
      else if (key === 'referral_percent_before_10') result.referralPercentBefore10 = val
      else if (key === 'referral_percent_after_10') result.referralPercentAfter10 = val
    }

    res.json(result)
  } catch (e: any) {
    logger.error({ error: e?.message }, 'ошибка чтения настроек')
    res.json(DEFAULTS)
  }
})

export default router
