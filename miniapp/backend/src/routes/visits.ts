import { Router } from 'express'
import { SHEET_ID } from '../config.js'
import { ensureSheet, appendRow } from '../sheets-utils.js'
import { logger } from '../logger.js'

const router = Router()

const SHEET_NAME = 'visits'
const HEADERS = ['date', 'user_id']

// POST /api/visits — фиксация посещения мини-аппа
router.post('/', async (req, res) => {
  const { userId } = req.body

  try {
    await ensureSheet(SHEET_ID, SHEET_NAME, HEADERS)
    await appendRow(SHEET_ID, SHEET_NAME, [new Date().toISOString(), String(userId || 'anonymous')])
    res.json({ ok: true })
  } catch (e: any) {
    // посещения некритичны — не возвращаем ошибку клиенту
    logger.warn({ error: e?.message }, 'не удалось сохранить визит')
    res.json({ ok: true })
  }
})

export default router
