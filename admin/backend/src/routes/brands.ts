import express from 'express'
import { requireAuth } from '../auth.js'
import {
  fetchBrandsFromSheet,
  saveBrandsToSheet,
  type Brand
} from '../brands-utils.js'
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
    let brands = await fetchBrandsFromSheet(sheetId)
    const categoryKey = typeof req.query.category_key === 'string' ? req.query.category_key.trim() : null
    if (categoryKey) {
      brands = brands.filter((b) => b.category_key.toLowerCase() === categoryKey.toLowerCase())
    }
    return res.json({ brands })
  } catch (error: any) {
    logger.error({ error: error?.message }, 'ошибка загрузки брендов')
    return res.status(500).json({ error: error?.message || 'Ошибка загрузки брендов' })
  }
})

router.put('/', async (req, res) => {
  try {
    const sheetId = process.env.GOOGLE_SHEET_ID
    if (!sheetId) {
      return res.status(500).json({ error: 'GOOGLE_SHEET_ID not configured' })
    }

    const { brands: rawBrands } = req.body
    if (!Array.isArray(rawBrands)) {
      return res.status(400).json({ error: 'brands must be an array' })
    }

    const keyRegex = /^[a-z0-9_-]+$/
    const valid: Brand[] = []
    for (let i = 0; i < rawBrands.length; i++) {
      const c = rawBrands[i]
      if (!c || typeof c.category_key !== 'string' || !c.category_key.trim()) continue
      if (typeof c.key !== 'string' || !c.key.trim()) continue
      if (typeof c.title !== 'string') continue
      if (typeof c.image !== 'string') c.image = ''
      const catKey = c.category_key.trim().toLowerCase().replace(/\s/g, '')
      const key = c.key.trim().toLowerCase().replace(/\s/g, '')
      if (!keyRegex.test(catKey) || !keyRegex.test(key)) {
        return res.status(400).json({ error: 'invalid_key_format' })
      }

      valid.push({
        category_key: catKey,
        key,
        title: (c.title || c.key).trim(),
        image: (c.image || '').trim(),
        order: i
      })
    }

    await saveBrandsToSheet(sheetId, valid)
    await triggerBackendImport()
    return res.json({ success: true, brands: valid })
  } catch (error: any) {
    logger.error({ error: error?.message }, 'ошибка сохранения брендов')
    return res.status(500).json({ error: error?.message || 'Ошибка сохранения брендов' })
  }
})

export default router
