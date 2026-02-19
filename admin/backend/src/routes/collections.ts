import express from 'express'
import { randomUUID } from 'node:crypto'
import { requireAuth } from '../auth.js'
import { fetchCollectionsFromSheet, saveCollectionsToSheet, type CollectionItem } from '../collections-utils.js'
import { logger } from '../logger.js'

const router = express.Router()
router.use(requireAuth)

router.get('/', async (_req, res) => {
  try {
    const sheetId = process.env.GOOGLE_SHEET_ID
    if (!sheetId) return res.status(500).json({ error: 'GOOGLE_SHEET_ID not configured' })
    const collections = await fetchCollectionsFromSheet(sheetId)
    res.json({ collections })
  } catch (error: any) {
    logger.error({ error: error?.message }, 'failed to load collections')
    res.status(500).json({ error: 'failed_to_load_collections' })
  }
})

router.put('/', async (req, res) => {
  try {
    const sheetId = process.env.GOOGLE_SHEET_ID
    if (!sheetId) return res.status(500).json({ error: 'GOOGLE_SHEET_ID not configured' })
    const payload = Array.isArray(req.body?.collections) ? req.body.collections : []
    const collections: CollectionItem[] = payload
      .filter((item: any) => item && typeof item.title === 'string' && item.title.trim())
      .map((item: any, idx: number) => ({
        id: String(item.id || randomUUID()),
        title: String(item.title || '').trim().slice(0, 140),
        description: String(item.description || '').trim().slice(0, 2000) || undefined,
        imageUrl: String(item.imageUrl || '').trim() || undefined,
        productSlugs: Array.isArray(item.productSlugs)
          ? item.productSlugs.map((x: any) => String(x).trim()).filter((x: string) => x.length > 0)
          : [],
        active: item.active !== undefined ? Boolean(item.active) : true,
        sort: Number(item.sort ?? idx)
      }))
    await saveCollectionsToSheet(sheetId, collections)
    res.json({ success: true, collections })
  } catch (error: any) {
    logger.error({ error: error?.message }, 'failed to save collections')
    res.status(500).json({ error: 'failed_to_save_collections' })
  }
})

export default router
