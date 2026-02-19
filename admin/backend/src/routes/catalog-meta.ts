import express from 'express'
import { randomUUID } from 'node:crypto'
import { requireAuth } from '../auth.js'
import { fetchCatalogMeta, saveCatalogMeta, type CatalogMetaItem } from '../catalog-meta-utils.js'
import { logger } from '../logger.js'

const router = express.Router()
router.use(requireAuth)

router.get('/', async (_req, res) => {
  try {
    const sheetId = process.env.GOOGLE_SHEET_ID
    if (!sheetId) return res.status(500).json({ error: 'GOOGLE_SHEET_ID not configured' })
    const items = await fetchCatalogMeta(sheetId)
    res.json({ items })
  } catch (error: any) {
    logger.error({ error: error?.message }, 'failed to load catalog meta')
    res.status(500).json({ error: 'failed_to_load_catalog_meta' })
  }
})

router.put('/', async (req, res) => {
  try {
    const sheetId = process.env.GOOGLE_SHEET_ID
    if (!sheetId) return res.status(500).json({ error: 'GOOGLE_SHEET_ID not configured' })
    const payload = Array.isArray(req.body?.items) ? req.body.items : []
    const allowedTypes = new Set(['brand', 'line', 'model', 'flavor'])
    const normalized: CatalogMetaItem[] = payload
      .filter((item: any) => item && typeof item.title === 'string' && item.title.trim())
      .map((item: any, idx: number) => ({
        id: String(item.id || randomUUID()),
        type: allowedTypes.has(String(item.type).toLowerCase()) ? String(item.type).toLowerCase() as CatalogMetaItem['type'] : 'brand',
        parentId: item.parentId ? String(item.parentId).trim() : undefined,
        title: String(item.title || '').trim().slice(0, 120),
        slug: item.slug ? String(item.slug).trim().slice(0, 120) : undefined,
        imageUrl: item.imageUrl ? String(item.imageUrl).trim() : undefined,
        active: item.active !== undefined ? Boolean(item.active) : true,
        sort: Number(item.sort ?? idx)
      }))
    await saveCatalogMeta(sheetId, normalized)
    res.json({ success: true, items: normalized })
  } catch (error: any) {
    logger.error({ error: error?.message }, 'failed to save catalog meta')
    res.status(500).json({ error: 'failed_to_save_catalog_meta' })
  }
})

export default router
