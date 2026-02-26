import { Router } from 'express'
import { SHEET_ID } from '../config.js'
import { readSheet } from '../sheets-utils.js'
import { logger } from '../logger.js'

const router = Router()

// GET /api/promocodes/validate?code=&totalRub=&itemSlugs= — проверка промокода
router.get('/validate', async (req, res) => {
  const code = String(req.query.code || '').trim().toUpperCase()
  const totalRub = Number(req.query.totalRub) || 0
  // slugs товаров в корзине — для расчёта скидки только на подходящие товары
  const itemSlugsRaw = String(req.query.itemSlugs || '').trim()
  const itemSlugs = itemSlugsRaw ? itemSlugsRaw.split(',').map(s => s.trim()).filter(Boolean) : []

  if (!code) return res.status(400).json({ error: 'code_required' })

  try {
    const rows = await readSheet(SHEET_ID, 'promocodes!A1:G500')
    if (rows.length < 2) return res.status(404).json({ error: 'invalid_code' })

    const header = rows[0].map((h: string) => h.trim().toLowerCase())
    const idx = (n: string) => header.indexOf(n)

    const promos = rows.slice(1)
      .filter(r => r && r.length > 0)
      .map(r => {
        const get = (n: string) => String(r[idx(n)] ?? '').trim()
        const activeVal = get('active').toLowerCase()
        return {
          code: get('code').toUpperCase(),
          type: get('type') as 'amount' | 'percent',
          value: Number(get('value')) || 0,
          expiresAt: get('expires_at') || get('expiresat') || undefined,
          active: activeVal === '1' || activeVal === 'true' || activeVal === 'yes',
          productSlugs: (get('product_slugs') || '').split(/[,\n]/).map(s => s.trim()).filter(Boolean)
        }
      })

    const promo = promos.find(p => p.code === code && p.active)
    if (!promo) return res.status(404).json({ error: 'invalid_code' })

    // проверка срока действия
    if (promo.expiresAt) {
      const expires = new Date(promo.expiresAt)
      if (!isNaN(expires.getTime()) && expires < new Date()) {
        return res.status(400).json({ error: 'expired_code' })
      }
    }

    // если промокод ограничен товарами — проверяем пересечение с корзиной
    const promoHasRestriction = promo.productSlugs.length > 0
    if (promoHasRestriction && itemSlugs.length > 0) {
      const intersection = itemSlugs.filter(s => promo.productSlugs.includes(s))
      if (intersection.length === 0) {
        return res.status(400).json({ error: 'not_applicable' })
      }
    }

    // расчёт скидки
    // для percent с ограничением по товарам фронт должен передать totalRub только по подходящим товарам
    // для amount — скидка применяется к переданному totalRub (не превышает его)
    let discount = 0
    if (promo.type === 'amount') {
      discount = Math.min(promo.value, totalRub)
    } else if (promo.type === 'percent') {
      discount = Math.round(totalRub * promo.value / 100)
    }

    res.json({
      valid: true,
      type: promo.type,
      value: promo.value,
      discount,
      productSlugs: promo.productSlugs
    })
  } catch (e: any) {
    logger.error({ error: e?.message, code }, 'ошибка валидации промокода')
    res.status(500).json({ error: 'server_error' })
  }
})

export default router
