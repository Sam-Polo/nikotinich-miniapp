import express from 'express'
import { appendVisit } from '../visits-utils.js'
import { logger } from '../logger.js'

const router = express.Router()

// без авторизации — вызов из мини-аппа при открытии
const MAX_USER_ID_LENGTH = 64

router.post('/', async (req, res) => {
  try {
    const sheetId = process.env.GOOGLE_SHEET_ID
    if (!sheetId) return res.status(500).json({ error: 'GOOGLE_SHEET_ID not configured' })
    const userId = typeof req.body?.userId === 'string' ? req.body.userId.trim() : ''
    if (!userId) return res.status(400).json({ error: 'userId required' })
    if (userId.length > MAX_USER_ID_LENGTH) return res.status(400).json({ error: 'userId too long' })
    await appendVisit(sheetId, userId)
    res.status(201).json({ ok: true })
  } catch (error: any) {
    logger.error({ error: error?.message }, 'failed to append visit')
    res.status(500).json({ error: 'failed_to_record_visit' })
  }
})

export default router
