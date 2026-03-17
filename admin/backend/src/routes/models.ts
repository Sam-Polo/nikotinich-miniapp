import express from 'express'
import { requireAuth } from '../auth.js'
import {
  fetchModelsFromSheet,
  saveModelsToSheet,
  type Model
} from '../models-utils.js'
import { logger } from '../logger.js'
import axios from 'axios'

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
    let models = await fetchModelsFromSheet(sheetId)

    const categoryKey = typeof req.query.category_key === 'string' ? req.query.category_key.trim() : null
    const brandKey = typeof req.query.brand_key === 'string' ? req.query.brand_key.trim() : null
    const lineKey = typeof req.query.line_key === 'string' ? req.query.line_key.trim() : null

    if (categoryKey) {
      models = models.filter((m) => m.category_key.toLowerCase() === categoryKey.toLowerCase())
    }
    if (brandKey) {
      models = models.filter((m) => m.brand_key.toLowerCase() === brandKey.toLowerCase())
    }
    if (lineKey) {
      models = models.filter((m) => m.line_key.toLowerCase() === lineKey.toLowerCase())
    }

    return res.json({ models })
  } catch (error: any) {
    logger.error({ error: error?.message }, 'ошибка загрузки моделей')
    return res.status(500).json({ error: error?.message || 'Ошибка загрузки моделей' })
  }
})

router.put('/', async (req, res) => {
  try {
    const sheetId = process.env.GOOGLE_SHEET_ID
    if (!sheetId) {
      return res.status(500).json({ error: 'GOOGLE_SHEET_ID not configured' })
    }

    const { models: rawModels } = req.body
    if (!Array.isArray(rawModels)) {
      return res.status(400).json({ error: 'models must be an array' })
    }

    const keyRegex = /^[a-z0-9_-]+$/
    const valid: Model[] = []
    for (let i = 0; i < rawModels.length; i++) {
      const m = rawModels[i]
      if (!m || typeof m.category_key !== 'string' || !m.category_key.trim()) continue
      if (typeof m.brand_key !== 'string' || !m.brand_key.trim()) continue
      if (typeof m.line_key !== 'string' || !m.line_key.trim()) continue
      if (typeof m.key !== 'string' || !m.key.trim()) continue
      if (typeof m.title !== 'string') continue
      if (typeof m.image !== 'string') m.image = ''

      const categoryKey = m.category_key.trim().toLowerCase().replace(/\s/g, '')
      const brandKey = m.brand_key.trim().toLowerCase().replace(/\s/g, '')
      const lineKey = m.line_key.trim().toLowerCase().replace(/\s/g, '')
      const key = m.key.trim().toLowerCase().replace(/\s/g, '')

      if (!keyRegex.test(categoryKey) || !keyRegex.test(brandKey) || !keyRegex.test(lineKey) || !keyRegex.test(key)) {
        return res.status(400).json({ error: 'invalid_key_format' })
      }

      valid.push({
        category_key: categoryKey,
        brand_key: brandKey,
        line_key: lineKey,
        key,
        title: (m.title || m.key).trim(),
        image: (m.image || '').trim(),
        order: i
      })
    }

    await saveModelsToSheet(sheetId, valid)
    await triggerBackendImport()
    return res.json({ success: true, models: valid })
  } catch (error: any) {
    logger.error({ error: error?.message }, 'ошибка сохранения моделей')
    return res.status(500).json({ error: error?.message || 'Ошибка сохранения моделей' })
  }
})

export default router

