import express from 'express'
import { requireAuth } from '../auth.js'
import {
  fetchLinesFromSheet,
  saveLinesToSheet,
  type Line
} from '../lines-utils.js'
import pino from 'pino'
import axios from 'axios'

const logger = pino()
const router = express.Router()

async function triggerBackendImport() {
  try {
    const backendUrl = process.env.BACKEND_URL || ''
    const adminKey = process.env.ADMIN_IMPORT_KEY
    if (adminKey) {
      await axios.post(`${backendUrl}/admin/import/sheets`, {}, {
        headers: { 'x-admin-key': adminKey },
        timeout: 30000
      })
      logger.info('импорт в основном бэкенде вызван')
    }
  } catch (error: any) {
    logger.warn({ error: error?.message }, 'не удалось вызвать импорт в основном бэкенде')
  }
}

router.use(requireAuth)

router.get('/', async (req, res) => {
  try {
    const sheetId = process.env.GOOGLE_SHEET_ID
    if (!sheetId) {
      return res.status(500).json({ error: 'GOOGLE_SHEET_ID not configured' })
    }
    let lines = await fetchLinesFromSheet(sheetId)
    const brandKey = typeof req.query.brand_key === 'string' ? req.query.brand_key.trim() : null
    if (brandKey) {
      lines = lines.filter((l) => l.brand_key.toLowerCase() === brandKey.toLowerCase())
    }
    return res.json({ lines })
  } catch (error: any) {
    logger.error({ error: error?.message }, 'ошибка загрузки линеек')
    return res.status(500).json({ error: error?.message || 'Ошибка загрузки линеек' })
  }
})

router.put('/', async (req, res) => {
  try {
    const sheetId = process.env.GOOGLE_SHEET_ID
    if (!sheetId) {
      return res.status(500).json({ error: 'GOOGLE_SHEET_ID not configured' })
    }

    const { lines: rawLines } = req.body
    if (!Array.isArray(rawLines)) {
      return res.status(400).json({ error: 'lines must be an array' })
    }

    const keyRegex = /^[a-z0-9_-]+$/
    const valid: Line[] = []
    for (let i = 0; i < rawLines.length; i++) {
      const c = rawLines[i]
      if (!c || typeof c.brand_key !== 'string' || !c.brand_key.trim()) continue
      if (typeof c.key !== 'string' || !c.key.trim()) continue
      if (typeof c.title !== 'string') continue
      if (typeof c.image !== 'string') c.image = ''
      const brandKey = c.brand_key.trim().toLowerCase().replace(/\s/g, '')
      const key = c.key.trim().toLowerCase().replace(/\s/g, '')
      if (!keyRegex.test(brandKey) || !keyRegex.test(key)) {
        return res.status(400).json({ error: 'invalid_key_format' })
      }

      valid.push({
        brand_key: brandKey,
        key,
        title: (c.title || c.key).trim(),
        image: (c.image || '').trim(),
        order: i
      })
    }

    await saveLinesToSheet(sheetId, valid)
    await triggerBackendImport()
    return res.json({ success: true, lines: valid })
  } catch (error: any) {
    logger.error({ error: error?.message }, 'ошибка сохранения линеек')
    return res.status(500).json({ error: error?.message || 'Ошибка сохранения линеек' })
  }
})

export default router
